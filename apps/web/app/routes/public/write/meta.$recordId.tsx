import { eq } from "drizzle-orm";
import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/meta.$recordId";

import { Link } from "~/components/content/SmartLink";
import PersonSearch from "~/components/PersonSearch";
import RecordSearch from "~/components/RecordSearch";
import { TagSelector } from "~/components/TagSelector";
import { NavigationBlockerDialog } from "~/components/feedback/NavigationBlockerDialog";
import { SearchIndexingOptOutField } from "~/components/record/SearchIndexingOptOutField";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { syncAllMentionsForRecord } from "~/db/queries/dialogue/mentions.server";
import { syncParticipantsForRecord, getParticipantsByRecord } from "~/db/queries/records/participants.server";
import { markAsRead } from "~/db/queries/records/recordReads.server";
import { syncTypedRecordLinks, getTypedRecordLinks } from "~/db/queries/records/recordLinks.server";
import { getRecordById, updateRecordOriginalMeta } from "~/db/queries/records/records.server";
import { getRecordReferences, syncRecordReferences } from "~/db/queries/records/references.server";
import { findOrCreateTag, getAllTags, getTagsByRecord, syncTagsForRecord } from "~/db/queries/records/tags.server";
import { questions, records } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware.server";
import { parseReferencesFromFormData } from "~/lib/auth/validation";
import { deliverMentionNotifications } from "~/lib/notifications/mention-delivery.server";
import { notify } from "~/lib/notifications/notify.server";
import * as Sentry from "@sentry/react-router/cloudflare";

