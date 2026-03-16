import { eq, sql } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { Link } from "~/components/SmartLink";
import {
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/article";

import { AutosaveIndicator } from "~/components/AutosaveIndicator";
import { ArticleEditor } from "~/components/editor/ArticleEditor";
import { db } from "~/db/client.server";
import { deleteDraft, getDraftByAuthorAndFormat } from "~/db/queries/drafts.server";
import { createQuestion } from "~/db/queries/questions.server";
import { createLink, syncRecordLinksForRecord } from "~/db/queries/recordLinks.server";
import { getRecordBySlug } from "~/db/queries/records.server";
import { learnerProfiles, records, stages, templates } from "~/db/schema.server";
import { useAutosave } from "~/hooks/useAutosave";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth.middleware";
import { getPlainText } from "~/lib/content.server";
import { syncMentionsForRecord } from "~/db/queries/mentions.server";
import { createNotification } from "~/db/queries/notifications.server";
import { clearLocalDraft, loadDraftFromLocal } from "~/lib/draft-storage";
import { extractUserMentions, extractRecordRefs } from "~/lib/extract-references.server";
import { nanoid } from "~/lib/utils.server";
import { createArticleSchema } from "~/lib/validation";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "글쓰기 — DiveLog" }];
}

const ARTICLE_WARMUP_PROMPTS = [
  "깊이 들어가고 싶은 생각이 있나요?",
  "최근 기록에서 더 이어가고 싶은 것은?",
  "아직 정리되지 않은 경험을 풀어보세요.",
] as const;

function getRandomWarmupPrompt() {
  return ARTICLE_WARMUP_PROMPTS[Math.floor(Math.random() * ARTICLE_WARMUP_PROMPTS.length)];
}

function hasMeaningfulArticleContent(value: string) {
  if (value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return hasMeaningfulNode(parsed);
  } catch {
    return value.trim().length > 0;
  }
}

function hasMeaningfulNode(node: unknown): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((childNode) => hasMeaningfulNode(childNode));
  }

  const text = "text" in node && typeof node.text === "string" ? node.text : "";
  if (text.trim().length > 0) {
    return true;
  }

  const type = "type" in node && typeof node.type === "string" ? node.type : "";
  if (
    type.length > 0 &&
    type !== "doc" &&
    type !== "paragraph" &&
    type !== "text"
  ) {
    return true;
  }

  const content = "content" in node ? node.content : undefined;
  return Array.isArray(content) && content.some((childNode) => hasMeaningfulNode(childNode));
}

function createArticleContentFromNote(noteContent: string) {
  const paragraphs = noteContent
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const content = lines.flatMap((line, index) => {
        const nodes: Array<Record<string, string>> = [];

        if (line.length > 0) {
          nodes.push({ type: "text", text: line });
        }

        if (index < lines.length - 1) {
          nodes.push({ type: "hardBreak" });
        }

        return nodes;
      });

      return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
    });

  return JSON.stringify({
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  });
}

function getValidDraftContentJson(draft: { content: string; contentJson?: string | null }) {
  if (draft.contentJson) {
    try {
      const parsed = JSON.parse(draft.contentJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return draft.contentJson;
      }
    } catch {}
  }

  return createArticleContentFromNote(draft.content);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const url = new URL(request.url);
  const expandFrom = url.searchParams.get("expandFrom");
  let expandRecord: { slug: string; title: string; content: string; plainText: string } | null = null;

  if (expandFrom) {
    const sourceRecord = await getRecordBySlug(context.cloudflare.env.DB, expandFrom);
    if (
      sourceRecord
      && sourceRecord.record.authorId === auth.user.id
      && sourceRecord.record.format === "note"
    ) {
      expandRecord = {
        slug: sourceRecord.record.slug,
        title: sourceRecord.record.title,
        content: createArticleContentFromNote(sourceRecord.record.content),
        plainText: sourceRecord.record.contentText,
      };
    }
  }

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, activeTemplates, serverDraftRecord] = await Promise.all([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database
      .select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent })
      .from(stages)
      .orderBy(stages.order),
    database.select().from(templates).where(eq(templates.active, true)),
    getDraftByAuthorAndFormat(context.cloudflare.env.DB, auth.user.id, "article"),
  ]);

  const serverDraft =
    serverDraftRecord && serverDraftRecord.content.trim().length > 0
      ? {
          title: serverDraftRecord.title ?? undefined,
          content: serverDraftRecord.content,
          contentJson: serverDraftRecord.contentJson ?? undefined,
          stageId: serverDraftRecord.stageId,
          rhythm: serverDraftRecord.rhythm,
          visibility: serverDraftRecord.visibility,
          savedAt: serverDraftRecord.updatedAt * 1000,
        }
      : null;

  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
    templates: activeTemplates,
    warmupPrompt: getRandomWarmupPrompt(),
    expandRecord,
    serverDraft,
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  const localDraft = loadDraftFromLocal("article");

  return {
    ...serverData,
    localDraft: localDraft && localDraft.content.length > 0 ? localDraft : null,
  };
}

