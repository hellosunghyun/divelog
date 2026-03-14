import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { data, Link, redirect, useActionData, useNavigation } from "react-router";

import EmptyState from "../components/EmptyState";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import QuestionCard from "../components/QuestionCard";
import ResponseCard from "../components/ResponseCard";
import { db } from "../db/client.server";
import { learnerProfiles, questions, records, responses, sentences } from "../db/schema.server";
import { requireVerified } from "../lib/auth.middleware";
import { nanoid } from "../lib/utils.server";
import { createResponseSchema, saveSentenceSchema } from "../lib/validation";

import type { Route } from "./+types/_public.logs.$recordSlug";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { recordSlug } = params;
  const database = db(context.cloudflare.env.DB);

  const recordResult = await database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        userId: learnerProfiles.userId,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, recordSlug))
    .limit(1);

  const recordData = recordResult[0];

  if (!recordData || recordData.record.visibility === "draft") {
    throw data("기록을 찾을 수 없습니다.", { status: 404 });
  }

  const linkedToCurrent = eq(records.linkedRecordId, recordData.record.id);
  const currentLinkedToOther = recordData.record.linkedRecordId
    ? eq(records.id, recordData.record.linkedRecordId)
    : sql`0 = 1`;

  const [recordQuestions, recordResponses, recordSentences, linkedRecords] = await database.batch([
    database.select().from(questions).where(eq(questions.recordId, recordData.record.id)).orderBy(desc(questions.createdAt)),
    database
      .select({
        response: responses,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
      })
      .from(responses)
      .leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
      .where(and(eq(responses.recordId, recordData.record.id), eq(responses.moderationStatus, "clean")))
      .orderBy(desc(responses.createdAt)),
    database
      .select({
        sentence: sentences,
        savedBy: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
        },
      })
      .from(sentences)
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .where(eq(sentences.recordId, recordData.record.id))
      .orderBy(desc(sentences.createdAt)),
    database
      .select({
        record: {
          id: records.id,
          slug: records.slug,
          title: records.title,
          content: records.content,
          format: records.format,
          type: records.type,
          createdAt: records.createdAt,
        },
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(
        and(
          ne(records.id, recordData.record.id),
          sql`${records.visibility} != 'draft'`,
          or(linkedToCurrent, currentLinkedToOther),
        ),
      )
      .orderBy(desc(records.createdAt))
      .limit(6),
  ]);

  return {
    record: recordData.record,
    author: recordData.author,
    questions: recordQuestions,
    responses: recordResponses,
    sentences: recordSentences,
    linkedRecords,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const database = db(context.cloudflare.env.DB);

  if (intent === "create_response") {
    const parsed = createResponseSchema.safeParse({
      content: formData.get("content"),
      type: formData.get("type"),
      recordId: formData.get("recordId"),
      questionId: formData.get("questionId") || undefined,
      visibility: "cohort",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
    }

    const id = nanoid();
    const now = Math.floor(Date.now() / 1000);

    await database.insert(responses).values({
      id,
      recordId: parsed.data.recordId,
      questionId: parsed.data.questionId ?? null,
      authorId: auth.user.id,
      type: parsed.data.type,
      content: parsed.data.content,
      visibility: "cohort",
      moderationStatus: "clean",
      createdAt: now,
      updatedAt: now,
    });

    return { success: "응답이 등록되었습니다." };
  }

  if (intent === "save_sentence") {
    const parsed = saveSentenceSchema.safeParse({
      content: formData.get("content"),
      reason: formData.get("reason") || undefined,
      recordId: formData.get("recordId"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "문장을 확인해주세요." };
    }

    const id = nanoid();

    await database.insert(sentences).values({
      id,
      recordId: parsed.data.recordId,
      savedById: auth.user.id,
      content: parsed.data.content,
      reason: parsed.data.reason ?? null,
      createdAt: Math.floor(Date.now() / 1000),
    });

    return { success: "문장이 저장되었습니다." };
  }

  return { error: "알 수 없는 요청입니다." };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "기록 — divelog" }];
  }

  return [
    { title: `${loaderData.record.title} — divelog` },
    {
      name: "description",
      content: loaderData.record.content.slice(0, 150),
    },
  ];
}

const RESPONSE_TYPE_OPTIONS = [
  { value: "resonance", label: "공명 - 이 기록이 와닿았습니다" },
  { value: "question", label: "질문 - 궁금한 것을 남깁니다" },
  { value: "connection", label: "연결 - 내 경험과 연결됩니다" },
  { value: "suggestion", label: "제안 - 한 가지 제안합니다" },
];

