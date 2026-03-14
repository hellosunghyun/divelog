import { eq } from "drizzle-orm";
import { Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/_public.write";

import { db } from "../db/client.server";
import { collaborationUnits, questions, records, stages, templates } from "../db/schema.server";
import { requireVerified } from "../lib/auth.middleware";
import { createQuestionSchema, createRecordSchema } from "../lib/validation";
import { nanoid } from "../lib/utils.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록하기 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);

  const [activeTemplates, currentStageResult, activeCollaborations] = await database.batch([
    database.select().from(templates).where(eq(templates.active, true)),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.status, "active")),
  ]);

  return {
    templates: activeTemplates,
    currentStage: currentStageResult[0] ?? null,
    collaborations: activeCollaborations,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();

  const parsed = createRecordSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    format: formData.get("format"),
    type: formData.get("type"),
    rhythm: formData.get("rhythm"),
    visibility: formData.get("visibility"),
    responsePreference: formData.get("responsePreference"),
    stageId: formData.get("stageId") || undefined,
    challengeId: formData.get("challengeId") || undefined,
    collaborationUnitId: formData.get("collaborationUnitId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const questionRaw = formData.get("question");
  const questionContent = typeof questionRaw === "string" ? questionRaw.trim() : "";
  if (questionContent.length > 0) {
    const parsedQuestion = createQuestionSchema.safeParse({
      content: questionContent,
      direction: "outward",
      recordId: "pending",
    });

    if (!parsedQuestion.success) {
      return { errors: { question: parsedQuestion.error.flatten().fieldErrors.content } };
    }
  }

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const baseSlug = parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
  const slug = `${baseSlug || "record"}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title: parsed.data.title,
    content: parsed.data.content,
    format: parsed.data.format ?? "note",
    type: parsed.data.type ?? "personal",
    rhythm: parsed.data.rhythm ?? "free",
    visibility: parsed.data.visibility ?? "cohort",
    responsePreference: parsed.data.responsePreference ?? "open",
    stageId: parsed.data.stageId ?? null,
    challengeId: parsed.data.challengeId ?? null,
    collaborationUnitId: parsed.data.collaborationUnitId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (questionContent.length > 0) {
    await database.insert(questions).values({
      id: nanoid(),
      recordId: id,
      content: questionContent,
      direction: "outward",
      isOpen: true,
      createdAt: now,
    });
  }

  throw redirect(`/logs/${slug}`);
}

export default function WritePage({ loaderData }: Route.ComponentProps) {
  const { templates: availableTemplates, currentStage, collaborations } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-reading mx-auto py-12 px-4 md:py-20">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        기록하기
      </h1>
      <p className="text-base text-text-secondary mb-8">
        완성된 글이 아니어도 괜찮습니다.
      </p>

      <form method="post" className="flex flex-col gap-6">
        <fieldset className="border-0 m-0 p-0">
          <legend className="block text-meta font-medium text-text-secondary mb-2">
            유형
          </legend>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "personal", label: "개인 탐구" },
              { value: "challenge", label: "챌린지" },
              { value: "collaboration", label: "협업" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1 cursor-pointer"
              >
                <input type="radio" name="type" value={opt.value} defaultChecked={opt.value === "personal"} />
                <span className="text-base">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 m-0 p-0">
          <legend className="block text-meta font-medium text-text-secondary mb-2">
            형식
          </legend>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "note", label: "노트 (짧게)" },
              { value: "article", label: "글 (길게)" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1 cursor-pointer"
              >
                <input type="radio" name="format" value={opt.value} defaultChecked={opt.value === "note"} />
                <span className="text-base">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="rhythm"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            리듬
          </label>
          <select
            id="rhythm"
            name="rhythm"
            className="rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="free">자유</option>
            <option value="sprint">스프린트</option>
            <option value="weekly">주간</option>
            <option value="monthly">월간</option>
          </select>
        </div>

        {availableTemplates.length > 0 && (
          <div>
            <label
              htmlFor="templateId"
              className="block text-meta font-medium text-text-secondary mb-2"
            >
              템플릿 (선택)
            </label>
            <select
              id="templateId"
              name="templateId"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
            >
              <option value="">템플릿 없이 시작</option>
              {availableTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentStage && <input type="hidden" name="stageId" value={currentStage.id} />}

        {collaborations.length > 0 && (
          <div>
            <label
              htmlFor="collaborationUnitId"
              className="block text-meta font-medium text-text-secondary mb-2"
            >
              협업 유닛 (선택)
            </label>
            <select
              id="collaborationUnitId"
              name="collaborationUnitId"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
            >
              <option value="">선택 안 함</option>
              {collaborations.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            제목 <span className="text-error">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="제목을 입력하세요"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-1"
          />
          {actionData?.errors?.title && (
            <p className="text-error text-meta mt-1">
              {actionData.errors.title[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            내용 <span className="text-error">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            placeholder="지금 이 순간의 탐구를 기록해보세요..."
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base leading-body min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          />
          {actionData?.errors?.content && (
            <p className="text-error text-meta mt-1">
              {actionData.errors.content[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="question"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            남겨둘 질문 (선택)
          </label>
          <input
            id="question"
            name="question"
            type="text"
            placeholder="이 기록에 남기고 싶은 질문이 있다면..."
            className="w-full rounded-md border border-border bg-surface-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-1"
          />
          {actionData?.errors?.question && (
            <p className="text-error text-meta mt-1">
              {actionData.errors.question[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="responsePreference"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            응답 설정
          </label>
          <select
            id="responsePreference"
            name="responsePreference"
            className="rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="open">모든 응답 허용</option>
            <option value="question_only">질문만 허용</option>
            <option value="closed">응답 닫기</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="visibility"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            공개 범위
          </label>
          <select
            id="visibility"
            name="visibility"
            className="rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="cohort">코호트 공개</option>
            <option value="public">전체 공개</option>
            <option value="draft">임시저장</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-ocean-blue text-white px-6 py-3 text-base font-medium hover:bg-deep-ocean transition-colors focus-visible:ring-2 focus-visible:ring-ocean-blue disabled:opacity-60"
          >
            {isSubmitting ? "저장 중..." : "기록 저장"}
          </button>
          <Link
            to="/logs"
            className="border border-border text-text-secondary rounded-md px-6 py-3 text-base font-medium hover:bg-surface-secondary transition-colors no-underline"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
