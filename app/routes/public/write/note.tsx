import { eq } from "drizzle-orm";
import { useState } from "react";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/note";

import { NoteEditor } from "~/components/editor/editors/NoteEditor";
import PersonSearch from "~/components/PersonSearch";
import { NavigationBlockerDialog } from "~/components/feedback/NavigationBlockerDialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TagSelector } from "~/components/TagSelector";
import { db } from "~/db/client.server";
import { syncAllMentionsForRecord } from "~/db/queries/dialogue/mentions.server";
import { syncParticipantsForRecord } from "~/db/queries/records/participants.server";
import { syncRecordReferences } from "~/db/queries/records/references.server";
import { getAllTags } from "~/db/queries/records/tags.server";
import { learnerProfiles, records, recordTags, stages } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware";
import { createNoteSchema, parseReferencesFromFormData } from "~/lib/auth/validation";
import { getPlainText } from "~/lib/content/content.server";
import { generateNoteTitle } from "~/lib/utils/title.server";
import { getNextRecordSlug } from "~/db/queries/records/records.server";
import { nanoid } from "~/lib/utils/utils.server";

const NO_STAGE_VALUE = "__none__";

type ReferenceField = { id: string; url: string; title: string };

function createReferenceField(): ReferenceField {
  return { id: crypto.randomUUID(), url: "", title: "" };
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "짧은 기록 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, learnerResult] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database
      .select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent })
      .from(stages)
      .orderBy(stages.order),
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
  const originalUrlRaw = formData.get("originalUrl");
  const originalUrl = typeof originalUrlRaw === "string" ? originalUrlRaw : "";
  const references = parseReferencesFromFormData(formData);

  const parsed = createNoteSchema.safeParse({
    content,
    visibility: formData.get("visibility") || "public",
    stageId: formData.get("stageId") || undefined,
    originalUrl,
    references,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const title = generateNoteTitle(parsed.data.content);
  const plainText = getPlainText(content, "note");

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
    type: "personal",
    rhythm: "free",
    visibility: parsed.data.visibility,
    responsePreference,
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    originalUrl: parsed.data.originalUrl || null,
    createdAt: now,
    updatedAt: now,
  });

  const participantsJson = formData.get("participantsJson")?.toString() ?? "[]";
  const mentionUserIdsJson = formData.get("mentionUserIds")?.toString() ?? "[]";

  const participants = JSON.parse(participantsJson) as { userId: string; role: string }[];
  const mentionUserIds = JSON.parse(mentionUserIdsJson) as string[];

  if (participants.length > 0) {
    await syncParticipantsForRecord(context.cloudflare.env.DB, id, participants, auth.user.id);
  }

  await syncAllMentionsForRecord(context.cloudflare.env.DB, id, mentionUserIds, content, auth.user.id);

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

  // Handle references
  await syncRecordReferences(context.cloudflare.env.DB, id, parsed.data.references ?? []);

  throw redirect(`/logs/${slug}`);
}

export default function WriteNotePage({ loaderData }: Route.ComponentProps) {
  const { currentStage, stages: availableStages, tags, learnerDefaults, currentUserId } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [noteContent, setNoteContent] = useState("");
  const [stageValue, setStageValue] = useState(currentStage?.id ?? NO_STAGE_VALUE);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [references, setReferences] = useState<ReferenceField[]>([]);
  const isSubmitting = navigation.state === "submitting";
  const contentError = actionData?.errors?.content?.[0];

  const blocker = useUnsavedWarning(noteContent.length > 0);

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

            <div>
              <Label
                htmlFor="stageId"
                className="mb-1.5 block text-meta font-medium text-text-secondary"
              >
                구간
              </Label>
              <input type="hidden" name="stageId" value={stageValue === NO_STAGE_VALUE ? "" : stageValue} />
              <Select value={stageValue} onValueChange={setStageValue}>
                <SelectTrigger id="stageId" className="w-auto min-w-40 bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAGE_VALUE}>구간 미지정</SelectItem>
                  {availableStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                      {stage.isCurrent ? " (현재)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <input
              type="hidden"
              name="responsePreference"
              defaultValue={learnerDefaults.defaultResponsePreference}
            />
          </div>

          <div>
            <NoteEditor
              name="content"
              defaultValue={noteContent}
              onChange={setNoteContent}
              placeholder="무엇이 남았는지부터 적어도 좋습니다..."
              error={contentError}
              htmlProps={{ required: true }}
            />
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

              <div className="mt-4 space-y-2">
                <Label htmlFor="originalUrl" className="mb-1 block text-meta font-medium text-text-secondary">
                  원문 링크 <span className="text-xs text-text-tertiary">(선택)</span>
                </Label>
                <p className="text-xs text-text-tertiary mb-2">
                  블로그, 노션, 미디엄 등 원본 글이 있는 경우 링크를 남겨두면 기록 상세 페이지에서 바로 이동할 수 있습니다.
                </p>
                <input
                  type="text"
                  inputMode="url"
                  id="originalUrl"
                  name="originalUrl"
                  defaultValue=""
                  placeholder="https://blog.example.com/my-post"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-meta font-medium text-text-secondary">
                    참조 및 출처 <span className="text-xs text-text-tertiary">(선택)</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setReferences((prev) => [...prev, createReferenceField()])}
                    className="min-h-11 px-1 text-sm text-ocean-blue transition-colors hover:text-deep-ocean"
                  >
                    + 참조 추가
                  </button>
                </div>
                {references.map((reference, index) => (
                  <div key={reference.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        inputMode="url"
                        name={`references[${index}][url]`}
                        value={reference.url}
                        onChange={(e) => {
                          const next = [...references];
                          next[index] = { ...next[index], url: e.target.value };
                          setReferences(next);
                        }}
                        placeholder="https://example.com"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                      />
                      <input
                        type="text"
                        name={`references[${index}][title]`}
                        value={reference.title}
                        onChange={(e) => {
                          const next = [...references];
                          next[index] = { ...next[index], title: e.target.value };
                          setReferences(next);
                        }}
                        placeholder="제목 (선택)"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setReferences((prev) => prev.filter((item) => item.id !== reference.id))}
                      className="mt-2.5 min-h-11 min-w-11 p-1 text-text-tertiary transition-colors hover:text-text-primary"
                      aria-label="참조 삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </Form>
        <NavigationBlockerDialog blocker={blocker} />
      </div>
    </div>
  );
}
