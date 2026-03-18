import { eq, sql } from "drizzle-orm";
import { useState, Suspense, lazy } from "react";
import PersonSearch from "~/components/PersonSearch";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/article";

const ArticleEditor = lazy(() =>
  import("~/components/editor/editors/ArticleEditor").then(m => ({ default: m.ArticleEditor }))
);
import { NavigationBlockerDialog } from "~/components/feedback/NavigationBlockerDialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RhythmDateInput } from "~/components/record/RhythmDateInput";
import { TagSelector } from "~/components/TagSelector";
import { db } from "~/db/client.server";
import { syncAllMentionsForRecord } from "~/db/queries/dialogue/mentions.server";
import { createNotification } from "~/db/queries/social/notifications.server";
import { markAsRead } from "~/db/queries/records/recordReads.server";
import { syncRecordLinksForRecord } from "~/db/queries/records/recordLinks.server";
import { syncParticipantsForRecord } from "~/db/queries/records/participants.server";
import { getAllTags } from "~/db/queries/records/tags.server";
import { learnerProfiles, records, recordTags, stages } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware";
import { createArticleSchema } from "~/lib/auth/validation";
import { getPlainText } from "~/lib/content/content.server";
import {
  extractRecordRefs,
  extractUserMentions,
} from "~/lib/content/extract-references.server";
import { cn } from "~/lib/utils/cn";
import { getNextRecordSlug } from "~/db/queries/records/records.server";
import { nanoid } from "~/lib/utils/utils.server";

const NO_STAGE_VALUE = "__none__";

const RHYTHM_OPTIONS = [
  { value: "free", label: "자유" },
  { value: "moment", label: "순간" },
  { value: "sprint", label: "스프린트" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "stage", label: "구간" },
] as const;

function parseDateToUnix(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 1000);
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "글쓰기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, learnerResult] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent, startDate: stages.startDate, endDate: stages.endDate }).from(stages).orderBy(stages.order),
    database.select().from(learnerProfiles).where(eq(learnerProfiles.userId, auth.user.id)).limit(1),
  ]);
  const learner = learnerResult[0] ?? null;
  const allTags = await getAllTags(context.cloudflare.env.DB);

  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
    tags: allTags,
    currentUserId: auth.user?.id ?? null,
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

  let contentText = "";
  try {
    JSON.parse(content);
    contentText = getPlainText(content, "article");
  } catch {
    contentText = content;
  }

  const recordedAtRaw = formData.get("recordedAt");
  const recordedEndAtRaw = formData.get("recordedEndAt");

  const parsed = createArticleSchema.safeParse({
    title: formData.get("title"),
    content,
    rhythm: formData.get("rhythm") || "free",
    visibility: formData.get("visibility") || "public",
    stageId: formData.get("stageId") || undefined,
    recordedAt: typeof recordedAtRaw === "string" && recordedAtRaw ? recordedAtRaw : undefined,
    recordedEndAt: typeof recordedEndAtRaw === "string" && recordedEndAtRaw ? recordedEndAtRaw : undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const recordedAt = parseDateToUnix(parsed.data.recordedAt);
  const recordedEndAt = parseDateToUnix(parsed.data.recordedEndAt);

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const slug = await getNextRecordSlug(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title: parsed.data.title,
    content,
    contentText,
    format: "article",
    type: "personal",
    rhythm: parsed.data.rhythm,
    visibility: parsed.data.visibility,
    responsePreference,
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    recordedAt,
    recordedEndAt,
    createdAt: now,
    updatedAt: now,
  });

  const participantsJson = formData.get("participantsJson")?.toString() ?? "[]";
  const mentionUserIdsJson = formData.get("mentionUserIds")?.toString() ?? "[]";
  const participants = JSON.parse(participantsJson) as { userId: string; role: string }[];
  const mentionUserIds = JSON.parse(mentionUserIdsJson) as string[];
  const mentionedUsers = extractUserMentions(content);
  const recordRefs = extractRecordRefs(content);
  const allMentionUserIds = Array.from(
    new Set([...mentionUserIds, ...mentionedUsers.map((mention) => mention.userId)])
  );
  const actorName = auth.user.nickname ?? auth.user.name ?? "누군가";

  await syncParticipantsForRecord(context.cloudflare.env.DB, id, participants, auth.user.id);
  await syncAllMentionsForRecord(context.cloudflare.env.DB, id, mentionUserIds, content, auth.user.id);

  const notified = new Set<string>();

  for (const participant of participants) {
    if (participant.userId !== auth.user.id) {
      await createNotification(context.cloudflare.env.DB, {
        recipientId: participant.userId,
        type: "participant_added",
        title: `${actorName}님이 기록에 함께하는 사람으로 남겼습니다`,
        content: parsed.data.title,
        recordId: id,
      });
      notified.add(participant.userId);
    }
  }

  for (const userId of allMentionUserIds) {
    if (userId !== auth.user.id && !notified.has(userId)) {
      await createNotification(context.cloudflare.env.DB, {
        recipientId: userId,
        type: "mention",
        title: `${actorName}님이 기록에서 당신을 언급했습니다`,
        content: parsed.data.title,
        recordId: id,
      });
    }
  }

  if (recordRefs.length > 0) {
    await syncRecordLinksForRecord(context.cloudflare.env.DB, id, recordRefs);
  }

  // Handle tags
  const tagIds = formData.getAll("tagIds") as string[];
  if (tagIds.length > 0) {
    for (const tagId of tagIds) {
      await database.insert(recordTags).values({
        recordId: id,
        tagId,
        createdAt: now,
      });
    }
  }

  if (parsed.data.visibility !== "draft") {
    try {
      await markAsRead(context.cloudflare.env.DB, auth.user.id, id);
    } catch {
      // silent fail — 읽음 처리 실패가 작성을 막지 않음
    }
  }

  throw redirect(`/logs/${slug}/details`);
}

