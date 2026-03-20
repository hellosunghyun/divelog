import { eq } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, isRouteErrorResponse, useRouteError } from "react-router";
import type { Route } from "./+types/note";

import { NoteEditor } from "~/components/editor/editors/NoteEditor";
import { AutosaveIndicator } from "~/components/feedback/AutosaveIndicator";
import { NavigationBlockerDialog } from "~/components/feedback/NavigationBlockerDialog";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { DraftRecoveryPrompt } from "~/components/content/DraftRecoveryPrompt";
import { SearchIndexingOptOutField } from "~/components/record/SearchIndexingOptOutField";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RECORD_TYPES, RECORD_TYPE_LABELS, DEFAULT_RECORD_TYPE } from "~/lib/constants/record-types";
import { db } from "~/db/client.server";
import { learnerProfiles, records } from "~/db/schema.server";
import { useAutosave } from "~/hooks/useAutosave";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware.server";
import { createNoteSchema } from "~/lib/auth/validation";
import { getPlainText } from "~/lib/content/content.server";
import { clearLocalDraft, loadDraftFromLocal, type DraftData } from "~/lib/infra/draft-storage";
import { generateNoteTitle } from "~/lib/utils/title.server";
import { getNextRecordSlug } from "~/db/queries/records/records.server";
import { nanoid } from "~/lib/utils/utils.server";
import { captureRouteBoundaryError } from "~/lib/infra/sentry-error";

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("divelog:invalidate-record-cache", "1");
  }
  clearLocalDraft("note");
  return await serverAction();
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "짧은 기록 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const learnerResult = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);

  const learner = learnerResult[0] ?? null;

  return {
    learnerDefaults: {
      defaultVisibility: learner?.defaultVisibility ?? "public",
      defaultResponsePreference: learner?.defaultResponsePreference ?? "open",
    },
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
  const contentRaw = formData.get("content");
  const content = typeof contentRaw === "string" ? contentRaw : "";
  const responsePreferenceRaw = formData.get("responsePreference");
  const responsePreference = typeof responsePreferenceRaw === "string" ? responsePreferenceRaw : "open";
  const searchIndexingOptOut = formData.get("searchIndexingOptOut") === "on";

  const parsed = createNoteSchema.safeParse({
    content,
    visibility: formData.get("visibility") || "public",
    searchIndexingOptOut,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const title = generateNoteTitle(parsed.data.content);
  const plainText = getPlainText(content, "note");
  const type = (formData.get("type") as string) || DEFAULT_RECORD_TYPE;

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const slug = await getNextRecordSlug(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title,
    content,
    contentText: plainText,
    format: "note",
    type,
    rhythm: "free",
    visibility: parsed.data.visibility,
    responsePreference,
    searchIndexingOptOut: parsed.data.searchIndexingOptOut,
    challengeId: null,
    collaborationUnitId: null,
    originalUrl: null,
    createdAt: now,
    updatedAt: now,
  });

  throw redirect(`/logs/${slug}`);
}

export function ErrorBoundary() {
  const error = useRouteError();
  captureRouteBoundaryError(error, { route: "public/write/note" });
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto py-16 px-6 max-w-[720px] text-center">
      <h1 className="text-xl font-semibold text-text-primary mb-3">
        {is404 ? "페이지를 찾을 수 없습니다" : "페이지를 불러오지 못했습니다"}
      </h1>
      <p className="text-text-secondary mb-6">
        {is404
          ? "요청하신 페이지가 존재하지 않습니다."
          : "일시적인 네트워크 문제일 수 있습니다. 다시 시도해 주세요."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-ocean-blue px-6 py-2 text-sm font-semibold text-white hover:bg-ocean-blue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          다시 시도
        </button>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-medium text-text-secondary no-underline hover:bg-surface-secondary transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

export default function WriteNotePage({ loaderData }: Route.ComponentProps) {
  const { learnerDefaults } = loaderData;
  const actionData = useActionData<typeof action>();
  const [noteContent, setNoteContent] = useState("");
  const [type, setType] = useState(DEFAULT_RECORD_TYPE);
  const [visibility, setVisibility] = useState(learnerDefaults.defaultVisibility);
  const [searchIndexingOptOut, setSearchIndexingOptOut] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [savedDraft, setSavedDraft] = useState<DraftData | null>(null);
  const contentError = actionData?.errors?.content?.[0];

  const blocker = useUnsavedWarning(noteContent.length > 0);

  useEffect(() => {
    const draft = loadDraftFromLocal("note");
    if (draft) {
      setSavedDraft(draft);
    }
  }, []);

  const handleRecover = () => {
    if (savedDraft) {
      setNoteContent(savedDraft.content);
      if (savedDraft.visibility) setVisibility(savedDraft.visibility);
      setSearchIndexingOptOut(savedDraft.searchIndexingOptOut ?? false);
      setEditorKey((k) => k + 1);
    }
    setSavedDraft(null);
  };

  const handleDiscard = () => {
    setSavedDraft(null);
  };

  const getFormData = useCallback(
    () => ({
      content: noteContent,
      visibility,
      responsePreference: learnerDefaults.defaultResponsePreference,
      searchIndexingOptOut,
    }),
    [noteContent, visibility, learnerDefaults.defaultResponsePreference, searchIndexingOptOut],
  );

  const { status: autosaveStatus, lastSavedAt } = useAutosave({
    format: "note",
    getFormData,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto py-16 px-6 max-w-[720px]">
        <Form method="post" className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <Link to="/write" className="text-sm text-text-tertiary no-underline hover:text-text-secondary w-fit">
              ← 돌아가기
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-text-primary m-0">짧은 메모</h1>
              <div className="flex items-center gap-3">
                <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} />
                <Link
                  to="/write"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
                >
                  취소
                </Link>
                <SubmitButton loadingText="저장 중...">
                  저장
                </SubmitButton>
              </div>
            </div>
          </div>

          {savedDraft ? (
            <DraftRecoveryPrompt
              draft={savedDraft}
              format="note"
              onRecover={handleRecover}
              onDiscard={handleDiscard}
            />
          ) : null}

          <div>
            <Label className="mb-2 block text-sm font-medium text-text-secondary">유형</Label>
            <input type="hidden" name="type" value={type} />
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all duration-[var(--duration-fast)]",
                    "hover:bg-surface-secondary active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
                    type === t
                      ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
                      : "bg-surface text-text-secondary border-border",
                  )}
                >
                  {RECORD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <Label
                htmlFor="visibility"
                className="mb-1.5 block text-meta font-medium text-text-secondary"
              >
                공개 범위
              </Label>
              <Select name="visibility" value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility" className="w-auto min-w-36 bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">임시저장</SelectItem>
                  <SelectItem value="private">나만 보기</SelectItem>
                  <SelectItem value="cohort">코호트 공개</SelectItem>
                  <SelectItem value="public">전체 공개</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <input
              type="hidden"
              name="responsePreference"
              defaultValue={learnerDefaults.defaultResponsePreference}
            />
          </div>

          <SearchIndexingOptOutField
            checked={searchIndexingOptOut}
            onChange={setSearchIndexingOptOut}
          />

          <div>
            <NoteEditor
              key={editorKey}
              name="content"
              defaultValue={noteContent}
              onChange={setNoteContent}
              placeholder="무엇이 남았는지부터 적어도 좋습니다..."
              error={contentError}
              htmlProps={{ required: true }}
            />
          </div>
        </Form>
        <NavigationBlockerDialog blocker={blocker} />
      </div>
    </div>
  );
}
