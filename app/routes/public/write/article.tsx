import { eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, Suspense, lazy } from "react";
import { Link } from "~/components/content/SmartLink";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { DateRange } from "react-day-picker";
import type { Route } from "./+types/article";

const ArticleEditor = lazy(() =>
  import("~/components/editor/editors/ArticleEditor").then(m => ({ default: m.ArticleEditor }))
);
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/client.server";
import { syncMentionsForRecord } from "~/db/queries/dialogue/mentions.server";
import { markAsRead } from "~/db/queries/records/recordReads.server";
import { syncRecordLinksForRecord } from "~/db/queries/records/recordLinks.server";
import { learnerProfiles, notifications, records, stages } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth/auth.middleware";
import { createArticleSchema } from "~/lib/auth/validation";
import { getPlainText } from "~/lib/content/content.server";
import {
  extractRecordRefs,
  extractUserMentions,
} from "~/lib/content/extract-references.server";
import { cn } from "~/lib/utils/cn";
import { nanoid } from "~/lib/utils/utils.server";

const NO_STAGE_VALUE = "__none__";

const RHYTHM_OPTIONS = [
  { value: "free", label: "자유" },
  { value: "moment", label: "순간" },
  { value: "sprint", label: "스프린트" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "stage", label: "구간" },
  { value: "reflection", label: "회고" },
] as const;

type DateMode = "none" | "single" | "range";

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0" aria-hidden="true">
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}

function parseDateToUnix(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 1000);
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "글쓰기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
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
      defaultVisibility: learner?.defaultVisibility ?? "public",
      defaultResponsePreference: learner?.defaultResponsePreference ?? "open",
    },
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
    stageId: formData.get("stageId") || undefined,
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
    rhythm: parsed.data.rhythm,
    visibility: parsed.data.visibility,
    responsePreference,
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    recordedAt,
    recordedEndAt,
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

  if (parsed.data.visibility !== "draft") {
    try {
      await markAsRead(context.cloudflare.env.DB, auth.user.id, id);
    } catch {
      // silent fail — 읽음 처리 실패가 작성을 막지 않음
    }
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
  const [rhythm, setRhythm] = useState("free");
  const [dateMode, setDateMode] = useState<DateMode>("none");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;
  const titleError = errors && "title" in errors ? errors.title?.[0] : undefined;
  const contentError = errors && "content" in errors ? errors.content?.[0] : undefined;

  useUnsavedWarning(title.length > 0 || articleContent.length > 0);

  function handleDateModeChange(newMode: DateMode) {
    setDateMode(newMode);
    if (newMode === "none") {
      setSingleDate(undefined);
      setDateRange(undefined);
    } else if (newMode === "single") {
      setDateRange(undefined);
    } else {
      setSingleDate(undefined);
    }
  }

  const recordedAtValue = dateMode === "single" && singleDate
    ? format(singleDate, "yyyy-MM-dd")
    : dateMode === "range" && dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : "";
  const recordedEndAtValue = dateMode === "range" && dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : "";

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
                  <SelectItem value="draft">임시저장</SelectItem>
                  <SelectItem value="private">나만 보기</SelectItem>
                  <SelectItem value="cohort">코호트 공개</SelectItem>
                  <SelectItem value="public">전체 공개</SelectItem>
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
                  onClick={() => setRhythm(option.value)}
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

          <div>
            <Label className="mb-2 block text-meta font-medium text-text-secondary">
              기록 날짜
            </Label>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {([
                  { mode: "none" as const, label: "지정 안 함" },
                  { mode: "single" as const, label: "특정일" },
                  { mode: "range" as const, label: "기간" },
                ]).map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    aria-pressed={dateMode === option.mode}
                    onClick={() => handleDateModeChange(option.mode)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all duration-[var(--duration-fast)]",
                      "hover:bg-surface-secondary active:scale-[0.98]",
                      "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
                      dateMode === option.mode
                        ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
                        : "bg-surface text-text-secondary border-border",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {dateMode === "single" && (
                <div>
                  <input type="hidden" name="recordedAt" value={recordedAtValue} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !singleDate && "text-text-tertiary",
                        )}
                      >
                        <CalendarIcon />
                        {singleDate ? format(singleDate, "yyyy년 M월 d일", { locale: ko }) : "날짜를 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={singleDate}
                        onSelect={setSingleDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dateMode === "range" && (
                <div>
                  <input type="hidden" name="recordedAt" value={recordedAtValue} />
                  <input type="hidden" name="recordedEndAt" value={recordedEndAtValue} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !dateRange?.from && "text-text-tertiary",
                        )}
                      >
                        <CalendarIcon />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "yyyy년 M월 d일", { locale: ko })}
                              {" — "}
                              {format(dateRange.to, "yyyy년 M월 d일", { locale: ko })}
                            </>
                          ) : (
                            format(dateRange.from, "yyyy년 M월 d일", { locale: ko })
                          )
                        ) : (
                          "기간을 선택하세요"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
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
      </div>
    </div>
  );
}
