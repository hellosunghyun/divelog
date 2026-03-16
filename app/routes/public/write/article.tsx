import { eq, sql } from "drizzle-orm";
import { useEffect, useState } from "react";
import { Link } from "~/components/SmartLink";
import { redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/article";

import { ArticleEditor } from "~/components/editor/ArticleEditor";
import { db } from "~/db/client.server";
import { createQuestion } from "~/db/queries/questions.server";
import { learnerProfiles, records, stages, templates } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth.middleware";
import { getPlainText } from "~/lib/content.server";
import { syncMentionsForRecord } from "~/db/queries/mentions.server";
import { syncRecordLinksForRecord } from "~/db/queries/recordLinks.server";
import { createNotification } from "~/db/queries/notifications.server";
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

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, activeTemplates] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent }).from(stages).orderBy(stages.order),
    database.select().from(templates).where(eq(templates.active, true)),
  ]);
  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
    templates: activeTemplates,
    warmupPrompt: getRandomWarmupPrompt(),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
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

  throw redirect(`/logs/${slug}/details`);
}

export default function WriteArticlePage({ loaderData }: Route.ComponentProps) {
  const {
    currentStage,
    stages: availableStages,
    templates: availableTemplates,
    warmupPrompt,
  } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [hasAutoRevealedSettings, setHasAutoRevealedSettings] = useState(false);
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  useUnsavedWarning(title.length > 0 || articleContent.length > 0);

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

  const handleArticleChange = (value: string) => {
    setArticleContent(value);

    if (!hasStartedTyping && hasMeaningfulArticleContent(value)) {
      setHasStartedTyping(true);
    }
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
        <div>
          <p
            data-testid="article-warm-up-prompt"
            className="mb-4 text-sm italic text-[--color-text-tertiary]"
          >
            {warmupPrompt}
          </p>
          <p className="mb-2 block text-meta font-medium text-text-secondary">
            내용 <span className="text-error">*</span>
          </p>
          <ArticleEditor
            name="content"
            content={articleContent}
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
                onChange={(e) => setTitle(e.target.value)}
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
                  defaultValue="cohort"
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
                  defaultValue={currentStage?.id ?? ""}
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
