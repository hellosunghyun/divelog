import { eq, sql } from "drizzle-orm";
import { Link, redirect, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/_public.write";

import { ArticleEditor } from "../components/editor/ArticleEditor";
import NoteEditor from "../components/editor/NoteEditor";
import { db } from "../db/client.server";
import { collaborationUnits, learnerProfiles, notifications, questions, records, recordTags, stages, templates } from "../db/schema.server";
import { requireVerified } from "../lib/auth.middleware";
import { getPlainText } from "../lib/content.server";
import { createQuestionSchema, createRecordSchema } from "../lib/validation";
import { nanoid } from "../lib/utils.server";
import { getAllTags } from "../db/queries/tags.server";
import { extractUserMentions, extractRecordRefs } from "../lib/extract-references.server";
import { syncMentionsForRecord } from "../db/queries/mentions.server";
import { syncRecordLinksForRecord } from "../db/queries/recordLinks.server";
import { useUnsavedWarning } from "../hooks/useUnsavedWarning";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록하기 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);

  const [activeTemplates, currentStageResult, activeCollaborations, allStages] = await database.batch([
    database.select().from(templates).where(eq(templates.active, true)),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.status, "active")),
    database.select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent }).from(stages).orderBy(stages.order),
  ]);

  const allTags = await getAllTags(context.cloudflare.env.DB);

  return {
    templates: activeTemplates,
    currentStage: currentStageResult[0] ?? null,
    collaborations: activeCollaborations,
    stages: allStages,
    tags: allTags,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
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

  const questionRaw = formData.get("question");
  const questionContent = typeof questionRaw === "string" ? questionRaw.trim() : "";
  const questionDirectionRaw = formData.get("questionDirection");
  const questionDirection = typeof questionDirectionRaw === "string" && ["inward", "outward", "next_stage"].includes(questionDirectionRaw)
    ? questionDirectionRaw
    : "outward";
  if (questionContent.length > 0) {
    const parsedQuestion = createQuestionSchema.safeParse({
      content: questionContent,
      direction: questionDirection,
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
    contentText: parsed.data.contentText ?? contentText,
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
      direction: questionDirection,
      isOpen: true,
      createdAt: now,
    });
  }

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

  if (format === "article") {
    const mentionedUsers = extractUserMentions(content);
    const recordRefs = extractRecordRefs(content);

    if (mentionedUsers.length > 0) {
      await syncMentionsForRecord(
        context.cloudflare.env.DB,
        id,
        auth.user.id,
        mentionedUsers.map((m) => m.slug),
      );

      const mentionSlugs = [...new Set(mentionedUsers.map((m) => m.slug).filter(Boolean))];
      if (mentionSlugs.length > 0) {
        const mentionedLearners = await database
          .select({ userId: learnerProfiles.userId })
          .from(learnerProfiles)
          .where(sql`${learnerProfiles.slug} IN (${sql.join(mentionSlugs.map((s) => sql`${s}`), sql`, `)})`);

        const actorName = auth.user.nickname ?? auth.user.name ?? "누군가";
        for (const row of mentionedLearners) {
          if (row.userId !== auth.user.id) {
            await database.insert(notifications).values({
              id: nanoid(),
              recipientId: row.userId,
              type: "mention",
              title: `${actorName}님이 기록에서 당신을 언급했습니다`,
              content: parsed.data.title,
              recordId: id,
              isRead: false,
              createdAt: now,
            });
          }
        }
      }
    }

    if (recordRefs.length > 0) {
      await syncRecordLinksForRecord(context.cloudflare.env.DB, id, recordRefs);
    }
  }

  throw redirect(`/logs/${slug}`);
}

export default function WritePage({ loaderData }: Route.ComponentProps) {
  const { templates: availableTemplates, currentStage, collaborations, stages: availableStages, tags } = loaderData;
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;
  const questionError = errors && "question" in errors ? errors.question?.[0] : undefined;
  const navigation = useNavigation();
  const [selectedFormat, setSelectedFormat] = useState<"note" | "article">("note");
  const [articleContent, setArticleContent] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [appliedTemplateId, setAppliedTemplateId] = useState<string>("");
  const isSubmitting = navigation.state === "submitting";

  const hasChanges =
    title.length > 0 ||
    articleContent.length > 0 ||
    noteContent.length > 0 ||
    question.length > 0 ||
    selectedTags.size > 0;

  function handleTemplateChange(templateId: string) {
    setAppliedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = availableTemplates.find((t) => t.id === templateId);
    if (!tmpl?.promptBody) return;
    if (selectedFormat === "note") {
      setNoteContent(tmpl.promptBody);
    } else if (selectedFormat === "article") {
      setArticleContent(tmpl.promptBody);
    }
    if (tmpl.rhythm) {
      const rhythmSelect = document.getElementById("rhythm") as HTMLSelectElement | null;
      if (rhythmSelect && ["free", "sprint", "weekly", "monthly"].includes(tmpl.rhythm)) {
        rhythmSelect.value = tmpl.rhythm;
      }
    }
  }

  useUnsavedWarning(hasChanges);

  return (
    <div className="mx-auto py-12 px-4 md:py-20" style={{ maxWidth: 960 }}>
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
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  defaultChecked={opt.value === "note"}
                  onChange={() => setSelectedFormat(opt.value as "note" | "article")}
                />
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
              value={appliedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
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

        <div>
          <label htmlFor="stageId" className="block text-meta font-medium text-text-secondary mb-2">
            구간
          </label>
          <select
            id="stageId"
            name="stageId"
            defaultValue={currentStage?.id ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          >
            <option value="">구간 미지정</option>
            {availableStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}{stage.isCurrent ? " (현재)" : ""}
              </option>
            ))}
          </select>
        </div>

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              defaultValue={noteContent}
              onChange={setNoteContent}
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

        <div className="bg-surface-secondary rounded-xl p-5 border border-border">
          <label
            htmlFor="question"
            className="block text-base font-medium text-text-primary mb-1"
          >
            남겨둘 질문 (선택)
          </label>
          <p className="text-meta text-text-tertiary mb-3">
            기록의 끝을 결론이 아니라 질문으로 열어둘 수 있습니다.
          </p>
          <textarea
            id="question"
            name="question"
            rows={2}
            placeholder="이 기록에 남기고 싶은 질문이 있다면..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-1"
          />
          {questionError ? <p className="text-error text-meta mt-1">{questionError}</p> : null}

          {question.trim().length > 0 && (
            <fieldset className="mt-3 border-0 m-0 p-0">
              <legend className="block text-meta font-medium text-text-secondary mb-2">
                질문 방향
              </legend>
              <div className="flex gap-3 flex-wrap">
                {[
                  { value: "inward", label: "스스로에게" },
                  { value: "outward", label: "동료에게" },
                  { value: "next_stage", label: "다음 구간으로" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <input type="radio" name="questionDirection" value={opt.value} defaultChecked={opt.value === "outward"} />
                    <span className="text-base">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
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
