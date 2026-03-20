import { eq } from "drizzle-orm";
import { Link } from "~/components/content/SmartLink";
import { data, redirect, useActionData } from "react-router";
import { useState } from "react";

import type { Route } from "./+types/$recordSlug.details";

import { Button } from "~/components/ui/button";
import { SearchIndexingOptOutField } from "~/components/record/SearchIndexingOptOutField";
import { Label } from "~/components/ui/label";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { TagSelector } from "~/components/TagSelector";
import { db } from "~/db/client.server";
import { getRecordBySlug } from "~/db/queries/records/records.server";
import { getRecordReferences } from "~/db/queries/records/references.server";
import { syncRecordReferences } from "~/db/queries/records/references.server";
import { getAllTags, getTagsByRecord } from "~/db/queries/records/tags.server";
import { questions, records, recordTags } from "~/db/schema.server";
import { requireVerified } from "~/lib/auth/auth.middleware.server";
import { updateRecordMetadataSchema, parseReferencesFromFormData } from "~/lib/auth/validation";
import { nanoid } from "~/lib/utils/utils.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "세부 설정 — DiveLog" }];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const recordSlug = params.recordSlug;

  if (!recordSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const recordData = await getRecordBySlug(context.cloudflare.env.DB, recordSlug, auth.user.id);

  if (!recordData) {
    throw new Response("Not Found", { status: 404 });
  }

  if (recordData.record.authorId !== auth.user.id) {
    throw new Response("Not Found", { status: 404 });
  }

  const database = db(context.cloudflare.env.DB);

  const [existingQuestions, allTags, currentTags, existingReferences] = await Promise.all([
    database.select().from(questions).where(eq(questions.recordId, recordData.record.id)).limit(1),
    getAllTags(context.cloudflare.env.DB),
    getTagsByRecord(context.cloudflare.env.DB, recordData.record.id),
    getRecordReferences(context.cloudflare.env.DB, recordData.record.id),
  ]);

  return {
    record: recordData.record,
    existingQuestion: existingQuestions[0] ?? null,
    tags: allTags,
    currentTags,
    existingReferences,
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);
  const recordSlug = params.recordSlug;

  if (!recordSlug) {
    throw data({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const recordData = await getRecordBySlug(context.cloudflare.env.DB, recordSlug, auth.user.id);

  if (!recordData || recordData.record.authorId !== auth.user.id) {
    return data({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const formData = await request.formData();

  const tagIds = formData.getAll("tagIds") as string[];
  const references = parseReferencesFromFormData(formData);
  const originalUrlRaw = formData.get("originalUrl");
  const originalUrl = typeof originalUrlRaw === "string" ? originalUrlRaw : "";
  const searchIndexingOptOut = formData.get("searchIndexingOptOut") === "on";

  const parsed = updateRecordMetadataSchema.safeParse({
    question: formData.get("question") || undefined,
    questionDirection: formData.get("questionDirection") || undefined,
    responsePreference: formData.get("responsePreference") || undefined,
    searchIndexingOptOut,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    originalUrl,
    references,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);
  const recordId = recordData.record.id;

  if (parsed.data.question && parsed.data.question.trim().length > 0) {
    const existingQuestion = await database
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.recordId, recordId))
      .limit(1);

    if (existingQuestion.length > 0) {
      await database
        .update(questions)
        .set({
          content: parsed.data.question.trim(),
          direction: parsed.data.questionDirection ?? "outward",
        })
        .where(eq(questions.id, existingQuestion[0].id));
    } else {
      await database.insert(questions).values({
        id: nanoid(),
        recordId,
        content: parsed.data.question.trim(),
        direction: parsed.data.questionDirection ?? "outward",
        isOpen: true,
        createdAt: now,
      });
    }
  }

  const recordUpdateFields: Record<string, unknown> = { updatedAt: now };
  if (parsed.data.responsePreference) {
    recordUpdateFields.responsePreference = parsed.data.responsePreference;
  }
  if (parsed.data.searchIndexingOptOut !== undefined) {
    recordUpdateFields.searchIndexingOptOut = parsed.data.searchIndexingOptOut;
  }
  if (parsed.data.originalUrl !== undefined) {
    recordUpdateFields.originalUrl = parsed.data.originalUrl || null;
  }
  if (Object.keys(recordUpdateFields).length > 1) {
    await database
      .update(records)
      .set(recordUpdateFields)
      .where(eq(records.id, recordId));
  }

  await syncRecordReferences(
    context.cloudflare.env.DB,
    recordId,
    parsed.data.references ?? [],
  );

  await database.delete(recordTags).where(eq(recordTags.recordId, recordId));
  if (parsed.data.tagIds && parsed.data.tagIds.length > 0) {
    for (const tagId of parsed.data.tagIds) {
      await database.insert(recordTags).values({ recordId, tagId, createdAt: now });
    }
  }

  throw redirect(`/logs/${recordSlug}`);
}

type ReferenceField = { id: string; url: string; title: string };

function createReferenceField(): ReferenceField {
  return { id: crypto.randomUUID(), url: "", title: "" };
}

export default function RecordDetailsPage({ loaderData }: Route.ComponentProps) {
  const { record, existingQuestion, tags, currentTags, existingReferences } = loaderData;
  const actionData = useActionData<typeof action>();
  const [question, setQuestion] = useState(existingQuestion?.content ?? "");
  const [searchIndexingOptOut, setSearchIndexingOptOut] = useState(record.searchIndexingOptOut ?? false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(currentTags.map((tag: { id: string }) => tag.id)),
  );
  const [references, setReferences] = useState<ReferenceField[]>(
    existingReferences.length > 0
      ? existingReferences.map((ref) => ({
          id: crypto.randomUUID(),
          url: ref.url,
          title: ref.title ?? "",
        }))
      : [],
  );

  const errors = actionData && "errors" in actionData ? actionData.errors : undefined;
  const formError = actionData && "error" in actionData ? actionData.error : undefined;

  return (
    <div className="mx-auto py-12 px-4 md:py-20" style={{ maxWidth: 640 }}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">세부 설정</h1>
        <Link
          to={`/logs/${record.slug}`}
          className="text-sm text-text-tertiary hover:text-text-secondary no-underline"
        >
          건너뛰기 →
        </Link>
      </div>

      <p className="mb-8 text-base text-text-secondary">
        선택적으로 설정할 수 있습니다. 나중에 수정 페이지에서도 변경할 수 있습니다.
      </p>

      {formError ? <p className="mb-6 text-meta text-error">{formError}</p> : null}

      <form method="post" className="flex flex-col gap-6">
        <div className="rounded-xl border border-border bg-surface-secondary p-5">
          <Label htmlFor="question" className="mb-1 block text-base font-medium text-text-primary">
            남겨둘 질문 (선택)
          </Label>
          <p className="text-meta text-text-tertiary mb-3">
            기록의 끝을 결론이 아니라 질문으로 열어둘 수 있습니다.
          </p>
          <Textarea
            id="question"
            name="question"
            rows={2}
            placeholder="이 기록에 남기고 싶은 질문이 있다면..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-invalid={Boolean(errors?.question)}
            className="min-h-[60px] bg-surface"
          />
          {errors?.question ? <p className="mt-2 text-meta text-error">{errors.question[0]}</p> : null}

          {question.trim().length > 0 && (
            <fieldset className="mt-3 border-0 m-0 p-0">
              <legend className="block text-meta font-medium text-text-secondary mb-2">질문 방향</legend>
              <RadioGroup
                name="questionDirection"
                defaultValue={existingQuestion?.direction ?? "outward"}
                className="flex flex-wrap gap-4"
                aria-label="질문 방향"
              >
                {[
                  { value: "outward", label: "동료에게" },
                  { value: "inward", label: "스스로에게" },
                  { value: "next_stage", label: "다음 구간으로" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`question-direction-${opt.value}`} />
                    <Label
                      htmlFor={`question-direction-${opt.value}`}
                      className="cursor-pointer text-base text-text-primary"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
          )}
        </div>

        <div>
          <Label
            htmlFor="responsePreference"
            className="mb-2 block text-meta font-medium text-text-secondary"
          >
            어떤 응답을 원하시나요?
          </Label>
          <Select name="responsePreference" defaultValue={record.responsePreference ?? "open"}>
            <SelectTrigger id="responsePreference" className="w-full bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">모든 응답을 환영합니다</SelectItem>
              <SelectItem value="question_only">질문은 환영해요</SelectItem>
              <SelectItem value="closed">그냥 읽어줘도 괜찮아요</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SearchIndexingOptOutField
          checked={searchIndexingOptOut}
          onChange={setSearchIndexingOptOut}
        />

        <div className="space-y-2">
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
            defaultValue={record.originalUrl ?? ""}
            placeholder="https://blog.example.com/my-post"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20"
          />
        </div>

        <div className="space-y-3">
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

        <TagSelector
          tags={tags}
          selectedTagIds={Array.from(selectedTags)}
          onChange={(newIds) => setSelectedTags(new Set(newIds))}
        />

        <div className="flex gap-3 pt-4 border-t border-border">
          <SubmitButton
            loadingText="저장 중..."
            className="h-auto rounded-md px-6 py-3 text-base font-medium"
          >
            저장
          </SubmitButton>
          <Link
            to={`/logs/${record.slug}`}
            className="inline-flex items-center justify-center border border-border text-text-secondary rounded-md px-6 py-3 text-base font-medium hover:bg-surface-secondary transition-colors no-underline"
          >
            건너뛰기
          </Link>
        </div>
      </form>
    </div>
  );
}
