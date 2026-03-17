import { eq, sql } from "drizzle-orm";
import { useState } from "react";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/article";

import { ArticleEditor } from "~/components/editor/ArticleEditor";
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
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware";
import { createArticleSchema } from "~/lib/auth/validation";

const NO_STAGE_VALUE = "__none__";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "글쓰기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { learnerProfiles, notifications, records, stages } = await import("~/db/schema.server");
  const { getPlainText } = await import("~/lib/content/content.server");
  const { syncMentionsForRecord } = await import("~/db/queries/dialogue/mentions.server");
  const { syncRecordLinksForRecord } = await import("~/db/queries/records/recordLinks.server");
  const { extractUserMentions, extractRecordRefs } = await import("~/lib/content/extract-references.server");
  const { nanoid } = await import("~/lib/utils/utils.server");

  const auth = await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages, learnerResult] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent }).from(stages).orderBy(stages.order),
    database.select().from(learnerProfiles).where(eq(learnerProfiles.userId, auth.user.id)).limit(1),
  ]);
  const learner = learnerResult[0] ?? null;

  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
    learnerDefaults: {
      defaultVisibility: learner?.defaultVisibility ?? "cohort",
      defaultResponsePreference: learner?.defaultResponsePreference ?? "open",
    },
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { learnerProfiles, notifications, records, stages } = await import("~/db/schema.server");
  const { getPlainText } = await import("~/lib/content/content.server");
  const { syncMentionsForRecord } = await import("~/db/queries/dialogue/mentions.server");
  const { syncRecordLinksForRecord } = await import("~/db/queries/records/recordLinks.server");
  const { extractUserMentions, extractRecordRefs } = await import("~/lib/content/extract-references.server");
  const { nanoid } = await import("~/lib/utils/utils.server");

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

  const parsed = createArticleSchema.safeParse({
    title: formData.get("title"),
    content,
    visibility: formData.get("visibility") || "cohort",
    stageId: formData.get("stageId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const baseSlug = parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
  const slug = `${baseSlug || "article"}-${id.substring(0, 6)}`;
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
    rhythm: "free",
    visibility: parsed.data.visibility,
    responsePreference,
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    createdAt: now,
    updatedAt: now,
  });

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

  throw redirect(`/logs/${slug}/details`);
}

export default function WriteArticlePage({ loaderData }: Route.ComponentProps) {
  const { currentStage, stages: availableStages, learnerDefaults } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [stageValue, setStageValue] = useState(currentStage?.id ?? NO_STAGE_VALUE);
  const [title, setTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  useUnsavedWarning(title.length > 0 || articleContent.length > 0);

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
                  <SelectItem value="cohort">코호트 공개</SelectItem>
                  <SelectItem value="public">전체 공개</SelectItem>
                  <SelectItem value="draft">임시저장</SelectItem>
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
            <ArticleEditor
              name="content"
              content={articleContent}
              onChange={setArticleContent}
              placeholder="여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
            />
            {contentError ? <p className="mt-1 text-meta text-error">{contentError}</p> : null}
          </div>
        </Form>
      </div>
    </div>
  );
}
