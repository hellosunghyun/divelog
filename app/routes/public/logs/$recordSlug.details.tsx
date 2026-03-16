import { eq } from "drizzle-orm";
import { Link } from "~/components/SmartLink";
import { data, redirect, useActionData, useNavigation } from "react-router";
import { useState } from "react";

import type { Route } from "./+types/$recordSlug.details";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { questions, records, recordTags } from "~/db/schema.server";
import { getRecordBySlug } from "~/db/queries/records.server";
import { getAllTags, getTagsByRecord } from "~/db/queries/tags.server";
import { requireVerified } from "~/lib/auth.middleware";
import { updateRecordMetadataSchema } from "~/lib/validation";
import { nanoid } from "~/lib/utils.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "세부 설정 — DiveLog" }];
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

  const [existingQuestions, allTags, currentTags] = await Promise.all([
    database.select().from(questions).where(eq(questions.recordId, recordData.record.id)).limit(1),
    getAllTags(context.cloudflare.env.DB),
    getTagsByRecord(context.cloudflare.env.DB, recordData.record.id),
  ]);

  return {
    record: recordData.record,
    existingQuestion: existingQuestions[0] ?? null,
    tags: allTags,
    currentTags,
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
  const parsed = updateRecordMetadataSchema.safeParse({
    question: formData.get("question") || undefined,
    questionDirection: formData.get("questionDirection") || undefined,
    responsePreference: formData.get("responsePreference") || undefined,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
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

  if (parsed.data.responsePreference) {
    await database
      .update(records)
      .set({ responsePreference: parsed.data.responsePreference, updatedAt: now })
      .where(eq(records.id, recordId));
  }

  await database.delete(recordTags).where(eq(recordTags.recordId, recordId));
  if (parsed.data.tagIds && parsed.data.tagIds.length > 0) {
    for (const tagId of parsed.data.tagIds) {
      await database.insert(recordTags).values({ recordId, tagId, createdAt: now });
    }
  }

  throw redirect(`/logs/${recordSlug}`);
}

export default function RecordDetailsPage({ loaderData }: Route.ComponentProps) {
  const { record, existingQuestion, tags, currentTags } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [question, setQuestion] = useState(existingQuestion?.content ?? "");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(currentTags.map((tag: { id: string }) => tag.id)),
  );
  const isSubmitting = navigation.state === "submitting";

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

        {tags.length > 0 && (
          <fieldset className="border-0 m-0 p-0">
            <legend className="block text-meta font-medium text-text-secondary mb-3">태그 (선택)</legend>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: { id: string; name: string }) => (
                <label key={tag.id} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    checked={selectedTags.has(tag.id)}
                    onChange={(event) => {
                      const newTags = new Set(selectedTags);
                      if (event.target.checked) {
                        newTags.add(tag.id);
                      } else {
                        newTags.delete(tag.id);
                      }
                      setSelectedTags(newTags);
                    }}
                    className="hidden"
                  />
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm border transition-colors ${
                      selectedTags.has(tag.id)
                        ? "border-ocean-blue bg-mist-blue text-ocean-blue"
                        : "border-border bg-surface text-text-secondary hover:border-ocean-blue"
                    }`}
                  >
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-auto rounded-md px-6 py-3 text-base font-medium"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </Button>
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
