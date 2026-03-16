import { eq } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { Link } from "~/components/SmartLink";
import { redirect, useActionData, useLoaderData, useLocation, useNavigation } from "react-router";
import type { Route } from "./+types/note";

import { AutosaveIndicator } from "~/components/AutosaveIndicator";
import { NoteEditor } from "~/components/editor/NoteEditor";
import { db } from "~/db/client.server";
import { deleteDraft, getDraftByAuthorAndFormat } from "~/db/queries/drafts.server";
import { createQuestion } from "~/db/queries/questions.server";
import { getSentenceById } from "~/db/queries/sentences.server";
import { records, stages } from "~/db/schema.server";
import { useAutosave } from "~/hooks/useAutosave";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth.middleware";
import { getPlainText } from "~/lib/content.server";
import { clearLocalDraft, loadDraftFromLocal } from "~/lib/draft-storage";
import { generateNoteTitle } from "~/lib/title.server";
import { nanoid } from "~/lib/utils.server";
import { createNoteSchema } from "~/lib/validation";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "짧은 기록 — DiveLog" }];
}

const WARMUP_PROMPTS = [
  "무엇이 남았는지부터 적어도 좋습니다.",
  "지금 가장 오래 붙들고 있는 문장은?",
  "오늘 가장 선명했던 장면은?",
] as const;

const RHYTHM_OPTIONS = [
  { value: "free", label: "자유 형식" },
  { value: "moment", label: "순간의 기록" },
  { value: "weekly", label: "이번 주 메모" },
  { value: "sprint", label: "스프린트 로그" },
  { value: "monthly", label: "월간 회고" },
  { value: "stage", label: "구간 회고" },
  { value: "reflection", label: "개인 회고" },
] as const;

const RESPONSE_PREFERENCE_OPTIONS = [
  { value: "open", label: "모든 응답을 환영합니다" },
  { value: "question_only", label: "질문은 환영해요" },
  { value: "closed", label: "그냥 읽어줘도 괜찮아요" },
] as const;

function getRandomWarmupPrompt() {
  return WARMUP_PROMPTS[Math.floor(Math.random() * WARMUP_PROMPTS.length)];
}

type NoteLoaderData = Awaited<ReturnType<typeof loader>>;

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const url = new URL(request.url);
  const fromSentence = url.searchParams.get("from") === "sentence";
  const sentenceId = fromSentence ? url.searchParams.get("id") : null;

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, serverDraftRecord, sourceSentence] = await Promise.all([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database
      .select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent })
      .from(stages)
      .orderBy(stages.order),
    getDraftByAuthorAndFormat(context.cloudflare.env.DB, auth.user.id, "note"),
    sentenceId ? getSentenceById(context.cloudflare.env.DB, sentenceId) : Promise.resolve(null),
  ]);
  const prefillContent = sourceSentence ? `> ${sourceSentence.content}\n\n` : "";

  const serverDraft =
    serverDraftRecord && serverDraftRecord.content.trim().length > 0
      ? {
          content: serverDraftRecord.content,
          stageId: serverDraftRecord.stageId,
          rhythm: serverDraftRecord.rhythm,
          visibility: serverDraftRecord.visibility,
          responsePreference: serverDraftRecord.responsePreference,
          savedAt: serverDraftRecord.updatedAt * 1000,
        }
      : null;

  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
    serverDraft,
    warmupPrompt: getRandomWarmupPrompt(),
    prefillContent,
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  const localDraft = loadDraftFromLocal("note");

  return {
    ...serverData,
    localDraft: localDraft && localDraft.content.length > 0 ? localDraft : null,
  };
}

