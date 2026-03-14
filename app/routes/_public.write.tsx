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
    <div
      style={{
        maxWidth: "var(--max-reading-width)",
        margin: "0 auto",
        padding: "var(--space-12) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-2)",
        }}
      >
        기록하기
      </h1>
      <p
        style={{
          fontSize: "var(--font-size-base)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-8)",
        }}
      >
        완성된 글이 아니어도 괜찮습니다.
      </p>

      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            유형
          </legend>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {[
              { value: "personal", label: "개인 탐구" },
              { value: "challenge", label: "챌린지" },
              { value: "collaboration", label: "협업" },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer" }}
              >
                <input type="radio" name="type" value={opt.value} defaultChecked={opt.value === "personal"} />
                <span style={{ fontSize: "var(--font-size-base)" }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            형식
          </legend>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {[
              { value: "note", label: "노트 (짧게)" },
              { value: "article", label: "글 (길게)" },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer" }}
              >
                <input type="radio" name="format" value={opt.value} defaultChecked={opt.value === "note"} />
                <span style={{ fontSize: "var(--font-size-base)" }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="rhythm"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            리듬
          </label>
          <select
            id="rhythm"
            name="rhythm"
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              backgroundColor: "var(--color-surface)",
            }}
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
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              템플릿 (선택)
            </label>
            <select
              id="templateId"
              name="templateId"
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "var(--font-size-base)",
                backgroundColor: "var(--color-surface)",
                width: "100%",
              }}
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
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              협업 유닛 (선택)
            </label>
            <select
              id="collaborationUnitId"
              name="collaborationUnitId"
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "var(--font-size-base)",
                backgroundColor: "var(--color-surface)",
                width: "100%",
              }}
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
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            제목 <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="제목을 입력하세요"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              fontFamily: "inherit",
            }}
          />
          {actionData?.errors?.title && (
            <p style={{ color: "var(--color-error)", fontSize: "13px", marginTop: "4px" }}>
              {actionData.errors.title[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="content"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            내용 <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            placeholder="지금 이 순간의 탐구를 기록해보세요..."
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          {actionData?.errors?.content && (
            <p style={{ color: "var(--color-error)", fontSize: "13px", marginTop: "4px" }}>
              {actionData.errors.content[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="question"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            남겨둘 질문 (선택)
          </label>
          <input
            id="question"
            name="question"
            type="text"
            placeholder="이 기록에 남기고 싶은 질문이 있다면..."
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              fontFamily: "inherit",
            }}
          />
          {actionData?.errors?.question && (
            <p style={{ color: "var(--color-error)", fontSize: "13px", marginTop: "4px" }}>
              {actionData.errors.question[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="responsePreference"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            응답 설정
          </label>
          <select
            id="responsePreference"
            name="responsePreference"
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <option value="open">모든 응답 허용</option>
            <option value="question_only">질문만 허용</option>
            <option value="closed">응답 닫기</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="visibility"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-2)",
            }}
          >
            공개 범위
          </label>
          <select
            id="visibility"
            name="visibility"
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--font-size-base)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <option value="cohort">코호트 공개</option>
            <option value="public">전체 공개</option>
            <option value="draft">임시저장</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-ocean-blue)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--font-size-base)",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "저장 중..." : "기록 저장"}
          </button>
          <Link
            to="/logs"
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-base)",
              textDecoration: "none",
            }}
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
