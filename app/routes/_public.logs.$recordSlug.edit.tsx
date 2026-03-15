import { eq } from "drizzle-orm";
import { data, Link, redirect, useActionData, useNavigation } from "react-router";
import { useState } from "react";

import type { Route } from "./+types/_public.logs.$recordSlug.edit";

import { ArticleEditor } from "../components/editor/ArticleEditor";
import NoteEditor from "../components/editor/NoteEditor";
import { db } from "../db/client.server";
import { collaborationUnits, recordTags, stages, templates } from "../db/schema.server";
import { getRecordBySlug, updateRecord } from "../db/queries/records.server";
import { getAllTags, getTagsByRecord } from "../db/queries/tags.server";
import { requireVerified } from "../lib/auth.middleware";
import { getPlainText } from "../lib/content.server";
import { createRecordSchema } from "../lib/validation";
import { cleanupRemovedImages } from "../lib/r2-cleanup.server";
import { useUnsavedWarning } from "../hooks/useUnsavedWarning";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록 수정 — divelog" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const recordSlug = params.recordSlug;

  if (!recordSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const database = db(context.cloudflare.env.DB);
  const recordData = await getRecordBySlug(context.cloudflare.env.DB, recordSlug);

  if (!recordData) {
    throw new Response("Not Found", { status: 404 });
  }

  if (recordData.record.authorId !== auth.user.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  const [activeTemplates, currentStageResult, activeCollaborations] = await database.batch([
    database.select().from(templates).where(eq(templates.active, true)),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.status, "active")),
  ]);

  const allTags = await getAllTags(context.cloudflare.env.DB);
  const currentTags = await getTagsByRecord(context.cloudflare.env.DB, recordData.record.id);

  return {
    record: recordData.record,
    templates: activeTemplates,
    currentStage: currentStageResult[0] ?? null,
    collaborations: activeCollaborations,
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

  const formData = await request.formData();
  const recordData = await getRecordBySlug(context.cloudflare.env.DB, recordSlug);

  if (!recordData || recordData.record.authorId !== auth.user.id) {
    return data({ error: "권한이 없습니다." }, { status: 403 });
  }

  const formatRaw = formData.get("format");
  const contentRaw = formData.get("content");
  const format = formatRaw === "article" ? "article" : "note";
  const content = typeof contentRaw === "string" ? contentRaw : "";

  let contentText = "";
  if (format === "article") {
    try {
      JSON.parse(content);
      contentText = getPlainText(content, "article");
    } catch {
      contentText = content;
    }
  } else {
    contentText = content;
  }

  const parsed = createRecordSchema.safeParse({
    title: formData.get("title"),
    content,
    contentText,
    format,
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

  await updateRecord(context.cloudflare.env.DB, recordData.record.id, auth.user.id, {
    title: parsed.data.title,
    content: parsed.data.content,
    contentText: parsed.data.contentText ?? contentText,
    format: parsed.data.format,
    type: parsed.data.type,
    rhythm: parsed.data.rhythm,
    visibility: parsed.data.visibility,
    responsePreference: parsed.data.responsePreference,
    stageId: parsed.data.stageId,
    challengeId: parsed.data.challengeId,
    collaborationUnitId: parsed.data.collaborationUnitId,
  });

  if (parsed.data.format === "article") {
    await cleanupRemovedImages(
      context.cloudflare.env.R2,
      recordData.record.content ?? "",
      parsed.data.content ?? ""
    );
  }

  const database = db(context.cloudflare.env.DB);
  const tagIds = formData.getAll("tagIds") as string[];
  
  await database.delete(recordTags).where(eq(recordTags.recordId, recordData.record.id));
  
  if (tagIds.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    for (const tagId of tagIds) {
      await database.insert(recordTags).values({
        recordId: recordData.record.id,
        tagId,
        createdAt: now,
      });
    }
  }

  return redirect(`/logs/${recordSlug}`);
}

export default function EditRecordPage({ loaderData }: Route.ComponentProps) {
  const { record, templates: availableTemplates, currentStage, collaborations, tags, currentTags } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const originalFormat = record.format === "article" ? "article" : "note";
  const [selectedFormat, setSelectedFormat] = useState<"note" | "article">(originalFormat);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(currentTags.map((t) => t.id))
  );
  const [title, setTitle] = useState(record.title);
  const [articleContent, setArticleContent] = useState(record.format === "article" ? record.content : "");

  const errors = actionData && "errors" in actionData ? actionData.errors : undefined;
  const formError = actionData && "error" in actionData ? actionData.error : undefined;
  const titleError = errors?.title?.[0];
  const contentError = errors?.content?.[0];

  const hasChanges =
    title !== record.title ||
    selectedFormat !== originalFormat ||
    (selectedFormat === "article" && articleContent !== record.content) ||
    selectedTags.size !== currentTags.length ||
    Array.from(selectedTags).some((id) => !currentTags.some((t) => t.id === id));

  useUnsavedWarning(hasChanges);

  return (
    <div className="max-w-reading mx-auto py-12 px-4 md:py-20">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">기록 수정</h1>
      <p className="text-base text-text-secondary mb-8">이전 기록을 지금의 생각에 맞게 다듬어보세요.</p>

      {formError ? <p className="mb-6 text-meta text-error">{formError}</p> : null}

      <form method="post" className="flex flex-col gap-6">
        <fieldset className="border-0 m-0 p-0">
          <legend className="block text-meta font-medium text-text-secondary mb-2">유형</legend>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "personal", label: "개인 탐구" },
              { value: "challenge", label: "챌린지" },
              { value: "collaboration", label: "협업" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  defaultChecked={record.type === opt.value}
                />
                <span className="text-base">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 m-0 p-0">
          <legend className="block text-meta font-medium text-text-secondary mb-2">형식</legend>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "note", label: "노트 (짧게)" },
              { value: "article", label: "글 (길게)" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  defaultChecked={selectedFormat === opt.value}
                  onChange={() => setSelectedFormat(opt.value as "note" | "article")}
                />
                <span className="text-base">{opt.label}</span>
              </label>
            ))}
          </div>
          {selectedFormat !== originalFormat ? (
            <p className="mt-2 text-meta text-text-secondary">글 형식을 변경하면 서식이 사라질 수 있습니다.</p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="rhythm" className="block text-meta font-medium text-text-secondary mb-2">
            리듬
          </label>
          <select
            id="rhythm"
            name="rhythm"
            defaultValue={record.rhythm}
            className="rounded-md border border-border bg-surface px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="free">자유 형식</option>
            <option value="moment">순간의 기록</option>
            <option value="weekly">이번 주 메모</option>
            <option value="sprint">스프린트 로그</option>
            <option value="monthly">월간 회고</option>
            <option value="stage">구간 회고</option>
            <option value="reflection">개인 회고</option>
          </select>
        </div>

        {availableTemplates.length > 0 ? (
          <div>
            <label htmlFor="templateId" className="block text-meta font-medium text-text-secondary mb-2">
              템플릿 (선택)
            </label>
            <select
              id="templateId"
              name="templateId"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
            >
              <option value="">템플릿 없이 작성 중</option>
              {availableTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <input
          type="hidden"
          name="stageId"
          value={record.stageId ?? currentStage?.id ?? ""}
        />

        {collaborations.length > 0 ? (
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
              defaultValue={record.collaborationUnitId ?? ""}
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
        ) : null}

        <div>
          <label htmlFor="title" className="block text-meta font-medium text-text-secondary mb-2">
            제목 <span className="text-error">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-1"
          />
          {titleError ? <p className="text-error text-meta mt-1">{titleError}</p> : null}
        </div>

        <div>
          <p className="block text-meta font-medium text-text-secondary mb-2">
            내용 <span className="text-error">*</span>
          </p>
          {selectedFormat === "note" ? (
            <NoteEditor
              name="content"
              defaultValue={record.format === "note" ? record.content : ""}
              placeholder="짧은 생각, 메모, 기록을 남겨보세요..."
              error={contentError}
              htmlProps={{ required: true }}
            />
          ) : (
            <ArticleEditor
              name="content"
              content={articleContent}
              onChange={setArticleContent}
              placeholder="여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
            />
          )}
          {contentError ? <p className="text-error text-meta mt-1">{contentError}</p> : null}
        </div>

        <div>
          <label
            htmlFor="responsePreference"
            className="block text-meta font-medium text-text-secondary mb-2"
          >
            어떤 응답을 원하시나요?
          </label>
          <select
            id="responsePreference"
            name="responsePreference"
            defaultValue={record.responsePreference}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="open">모든 응답을 환영합니다</option>
            <option value="question_only">질문은 환영해요</option>
            <option value="closed">그냥 읽어줘도 괜찮아요</option>
          </select>
        </div>

        {tags.length > 0 && (
          <fieldset className="border-0 m-0 p-0">
            <legend className="block text-meta font-medium text-text-secondary mb-3">
              태그 (선택)
            </legend>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    checked={selectedTags.has(tag.id)}
                    onChange={(e) => {
                      const newTags = new Set(selectedTags);
                      if (e.target.checked) {
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

        <div>
          <label htmlFor="visibility" className="block text-meta font-medium text-text-secondary mb-2">
            공개 범위
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={record.visibility}
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
            {isSubmitting ? "저장 중..." : "수정 저장"}
          </button>
          <Link
            to={`/logs/${record.slug}`}
            className="border border-border text-text-secondary rounded-md px-6 py-3 text-base font-medium hover:bg-surface-secondary transition-colors no-underline"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">수정할 기록을 찾을 수 없습니다.</p>
      <Link
        to="/logs"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        기록 목록으로
      </Link>
    </div>
  );
}