export default function WriteArticlePage({ loaderData }: Route.ComponentProps) {
  const { currentStage, stages: availableStages, tags, learnerDefaults, currentUserId } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [rhythm, setRhythm] = useState("free");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  const blocker = useUnsavedWarning(title.length > 0 || articleContent.length > 0);

  function handleRhythmChange(newRhythm: string) {
    setRhythm(newRhythm);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-6 py-16 max-w-[720px]">
        <Form method="post" className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Link to="/write" className="text-sm text-text-tertiary no-underline hover:text-text-secondary w-fit">
              ← 돌아가기
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-text-primary m-0">글쓰기</h1>
              <div className="flex items-center gap-3">
                <Link
                  to="/write"
                  className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
                >
                  취소
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-auto rounded-md px-4 py-2 text-sm font-medium"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </div>
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
              <Select name="visibility" defaultValue={learnerDefaults.defaultVisibility}>
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

            {rhythm !== "stage" && (
              <input type="hidden" name="stageId" value="" />
            )}

            <input
              type="hidden"
              name="responsePreference"
              defaultValue={learnerDefaults.defaultResponsePreference}
            />
          </div>

          <div>
            <Label className="mb-2 block text-meta font-medium text-text-secondary">
              기록 리듬
            </Label>
            <input type="hidden" name="rhythm" value={rhythm} />
            <div className="flex flex-wrap gap-2">
              {RHYTHM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={rhythm === option.value}
                  onClick={() => handleRhythmChange(option.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all duration-[var(--duration-fast)]",
                    "hover:bg-surface-secondary active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
                    rhythm === option.value
                      ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
                      : "bg-surface text-text-secondary border-border",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <RhythmDateInput rhythm={rhythm} stages={availableStages} />

          <div>
            <Label htmlFor="title" className="mb-2 block text-meta font-medium text-text-secondary">
              제목 <span className="text-error">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(titleError)}
              className="w-full bg-surface focus-visible:ring-offset-1"
            />
            {titleError ? <p className="mt-1 text-meta text-error">{titleError}</p> : null}
          </div>

           <div>
             <p className="mb-2 block text-meta font-medium text-text-secondary">
               내용 <span className="text-error">*</span>
             </p>
             <Suspense fallback={<div className="animate-pulse bg-surface-secondary rounded-lg h-64" />}>
               <ArticleEditor
                 name="content"
                 content={articleContent}
                 onChange={(_json, text) => setArticleContent(text)}
                 placeholder="여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
               />
             </Suspense>
             {contentError ? <p className="mt-1 text-meta text-error">{contentError}</p> : null}
           </div>

           <details className="mt-6">
             <summary className="cursor-pointer text-sm font-medium text-text-secondary">부가 정보</summary>
            <div className="mt-4">
              <TagSelector
                tags={tags}
                selectedTagIds={Array.from(selectedTags)}
                onChange={(newIds) => setSelectedTags(new Set(newIds))}
              />

              <div className="mt-4 space-y-4">
                <PersonSearch
                  label="함께하는 사람"
                  name="participantsJson"
                  selectedPeople={[]}
                  excludeUserId={currentUserId ?? undefined}
                  roleOptions={[
                    { value: "coauthor", label: "공동작성" },
                    { value: "companion", label: "함께활동" },
                    { value: "mentor", label: "멘토" },
                  ]}
                />
                <PersonSearch
                  label="언급된 사람"
                  name="mentionUserIds"
                  selectedPeople={[]}
                  excludeUserId={currentUserId ?? undefined}
                />
              </div>
            </div>
          </details>
         </Form>
         <NavigationBlockerDialog blocker={blocker} />
       </div>
     </div>
   );
 }