clientLoader.hydrate = true as const;

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
  const expandFromValue = formData.get("expandFrom");
  const expandFrom = typeof expandFromValue === "string" && expandFromValue.length > 0 ? expandFromValue : null;
  const contentRaw = formData.get("content");
  const content = typeof contentRaw === "string" ? contentRaw : "";

  let contentText = "";
  try {
    JSON.parse(content);
    contentText = getPlainText(content, "article");
  } catch {
    contentText = content;
  }

  const parsed = createArticleSchema.safeParse({
    title: formData.get("title"),
    content,
    visibility: formData.get("visibility") || "cohort",
    stageId: formData.get("stageId") || undefined,
    templateId: formData.get("templateId") || undefined,
    captureQuestion: formData.get("captureQuestion") || undefined,
    captureDirection: formData.get("captureDirection") || "inward",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const title = parsed.data.title || "(무제)";
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
  const slug = `${baseSlug || "article"}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title,
    content,
    contentText,
    format: "article",
    type: "personal",
    rhythm: "free",
    visibility: parsed.data.visibility,
    responsePreference: "open",
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    createdAt: now,
    updatedAt: now,
  });

  const captureQuestion = parsed.data.captureQuestion?.trim();
  if (captureQuestion && captureQuestion.length > 0) {
    await createQuestion(context.cloudflare.env.DB, {
      recordId: id,
      content: captureQuestion,
      direction: parsed.data.captureDirection,
    });
  }

  const mentionedUsers = extractUserMentions(content);
  const recordRefs = extractRecordRefs(content);

  if (mentionedUsers.length > 0) {
    await syncMentionsForRecord(
      context.cloudflare.env.DB,
      id,
      auth.user.id,
      mentionedUsers.map((m) => m.slug),
    );

    const mentionSlugs = [...new Set(mentionedUsers.map((m) => m.slug).filter(Boolean))];
    if (mentionSlugs.length > 0) {
      const mentionedLearners = await database
        .select({ userId: learnerProfiles.userId })
        .from(learnerProfiles)
        .where(sql`${learnerProfiles.slug} IN (${sql.join(mentionSlugs.map((s) => sql`${s}`), sql`, `)})`);

      const actorName = auth.user.nickname ?? auth.user.name ?? "누군가";
      for (const row of mentionedLearners) {
        if (row.userId !== auth.user.id) {
          await createNotification(context.cloudflare.env.DB, {
            recipientId: row.userId,
            type: "mention",
            title: `${actorName}님이 기록에서 당신을 언급했습니다`,
            content: title,
            recordId: id,
          });
        }
      }
    }
  }

  if (recordRefs.length > 0) {
    await syncRecordLinksForRecord(context.cloudflare.env.DB, id, recordRefs);
  }

  await deleteDraft(context.cloudflare.env.DB, auth.user.id, "article");

  if (expandFrom) {
    const sourceRecord = await getRecordBySlug(context.cloudflare.env.DB, expandFrom);
    if (
      sourceRecord
      && sourceRecord.record.authorId === auth.user.id
      && sourceRecord.record.format === "note"
      && sourceRecord.record.id !== id
    ) {
      await createLink(context.cloudflare.env.DB, {
        sourceRecordId: id,
        targetRecordId: sourceRecord.record.id,
        linkType: "expansion",
      });
    }
  }

  throw redirect(`/logs/${slug}/details`);
}

export default function WriteArticlePage() {
  const {
    currentStage,
    stages: availableStages,
    templates: availableTemplates,
    warmupPrompt,
    expandRecord,
    serverDraft,
    localDraft,
  } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const location = useLocation();
  const recoveryDraft = expandRecord ? null : (serverDraft ?? localDraft);
  const initialContent = expandRecord?.content ?? "";
  const initialContentText = expandRecord?.plainText ?? "";
  const [title, setTitle] = useState("");
  const [articleContent, setArticleContent] = useState<{ json: string; text: string } | null>(
    initialContent
      ? {
          json: initialContent,
          text: initialContentText,
        }
      : null,
  );
  const [selectedVisibility, setSelectedVisibility] = useState<"draft" | "cohort" | "public">(
    "cohort",
  );
  const [selectedStage, setSelectedStage] = useState(currentStage?.id ?? "");
  const selectedRhythm = "free";
  const [showSettings, setShowSettings] = useState(false);
  const [showRecovery, setShowRecovery] = useState(Boolean(recoveryDraft));
  const [hasStartedTyping, setHasStartedTyping] = useState(hasMeaningfulArticleContent(initialContent));
  const [hasAutoRevealedSettings, setHasAutoRevealedSettings] = useState(false);
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  const getAutosaveFormData = useCallback(
    () => ({
      content: articleContent?.text || "",
      contentJson: articleContent?.json,
      title: title || undefined,
      stageId: selectedStage || null,
      rhythm: selectedRhythm,
      visibility: selectedVisibility,
    }),
    [articleContent, selectedStage, selectedVisibility, title],
  );

  const autosaveState = useAutosave({
    format: "article",
    getFormData: getAutosaveFormData,
    enabled: true,
    debounceMs: 3000,
  });

  useUnsavedWarning(title.length > 0 || (articleContent?.text.trim().length ?? 0) > 0);

  useEffect(() => {
    const isRedirectingAfterPublish =
      navigation.state === "loading"
      && navigation.formMethod === "post"
      && navigation.formAction?.endsWith(location.pathname)
      && navigation.location?.pathname !== location.pathname;

    if (isRedirectingAfterPublish) {
      clearLocalDraft("article");
    }
  }, [location.pathname, navigation.formAction, navigation.formMethod, navigation.location, navigation.state]);

  useEffect(() => {
    setTitle("");
    setArticleContent(
      initialContent
        ? {
            json: initialContent,
            text: initialContentText,
          }
        : null,
    );
    setSelectedStage(currentStage?.id ?? "");
    setSelectedVisibility("cohort");
    setShowRecovery(Boolean(recoveryDraft));
    setShowSettings(false);
    setHasStartedTyping(hasMeaningfulArticleContent(initialContent));
    setHasAutoRevealedSettings(false);
  }, [currentStage?.id, initialContent, initialContentText, recoveryDraft]);

  useEffect(() => {
    if (showSettings || hasAutoRevealedSettings || !hasStartedTyping) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSettings(true);
      setHasAutoRevealedSettings(true);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasAutoRevealedSettings, hasStartedTyping, showSettings]);

  const handleArticleChange = (json: object, text: string) => {
    setArticleContent({ json: JSON.stringify(json), text });

    if (showRecovery && text.length > 0) {
      setShowRecovery(false);
    }

    if (!hasStartedTyping && text.trim().length > 0) {
      setHasStartedTyping(true);
    }
  };

  const handleRecoverDraft = () => {
    if (!recoveryDraft) {
      return;
    }

    setTitle(recoveryDraft.title ?? "");
    setArticleContent({
      json: getValidDraftContentJson(recoveryDraft),
      text: recoveryDraft.content,
    });
    setSelectedStage(recoveryDraft.stageId ?? currentStage?.id ?? "");
    setSelectedVisibility(
      (recoveryDraft.visibility as "draft" | "cohort" | "public" | undefined) ?? "cohort",
    );
    setShowRecovery(false);
    setShowSettings(true);
    setHasStartedTyping(true);
    setHasAutoRevealedSettings(true);
  };

  const handleDiscardDraft = () => {
    clearLocalDraft("article");
    setShowRecovery(false);
  };

  return (
    <div className="mx-auto px-4 py-12 md:py-20" style={{ maxWidth: 960 }}>
      <div className="mb-8 flex items-center gap-3">
        <Link to="/write" className="text-sm text-text-tertiary no-underline hover:text-text-secondary">
          ← 돌아가기
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-text-primary">글쓰기</h1>
      <p className="mb-8 text-base text-text-secondary">여유롭게 탐구의 기록을 남기세요.</p>

      <form method="post" className="flex flex-col gap-6">
        {expandRecord ? <input type="hidden" name="expandFrom" value={expandRecord.slug} /> : null}

        <div>
          {showRecovery && recoveryDraft ? (
            <div
              data-testid="draft-recovery-prompt"
              className="mb-4 rounded-2xl border border-[--color-mist-blue] bg-[--color-mist-blue]/30 p-4"
            >
              <p className="mb-3 text-sm text-[--color-text-secondary]">
                이전에 작성하던 글 초안이 있습니다.
              </p>
              <p className="mb-2 line-clamp-2 text-xs text-[--color-text-tertiary]">
                {(recoveryDraft.title?.trim().length ? `${recoveryDraft.title} - ` : "")
                  + recoveryDraft.content.slice(0, 150)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="draft-recover-button"
                  onClick={handleRecoverDraft}
                  className="min-h-11 text-sm text-[--color-ocean-blue] hover:underline"
                >
                  이어서 작성하기
                </button>
                <button
                  type="button"
                  data-testid="draft-discard-button"
                  onClick={handleDiscardDraft}
                  className="min-h-11 text-sm text-[--color-text-tertiary] hover:underline"
                >
                  새로 시작
                </button>
              </div>
            </div>
          ) : null}

          {expandRecord ? (
            <p className="mb-3 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{expandRecord.title}</span> 메모를 바탕으로 이어 쓰고 있습니다.
            </p>
          ) : null}
          <p
            data-testid="article-warm-up-prompt"
            className="mb-4 text-sm italic text-[--color-text-tertiary]"
          >
            {warmupPrompt}
          </p>
          <div className="mb-3 flex justify-end" data-testid="autosave-indicator">
            <AutosaveIndicator status={autosaveState.status} lastSavedAt={autosaveState.lastSavedAt} />
          </div>
          <p className="mb-2 block text-meta font-medium text-text-secondary">
            내용 <span className="text-error">*</span>
          </p>
          <ArticleEditor
            name="content"
            content={articleContent?.json ?? ""}
            onChange={handleArticleChange}
            placeholder="여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
          />
          {contentError ? <p className="mt-1 text-meta text-error">{contentError}</p> : null}
        </div>

        <div>
          <button
            type="button"
            data-testid="article-settings-toggle"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((currentValue) => !currentValue)}
            className="min-h-11 text-sm text-text-tertiary underline underline-offset-4 hover:text-text-secondary"
          >
            {showSettings ? "제목과 설정 숨기기" : "제목과 설정 보기"}
          </button>
        </div>

        <div
          data-testid="article-settings-panel"
          aria-hidden={!showSettings}
          className={`transition-all duration-300 ${
            showSettings
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-2 opacity-0 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          <div className="space-y-5 rounded-[24px] border border-border bg-surface-secondary/60 p-5 md:p-6">
            <div>
              <label htmlFor="title" className="mb-2 block text-meta font-medium text-text-secondary">
                제목
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="제목 (나중에 붙여도 됩니다)"
                value={title}
                onChange={(e) => {
                  const nextTitle = e.target.value;
                  setTitle(nextTitle);

                  if (showRecovery && nextTitle.trim().length > 0) {
                    setShowRecovery(false);
                  }
                }}
                className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base focus:ring-2 focus:ring-ocean-blue focus:ring-offset-1 focus:outline-none"
              />
              {titleError ? <p className="mt-1 text-meta text-error">{titleError}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label
                  htmlFor="visibility"
                  className="mb-1.5 block text-meta font-medium text-text-secondary"
                >
                  공개 범위
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  value={selectedVisibility}
                  onChange={(event) =>
                    setSelectedVisibility(event.target.value as "draft" | "cohort" | "public")
                  }
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
                >
                  <option value="cohort">코호트 공개</option>
                  <option value="public">전체 공개</option>
                  <option value="draft">임시저장</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="stageId"
                  className="mb-1.5 block text-meta font-medium text-text-secondary"
                >
                  구간
                </label>
                <select
                  id="stageId"
                  name="stageId"
                  value={selectedStage}
                  onChange={(event) => setSelectedStage(event.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
                >
                  <option value="">구간 미지정</option>
                  {availableStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                      {stage.isCurrent ? " (현재)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {availableTemplates.length > 0 ? (
                <div>
                  <label
                    htmlFor="templateId"
                    className="mb-1.5 block text-meta font-medium text-text-secondary"
                  >
                    템플릿 (선택)
                  </label>
                  <select
                    id="templateId"
                    name="templateId"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
                  >
                    <option value="">템플릿 없이 시작</option>
                    {availableTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          data-testid="question-capture-slot"
          className="mt-6 border-t border-[--color-border] pt-6"
        >
          <label
            htmlFor="captureQuestion"
            className="mb-2 block text-sm font-medium text-[--color-text-secondary]"
          >
            이 기록에서 남은 질문이 있나요?{" "}
            <span className="font-normal text-[--color-text-tertiary]">(선택사항)</span>
          </label>
          <textarea
            id="captureQuestion"
            name="captureQuestion"
            placeholder="작성하며 생긴 질문이 있다면 남겨두세요."
            rows={2}
            className="w-full resize-none rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-3 text-sm text-[--color-text-primary] placeholder:text-[--color-text-tertiary]"
          />
          <div className="mt-2 flex gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[--color-text-tertiary]">
              <input
                type="radio"
                name="captureDirection"
                value="inward"
                defaultChecked
                className="accent-[--color-ocean-blue]"
              />
              스스로에게
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[--color-text-tertiary]">
              <input
                type="radio"
                name="captureDirection"
                value="outward"
                className="accent-[--color-ocean-blue]"
              />
              함께 생각해볼
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[--color-text-tertiary]">
              <input
                type="radio"
                name="captureDirection"
                value="next_stage"
                className="accent-[--color-ocean-blue]"
              />
              다음 구간으로
            </label>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-ocean-blue px-6 py-3 text-base font-medium text-white transition-colors hover:bg-deep-ocean focus-visible:ring-2 focus-visible:ring-ocean-blue disabled:opacity-60"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
          <Link
            to="/write"
            className="rounded-md border border-border px-6 py-3 text-base font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