type ReferenceField = { id: string; url: string; title: string };
type LoaderTag = { id: string };
type LoaderQuestion = { id: string; content: string; direction: string; isOpen: boolean } | null;
type LoaderReference = { url: string; title: string | null };
type LoaderParticipant = { userId: string; displayName: string | null; profilePhotoUrl: string | null };
type LoaderMention = { userId: string; displayName: string | null; profilePhotoUrl: string | null };
type LoaderRecordLink = {
  targetRecordId: string;
  targetTitle: string | null;
  authorDisplayName: string | null;
};

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록 마무리 — DiveLog" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const recordId = params.recordId;
  if (!recordId) {
    throw new Response("Not Found", { status: 404 });
  }

  const record = await getRecordById(context.cloudflare.env.DB, recordId);
  if (!record) {
    throw new Response("Not Found", { status: 404 });
  }

  if (record.authorId !== auth.user.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  const database = db(context.cloudflare.env.DB);

  const [allTags, currentTags, participants, mentionedLinks, references, existingQuestions] =
    await Promise.all([
      getAllTags(context.cloudflare.env.DB),
      getTagsByRecord(context.cloudflare.env.DB, record.id),
      getParticipantsByRecord(context.cloudflare.env.DB, record.id).catch((error) => {
        Sentry.captureException(error, {
          tags: {
            type: "write_meta_fallback",
            operation: "participants",
            route: "public/write/meta.$recordId.loader",
          },
          extra: {
            recordId: record.id,
          },
        });

        return [];
      }),
      getTypedRecordLinks(context.cloudflare.env.DB, record.id, "mentioned"),
      getRecordReferences(context.cloudflare.env.DB, record.id).catch((error) => {
        Sentry.captureException(error, {
          tags: {
            type: "write_meta_fallback",
            operation: "references",
            route: "public/write/meta.$recordId.loader",
          },
          extra: {
            recordId: record.id,
          },
        });

        return [];
      }),
      database.select().from(questions).where(eq(questions.recordId, record.id)).limit(1),
    ]);

  return {
      record: {
        id: record.id,
        slug: record.slug,
        format: record.format,
        title: record.title,
        searchIndexingOptOut: record.searchIndexingOptOut ?? false,
        originalUrl: record.originalUrl ?? "",
        originalTitle: record.originalTitle ?? "",
      originalDescription: record.originalDescription ?? "",
    },
    tags: allTags,
    currentTags,
    participants,
    mentionedLinks,
    references,
    existingQuestion: (existingQuestions[0] ?? null) as LoaderQuestion,
    responsePreference: record.responsePreference ?? "open",
    currentUserId: auth.user.id,
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);
  const recordId = params.recordId;
  if (!recordId) {
    throw new Response("Not Found", { status: 404 });
  }

  const record = await getRecordById(context.cloudflare.env.DB, recordId);
  if (!record || record.authorId !== auth.user.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const actorName = auth.user.nickname ?? auth.user.name ?? "누군가";

  const questionContent = formData.get("question")?.toString()?.trim() ?? "";
  const questionDirection = formData.get("questionDirection")?.toString() ?? "outward";
  const searchIndexingOptOut = formData.get("searchIndexingOptOut") === "on";

  const database = db(context.cloudflare.env.DB);
  if (questionContent.length > 0) {
    const existing = await database
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.recordId, record.id))
      .limit(1);
    const now = Math.floor(Date.now() / 1000);

    if (existing.length > 0) {
      await database
        .update(questions)
        .set({ content: questionContent, direction: questionDirection })
        .where(eq(questions.id, existing[0].id));
    } else {
      const { nanoid } = await import("~/lib/utils/utils.server");
      await database.insert(questions).values({
        id: nanoid(),
        recordId: record.id,
        content: questionContent,
        direction: questionDirection,
        isOpen: true,
        createdAt: now,
      });
    }
  }

  const responsePreference = formData.get("responsePreference")?.toString();
  if (responsePreference || searchIndexingOptOut !== record.searchIndexingOptOut) {
    await database
      .update(records)
      .set({
        ...(responsePreference ? { responsePreference } : {}),
        searchIndexingOptOut,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(records.id, record.id));
  }

  const newTagNames = formData.getAll("newTagName") as string[];
  const createdTagIds: string[] = [];
  for (const tagName of newTagNames) {
    const trimmed = tagName.trim();
    if (!trimmed) {
      continue;
    }

    const tag = await findOrCreateTag(context.cloudflare.env.DB, trimmed, auth.user.id);
    createdTagIds.push(tag.id);
  }

  const selectedTagIds = formData.getAll("tagIds") as string[];
  const allTagIds = [...new Set([...selectedTagIds, ...createdTagIds])];
  await syncTagsForRecord(context.cloudflare.env.DB, record.id, allTagIds);

  const participantsJson = formData.get("participantsJson")?.toString() ?? "[]";
  const participants = JSON.parse(participantsJson) as { userId: string; role: string }[];

  await syncParticipantsForRecord(context.cloudflare.env.DB, record.id, participants, auth.user.id);
  await syncAllMentionsForRecord(context.cloudflare.env.DB, record.id, [], record.content ?? "", auth.user.id);
  context.cloudflare.ctx.waitUntil(
    deliverMentionNotifications({
      d1: context.cloudflare.env.DB,
      queue: context.cloudflare.env.QUEUE,
      actorId: auth.user.id,
      actorName,
      content: record.content,
      recordId: record.id,
      visibility: record.visibility,
    }),
  );

  const mentionedRecordIds = JSON.parse(formData.get("mentionedRecordIds")?.toString() ?? "[]") as string[];
  await syncTypedRecordLinks(context.cloudflare.env.DB, record.id, mentionedRecordIds, "mentioned");

  if (record.format === "article") {
    const references = parseReferencesFromFormData(formData);
    await syncRecordReferences(context.cloudflare.env.DB, record.id, references);

    const originalUrl = formData.get("originalUrl")?.toString() || null;
    const originalTitle = formData.get("originalTitle")?.toString() || null;
    const originalDescription = formData.get("originalDescription")?.toString() || null;
    await updateRecordOriginalMeta(context.cloudflare.env.DB, record.id, {
      originalUrl,
      originalTitle,
      originalDescription,
    });
  }

  // Deliver participant notifications asynchronously via waitUntil
  context.cloudflare.ctx.waitUntil(
    (async () => {
      for (const participant of participants) {
        if (participant.userId === auth.user.id) {
          continue;
        }

        await notify({
          d1: context.cloudflare.env.DB,
          actorId: auth.user.id,
          recipientId: participant.userId,
          type: "participant_added",
          title: `${actorName}님이 기록에 함께하는 사람으로 남겼습니다`,
          content: record.title,
          recordId: record.id,
          visibility: record.visibility,
        });
      }
    })(),
  );

  if (record.visibility !== "draft") {
    try {
      await markAsRead(context.cloudflare.env.DB, auth.user.id, record.id);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          type: "write_meta_background",
          operation: "mark_as_read",
          route: "public/write/meta.$recordId.action",
        },
        extra: {
          recordId: record.id,
          actorId: auth.user.id,
        },
      });
    }
  }

  const detailPath = `/logs/${record.slug}`;
  throw redirect(detailPath);
}