export default function RecordDetailPage({ loaderData }: Route.ComponentProps) {
  const { record, author, questions: recordQuestions, responses: recordResponses, sentences: recordSentences, linkedRecords } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submittingIntent = navigation.formData?.get("intent");
  const isSubmittingResponse = navigation.state === "submitting" && submittingIntent === "create_response";
  const isSubmittingSentence = navigation.state === "submitting" && submittingIntent === "save_sentence";

  return (
    <div className="max-w-reading mx-auto py-12 px-4 md:py-20">
      <header className="mb-8">
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
            {record.format === "note" ? "노트" : "글"}
          </span>
          <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
            {record.type === "personal" ? "개인" : record.type === "challenge" ? "챌린지" : "협업"}
          </span>
        </div>

        <h1 className="text-3xl font-semibold text-text-primary leading-tight mb-4">
          {record.title}
        </h1>

        {author?.slug ? (
          <Link to={`/learners/${author.slug}`} className="text-sm text-text-secondary no-underline">
            {author.displayName ?? "작성자"}
          </Link>
        ) : (
          <p className="text-sm text-text-secondary">{author?.displayName ?? "작성자"}</p>
        )}
      </header>

      <section className="mb-12 text-base leading-relaxed text-text-primary whitespace-pre-wrap">
        {record.content}
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          남겨진 질문
        </h2>
        {recordQuestions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recordQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        ) : (
          <EmptyState variant="questions" />
        )}
      </section>

      {record.responsePreference !== "closed" && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            응답 남기기
          </h2>

          {actionData && "error" in actionData ? (
            <p className="text-error mb-4 text-sm">{actionData.error}</p>
          ) : null}

          {actionData && "success" in actionData ? (
            <p className="text-success mb-4 text-sm">{actionData.success}</p>
          ) : null}

          <div className="grid gap-4">
            <form method="post" className="flex flex-col gap-4 bg-surface rounded-lg border border-border p-6">
              <input type="hidden" name="intent" value="create_response" />
              <input type="hidden" name="recordId" value={record.id} />

              <div>
                <label htmlFor="response-type" className="text-meta text-text-secondary block mb-2">
                  응답 유형
                </label>
                <select id="response-type" name="type" required className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue">
                  {RESPONSE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {recordQuestions.length > 0 ? (
                <div>
                  <label htmlFor="question-id" className="text-meta text-text-secondary block mb-2">
                    연결할 질문 (선택)
                  </label>
                  <select id="question-id" name="questionId" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue">
                    <option value="">질문을 선택하지 않음</option>
                    {recordQuestions.map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.content}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label htmlFor="response-content" className="text-meta text-text-secondary block mb-2">
                  내용
                </label>
                <textarea id="response-content" name="content" required rows={5} placeholder="이 기록에 응답해보세요." className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ocean-blue" />
              </div>

              <button type="submit" disabled={isSubmittingResponse} className="rounded-md bg-ocean-blue text-white px-5 py-2.5 text-base font-medium hover:bg-deep-ocean transition-colors focus-visible:ring-2 focus-visible:ring-ocean-blue self-start disabled:opacity-60">
                {isSubmittingResponse ? "등록 중..." : "응답 등록"}
              </button>
            </form>

            <form method="post" className="flex flex-col gap-4 bg-surface rounded-lg border border-border p-6">
              <input type="hidden" name="intent" value="save_sentence" />
              <input type="hidden" name="recordId" value={record.id} />

              <h3 className="text-lg font-medium text-text-primary">문장 저장하기</h3>

              <div>
                <label htmlFor="sentence-content" className="text-meta text-text-secondary block mb-2">
                  남겨두고 싶은 문장
                </label>
                <textarea id="sentence-content" name="content" required rows={3} placeholder="기록에서 기억하고 싶은 문장을 남겨보세요." className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ocean-blue" />
              </div>

              <div>
                <label htmlFor="sentence-reason" className="text-meta text-text-secondary block mb-2">
                  이유 (선택)
                </label>
                <textarea id="sentence-reason" name="reason" rows={2} placeholder="왜 이 문장을 남기고 싶은지 적어보세요." className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base resize-y focus:outline-none focus:ring-2 focus:ring-ocean-blue" />
              </div>

              <button type="submit" disabled={isSubmittingSentence} className="rounded-md bg-deep-ocean text-white px-5 py-2.5 text-base font-medium hover:bg-deep-ocean/90 transition-colors focus-visible:ring-2 focus-visible:ring-ocean-blue self-start disabled:opacity-60">
                {isSubmittingSentence ? "저장 중..." : "문장 저장"}
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          응답 {recordResponses.length}개
        </h2>
        {recordResponses.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recordResponses.map(({ response, author: responseAuthor }) => (
              <ResponseCard key={response.id} response={response} author={responseAuthor ?? undefined} isSelfAnswer={response.type === "self_answer"} />
            ))}
          </div>
        ) : (
          <EmptyState variant="responses" />
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          연결된 기록
        </h2>
        {linkedRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedRecords.map(({ record: linkedRecord, author: linkedAuthor }) => (
              <Link key={linkedRecord.id} to={`/logs/${linkedRecord.slug}`} className="no-underline bg-surface rounded-lg border border-border p-5 flex flex-col gap-2">
                <p className="text-sm text-text-secondary">{linkedRecord.format === "note" ? "노트" : "글"}</p>
                <p className="text-base text-text-primary font-medium leading-normal">
                  {linkedRecord.title}
                </p>
                {linkedAuthor?.displayName ? (
                  <p className="text-meta text-text-tertiary">{linkedAuthor.displayName}</p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState variant="generic" message="아직 연결된 기록이 없습니다." />
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          남겨두고 싶은 문장들
        </h2>
        {recordSentences.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recordSentences.map(({ sentence, savedBy }) => (
              <HighlightedSentenceCard key={sentence.id} sentence={sentence} savedBy={savedBy ?? undefined} />
            ))}
          </div>
        ) : (
          <EmptyState variant="generic" message="아직 저장된 문장이 없습니다." />
        )}
      </section>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">기록을 찾을 수 없습니다.</p>
      <Link to="/logs" className="mt-4 inline-block px-5 py-2.5 rounded-md bg-ocean-blue text-white no-underline">
        기록 목록으로
      </Link>
    </div>
  );
}