clientLoader.hydrate = true as const;

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
  const contentRaw = formData.get("content");
  const content = typeof contentRaw === "string" ? contentRaw : "";

  const parsed = createNoteSchema.safeParse({
    content,
    rhythm: formData.get("rhythm") || "free",
    visibility: formData.get("visibility") || "cohort",
    responsePreference: formData.get("responsePreference") || "open",
    stageId: formData.get("stageId") || undefined,
    captureQuestion: formData.get("captureQuestion") || undefined,
    captureDirection: formData.get("captureDirection") || "inward",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const title = generateNoteTitle(parsed.data.content);
  const plainText = getPlainText(content, "note");

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
  const slug = `${baseSlug || "note"}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title,
    content,
    contentText: plainText,
    format: "note",
    type: "personal",
    rhythm: parsed.data.rhythm,
    visibility: parsed.data.visibility,
    responsePreference: parsed.data.responsePreference,
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

  await deleteDraft(context.cloudflare.env.DB, auth.user.id, "note");

  throw redirect(`/logs/${slug}`);
}

export default function WriteNotePage() {
  const { currentStage, stages: availableStages, warmupPrompt, serverDraft, localDraft, prefillContent } =
    useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const location = useLocation();
  const recoveryDraft = prefillContent ? null : serverDraft ?? localDraft;
  const [noteContent, setNoteContent] = useState(prefillContent);
  const [selectedVisibility, setSelectedVisibility] = useState<"draft" | "cohort" | "public">(
    "cohort",
  );
  const [selectedStage, setSelectedStage] = useState(currentStage?.id ?? "");
  const [selectedRhythm, setSelectedRhythm] = useState<(typeof RHYTHM_OPTIONS)[number]["value"]>("free");
  const [selectedResponsePreference, setSelectedResponsePreference] = useState<
    (typeof RESPONSE_PREFERENCE_OPTIONS)[number]["value"]
  >("open");
  const [showSettings, setShowSettings] = useState(false);
  const [showRecovery, setShowRecovery] = useState(Boolean(recoveryDraft));
  const [hasStartedTyping, setHasStartedTyping] = useState(Boolean(prefillContent));
  const [editorKey, setEditorKey] = useState(0);
  const isSubmitting = navigation.state === "submitting";
  const contentError = actionData?.errors?.content?.[0];

  useEffect(() => {
    if (!prefillContent) {
      return;
    }

    setNoteContent(prefillContent);
    setShowRecovery(false);
    setHasStartedTyping(true);
    setEditorKey((currentValue: number) => currentValue + 1);
  }, [prefillContent]);

  const getAutosaveFormData = useCallback(
    () => ({
      content: noteContent,
      stageId: selectedStage || null,
      rhythm: selectedRhythm,
      visibility: selectedVisibility,
      responsePreference: selectedResponsePreference,
    }),
    [noteContent, selectedResponsePreference, selectedRhythm, selectedStage, selectedVisibility],
  );

  const autosaveState = useAutosave({
    format: "note",
    getFormData: getAutosaveFormData,
    enabled: true,
    debounceMs: 3000,
  });

  useUnsavedWarning(noteContent.length > 0);

  useEffect(() => {
    const isRedirectingAfterPublish =
      navigation.state === "loading"
      && navigation.formMethod === "post"
      && navigation.formAction?.endsWith(location.pathname)
      && navigation.location?.pathname !== location.pathname;

    if (isRedirectingAfterPublish) {
      clearLocalDraft("note");
    }
  }, [location.pathname, navigation.formAction, navigation.formMethod, navigation.location, navigation.state]);

  useEffect(() => {
    if (showSettings || !hasStartedTyping || noteContent.length < 20) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSettings(true);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasStartedTyping, noteContent, showSettings]);

  const handleContentChange = (value: string) => {
    setNoteContent(value);

    if (showRecovery && value.length > 0) {
      setShowRecovery(false);
    }

    if (!hasStartedTyping && value.length > 0) {
      setHasStartedTyping(true);
    }
  };

  const handleRecoverDraft = () => {
    if (!recoveryDraft) {
      return;
    }

    setNoteContent(recoveryDraft.content);
    setSelectedStage(recoveryDraft.stageId ?? "");
    setSelectedRhythm(
      (recoveryDraft.rhythm as (typeof RHYTHM_OPTIONS)[number]["value"] | undefined) ?? "free",
    );
    setSelectedVisibility(
      (recoveryDraft.visibility as "draft" | "cohort" | "public" | undefined) ?? "cohort",
    );
    setSelectedResponsePreference(
      (recoveryDraft.responsePreference as
        | (typeof RESPONSE_PREFERENCE_OPTIONS)[number]["value"]
        | undefined) ?? "open",
    );
    setShowRecovery(false);
    setShowSettings(true);
    setHasStartedTyping(true);
    setEditorKey((currentValue: number) => currentValue + 1);
  };

  const handleDiscardDraft = () => {
    clearLocalDraft("note");
    setShowRecovery(false);
  };

  return (
    <div className="mx-auto py-12 px-4 md:py-20" style={{ maxWidth: 640 }}>
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/write"
          className="text-sm text-text-tertiary no-underline hover:text-text-secondary"
        >
          ← 돌아가기
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-text-primary">짧은 메모</h1>
      <p className="mb-8 text-base text-text-secondary">떠오르는 생각을 빠르게 남기세요.</p>

      <form method="post" className="flex flex-col gap-5">
        <div>
          {showRecovery && recoveryDraft ? (
            <div
              data-testid="draft-recovery-prompt"
              className="mb-4 rounded-2xl border border-[--color-mist-blue] bg-[--color-mist-blue]/30 p-4"
            >
              <p className="mb-3 text-sm text-[--color-text-secondary]">
                이전에 작성하던 메모가 있습니다.
              </p>
              <p className="mb-3 line-clamp-2 text-xs text-[--color-text-tertiary]">
                {recoveryDraft.content.slice(0, 150)}
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

          <p
            data-testid="warm-up-prompt"
            className="mb-4 text-sm italic text-[--color-text-tertiary]"
          >
            {warmupPrompt}
          </p>
          <div className="mb-3 flex justify-end">
            <AutosaveIndicator
              status={autosaveState.status}
              lastSavedAt={autosaveState.lastSavedAt}
            />
          </div>
          <NoteEditor
            key={editorKey}
            name="content"
            defaultValue={noteContent}
            onChange={handleContentChange}
            placeholder="무엇이 남았는지부터 적어도 좋습니다..."
            error={contentError}
            htmlProps={{ required: true }}
          />
        </div>

        {!showSettings ? (
          <div>
            <button
              type="button"
              data-testid="write-settings-toggle"
              onClick={() => setShowSettings(true)}
              className="text-xs text-[--color-text-tertiary] underline hover:text-[--color-text-secondary]"
            >
              설정 보기
            </button>
          </div>
        ) : null}

        <div
          data-testid="write-settings-panel"
          aria-hidden={!showSettings}
          className={`transition-all duration-300 ${
            showSettings
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-2 opacity-0 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
                {availableStages.map((stage: NoteLoaderData["stages"][number]) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                    {stage.isCurrent ? " (현재)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="rhythm"
                className="mb-1.5 block text-meta font-medium text-text-secondary"
              >
                리듬
              </label>
              <select
                id="rhythm"
                name="rhythm"
                value={selectedRhythm}
                onChange={(event) =>
                  setSelectedRhythm(event.target.value as (typeof RHYTHM_OPTIONS)[number]["value"])
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
              >
                {RHYTHM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="responsePreference"
                className="mb-1.5 block text-meta font-medium text-text-secondary"
              >
                어떤 응답을 원하시나요?
              </label>
              <select
                id="responsePreference"
                name="responsePreference"
                value={selectedResponsePreference}
                onChange={(event) =>
                  setSelectedResponsePreference(
                    event.target.value as (typeof RESPONSE_PREFERENCE_OPTIONS)[number]["value"],
                  )
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
              >
                {RESPONSE_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

        <div className="flex gap-3 pt-2">
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
