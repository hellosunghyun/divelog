import { eq } from "drizzle-orm";
import { useState, Suspense, lazy } from "react";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, isRouteErrorResponse, useRouteError } from "react-router";
import type { Route } from "./+types/article";

const ArticleEditor = lazy(() =>
  import("~/components/editor/editors/ArticleEditor").then(m => ({ default: m.ArticleEditor }))
);
import { NavigationBlockerDialog } from "~/components/feedback/NavigationBlockerDialog";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RhythmDateInput } from "~/components/record/RhythmDateInput";
import { db } from "~/db/client.server";
import { getStages } from "~/db/queries/journey/stages.server";
import { syncRecordLinksForRecord } from "~/db/queries/records/recordLinks.server";
import { learnerProfiles, records } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware.server";
import { createArticleSchema } from "~/lib/auth/validation";
import { getPlainText } from "~/lib/content/content.server";
import { extractRecordRefs } from "~/lib/content/extract-references.server";
import { parseDateToUnix } from "~/lib/utils/date";
import { cn } from "~/lib/utils/cn";
import { getNextRecordSlug } from "~/db/queries/records/records.server";
import { nanoid } from "~/lib/utils/utils.server";

const RHYTHM_OPTIONS = [
  { value: "free", label: "자유" },
  { value: "moment", label: "순간" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "stage", label: "구간" },
] as const;

export function meta(_args: Route.MetaArgs) {
  return [{ title: "글쓰기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [learnerResult, stagesData] = await Promise.all([
    database
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, auth.user.id))
      .limit(1),
    getStages(context.cloudflare.env.DB),
  ]);
  const learner = learnerResult[0] ?? null;

  const stages = stagesData.map((stage) => ({
    id: stage.id,
    name: stage.name,
    slug: stage.slug,
    type: stage.type,
    startDate: stage.startDate,
    endDate: stage.endDate,
    isCurrent: stage.isCurrent,
  }));

  return {
    learnerDefaults: {
      defaultVisibility: learner?.defaultVisibility ?? "public",
      defaultResponsePreference: learner?.defaultResponsePreference ?? "open",
    },
    stages,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
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

  const recordedAtRaw = formData.get("recordedAt");
  const recordedEndAtRaw = formData.get("recordedEndAt");

  const parsed = createArticleSchema.safeParse({
    title: formData.get("title"),
    content,
    rhythm: formData.get("rhythm") || "free",
    visibility: formData.get("visibility") || "public",
    recordedAt: typeof recordedAtRaw === "string" && recordedAtRaw ? recordedAtRaw : undefined,
    recordedEndAt: typeof recordedEndAtRaw === "string" && recordedEndAtRaw ? recordedEndAtRaw : undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const recordedAt = parseDateToUnix(parsed.data.recordedAt);
  const recordedEndAt = parseDateToUnix(parsed.data.recordedEndAt);

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const slug = await getNextRecordSlug(context.cloudflare.env.DB);
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
    rhythm: parsed.data.rhythm,
    visibility: parsed.data.visibility,
    responsePreference,
    challengeId: null,
    collaborationUnitId: null,
    recordedAt,
    recordedEndAt,
    originalUrl: null,
    createdAt: now,
    updatedAt: now,
  });

  const recordRefs = extractRecordRefs(content);

  if (recordRefs.length > 0) {
    await syncRecordLinksForRecord(context.cloudflare.env.DB, id, recordRefs);
  }

  throw redirect(`/write/meta/${id}`);
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto py-16 px-6 max-w-[720px] text-center">
      <h1 className="text-xl font-semibold text-text-primary mb-3">
        {is404 ? "페이지를 찾을 수 없습니다" : "페이지를 불러오지 못했습니다"}
      </h1>
      <p className="text-text-secondary mb-6">
        {is404
          ? "요청하신 페이지가 존재하지 않습니다."
          : "일시적인 네트워크 문제일 수 있습니다. 다시 시도해 주세요."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-ocean-blue px-6 py-2 text-sm font-semibold text-white hover:bg-ocean-blue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          다시 시도
        </button>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-medium text-text-secondary no-underline hover:bg-surface-secondary transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

export default function WriteArticlePage({ loaderData }: Route.ComponentProps) {
   const { learnerDefaults, stages } = loaderData;
   const actionData = useActionData<typeof action>();
   const [title, setTitle] = useState("");
   const [articleContent, setArticleContent] = useState("");
   const [rhythm, setRhythm] = useState("free");
   const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  const blocker = useUnsavedWarning(title.length > 0 || articleContent.length > 0);

  function handleRhythmChange(newRhythm: string) {
    setRhythm(newRhythm);
  }

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
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
                >
                  취소
                </Link>
                <SubmitButton loadingText="저장 중...">
                  저장
                </SubmitButton>
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

            <input
              type="hidden"
              name="responsePreference"
              defaultValue={learnerDefaults.defaultResponsePreference}
            />
          </div>

          <div>
            <Label className="mb-2 block text-meta font-medium text-text-secondary">
              기록 리듬
            </Label>
            <input type="hidden" name="rhythm" value={rhythm} />
            <div className="flex flex-wrap gap-2">
              {RHYTHM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={rhythm === option.value}
                  onClick={() => handleRhythmChange(option.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all duration-[var(--duration-fast)]",
                    "hover:bg-surface-secondary active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
                    rhythm === option.value
                      ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
                      : "bg-surface text-text-secondary border-border",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <RhythmDateInput rhythm={rhythm} stages={stages} />

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
             <Suspense fallback={<div className="animate-pulse bg-surface-secondary rounded-lg h-64" />}>
               <ArticleEditor
                 name="content"
                 content={articleContent}
                 onChange={(_json, text) => setArticleContent(text)}
                 placeholder="여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
               />
             </Suspense>
             {contentError ? <p className="mt-1 text-meta text-error">{contentError}</p> : null}
           </div>
         </Form>
         <NavigationBlockerDialog blocker={blocker} />
       </div>
     </div>
   );
 }