function createReferenceField(): ReferenceField {
  return { id: crypto.randomUUID(), url: "", title: "" };
}

export default function WriteMetaPage({ loaderData }: Route.ComponentProps) {
  const {
    record,
    tags,
    currentTags,
    participants,
    mentionedLinks,
    references: initialReferences,
    existingQuestion,
    responsePreference,
    currentUserId,
  } = loaderData;

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(currentTags.map((tag: LoaderTag) => tag.id)),
  );
  const [question, setQuestion] = useState(existingQuestion?.content ?? "");
  const [originalUrl, setOriginalUrl] = useState(record.originalUrl);
  const [originalTitle, setOriginalTitle] = useState(record.originalTitle);
  const [originalDescription, setOriginalDescription] = useState(record.originalDescription);
  const [searchIndexingOptOut, setSearchIndexingOptOut] = useState(record.searchIndexingOptOut);
  const [questionDirection, setQuestionDirection] = useState(existingQuestion?.direction ?? "outward");
  const [refList, setRefList] = useState<ReferenceField[]>(
    initialReferences.length > 0
      ? initialReferences.map((reference: LoaderReference) => ({
          id: crypto.randomUUID(),
          url: reference.url,
          title: reference.title ?? "",
        }))
      : [],
  );

  const initialParticipants = participants.map((participant: LoaderParticipant) => ({
    userId: participant.userId,
    displayName: participant.displayName ?? "",
    profilePhotoUrl: participant.profilePhotoUrl ?? null,
  }));

  const initialMentionedRecords = mentionedLinks.map((link: LoaderRecordLink) => ({
    recordId: link.targetRecordId,
    title: link.targetTitle ?? "",
    authorDisplayName: link.authorDisplayName ?? null,
  }));

  const blocker = useUnsavedWarning(false);
  const skipUrl = `/logs/${record.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <Form method="post" className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Link
              to={`/logs/${record.slug}`}
              className="w-fit text-sm text-text-tertiary no-underline hover:text-text-secondary"
            >
              ← 기록으로 돌아가기
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="m-0 text-lg font-semibold text-text-primary">기록 마무리</h1>
                <p className="mt-1 text-sm text-text-tertiary">나중에 수정 페이지에서도 변경할 수 있습니다</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={skipUrl}
                  className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
                >
                  건너뛰기
                </Link>
                <Button type="submit" disabled={isSubmitting} className="h-auto rounded-lg px-5 py-2 text-sm font-medium">
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">질문과 응답</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <SearchIndexingOptOutField
              checked={searchIndexingOptOut}
              onChange={setSearchIndexingOptOut}
            />

            <div className="rounded-xl border border-border bg-surface-secondary p-5">
              <Label htmlFor="question" className="mb-1 block text-sm font-medium text-text-primary">
                남겨둘 질문
              </Label>
              <p className="mb-3 text-xs text-text-tertiary">기록의 끝을 질문으로 열어둘 수 있습니다</p>
              <Textarea
                id="question"
                name="question"
                rows={3}
                placeholder="이 기록에 남기고 싶은 질문이 있다면 남겨보세요"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-[88px] rounded-lg border-border bg-surface"
              />

              {question.trim().length > 0 ? (
                <fieldset className="mt-4 border-0 p-0">
                  <legend className="mb-2 text-xs font-medium text-text-secondary">질문 방향</legend>
                  <RadioGroup
                    name="questionDirection"
                    value={questionDirection}
                    onValueChange={setQuestionDirection}
                    className="flex flex-wrap gap-4"
                    aria-label="질문 방향"
                  >
                    {[
                      { value: "outward", label: "동료에게" },
                      { value: "inward", label: "스스로에게" },
                      { value: "next_stage", label: "다음 구간으로" },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} id={`question-direction-${option.value}`} />
                        <Label htmlFor={`question-direction-${option.value}`} className="cursor-pointer text-sm text-text-primary">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="responsePreference" className="text-sm font-medium text-text-primary">
                응답 받기
              </Label>
              <Select name="responsePreference" defaultValue={responsePreference}>
                <SelectTrigger id="responsePreference" className="w-full rounded-lg bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">모든 응답을 환영합니다</SelectItem>
                  <SelectItem value="question_only">질문은 환영해요</SelectItem>
                  <SelectItem value="closed">그냥 읽어줘도 괜찮아요</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">태그</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <TagSelector
              tags={tags}
              selectedTagIds={Array.from(selectedTags)}
              onChange={(ids: string[]) => setSelectedTags(new Set(ids))}
              allowCreate={true}
              maxTags={10}
            />
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">사람과 게시글</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <PersonSearch
              label="함께한 사람"
              name="participantsJson"
              selectedPeople={initialParticipants}
              excludeUserId={currentUserId}
              roleOptions={[
                { value: "coauthor", label: "공동작성" },
                { value: "companion", label: "함께활동" },
                { value: "mentor", label: "멘토" },
              ]}
            />
            <RecordSearch
              label="관련 게시글"
              name="mentionedRecordIds"
              selectedRecords={initialMentionedRecords}
              excludeRecordId={record.id}
            />
          </section>

          {record.format === "article" ? (
            <>
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">외부 게시</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div>
                  <p className="mb-1 text-meta font-medium text-text-secondary">
                    외부 링크 <span className="text-xs font-normal text-text-tertiary">(선택)</span>
                  </p>
                  <p className="mb-3 text-xs text-text-tertiary">블로그, 노션 등 다른 곳에도 올렸다면 링크를 남겨두세요. 기록 상세에서 바로 이동할 수 있습니다.</p>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-secondary p-4">
                  <div>
                    <label htmlFor="originalUrl" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      URL
                    </label>
                    <input
                      type="text"
                      inputMode="url"
                      id="originalUrl"
                      name="originalUrl"
                      value={originalUrl}
                      onChange={(event) => setOriginalUrl(event.target.value)}
                      placeholder="https://example.com/my-post"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="originalTitle" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      원문 제목 <span className="font-normal text-text-tertiary">(선택)</span>
                    </label>
                    <input
                      type="text"
                      id="originalTitle"
                      name="originalTitle"
                      value={originalTitle}
                      onChange={(event) => setOriginalTitle(event.target.value)}
                      placeholder="SwiftUI에서 MVVM 패턴 적용기"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="originalDescription" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      설명 <span className="font-normal text-text-tertiary">(선택)</span>
                    </label>
                    <input
                      type="text"
                      id="originalDescription"
                      name="originalDescription"
                      value={originalDescription}
                      onChange={(event) => setOriginalDescription(event.target.value)}
                      placeholder="개인 블로그에 먼저 올린 글의 DiveLog 버전입니다"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                    />
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-meta font-medium text-text-secondary">
                    참조 및 출처 <span className="text-xs font-normal text-text-tertiary">(선택)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRefList((previous) => [...previous, createReferenceField()])}
                    className="min-h-11 px-1 text-sm text-ocean-blue transition-colors hover:text-deep-ocean"
                  >
                    + 참조 추가
                  </button>
                </div>
                {refList.map((reference, index) => (
                  <div key={reference.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        inputMode="url"
                        name={`references[${index}][url]`}
                        value={reference.url}
                        onChange={(event) => {
                          const next = [...refList];
                          next[index] = { ...next[index], url: event.target.value };
                          setRefList(next);
                        }}
                        placeholder="https://example.com"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                      />
                      <input
                        type="text"
                        name={`references[${index}][title]`}
                        value={reference.title}
                        onChange={(event) => {
                          const next = [...refList];
                          next[index] = { ...next[index], title: event.target.value };
                          setRefList(next);
                        }}
                        placeholder="제목 (선택)"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setRefList((previous) => previous.filter((_, currentIndex) => currentIndex !== index))}
                      className="mt-2.5 min-h-11 min-w-11 p-1 text-text-tertiary transition-colors hover:text-text-primary"
                      aria-label="참조 삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>
            </>
          ) : null}
        </Form>
        <NavigationBlockerDialog blocker={blocker} />
      </div>
    </div>
  );
}
