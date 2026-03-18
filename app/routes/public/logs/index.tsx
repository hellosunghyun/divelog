import type { Route } from "./+types/index";
import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { eq, and, asc, desc, gte, lt, sql, count } from "drizzle-orm";
import SceneCard from "~/components/cards/SceneCard";
import FilterBar from "~/components/filters/FilterBar";
import SortBar from "~/components/filters/SortBar";
import ViewToggle, { type RecordView } from "~/components/views/ViewToggle";
import TimelineView from "~/components/views/TimelineView";
import CalendarView from "~/components/views/CalendarView";
import EmptyState from "~/components/feedback/EmptyState";
import { Button } from "~/components/ui/button";
import { db } from "~/db/client.server";
import { learnerProfiles, records, stages } from "~/db/schema.server";
import { getParticipantsBatch } from "~/db/queries/records/participants.server";
import { getPlainText } from "~/lib/content/content.server";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { createLogger } from "~/lib/infra/logger.server";
import { useReadState } from "~/hooks/useReadState";

type LogSort = "recent" | "oldest" | "stage";

function getDefaultMonthValue(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseViewParam(value: string | null): RecordView {
  if (value === "grid" || value === "timeline" || value === "calendar") {
    return value;
  }

  return "timeline";
}

function parseSortParam(value: string | null): LogSort {
  if (value === "oldest" || value === "stage") {
    return value;
  }

  return "recent";
}

function parseMonthParam(value: string | null) {
  const fallback = getDefaultMonthValue();
  const normalizedValue = /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value ?? fallback : fallback;
  const [year, month] = normalizedValue.split("-").map(Number);
  const monthIndex = month - 1;
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 1);

  return {
    value: normalizedValue,
    startTimestamp: Math.floor(startDate.getTime() / 1000),
    endTimestamp: Math.floor(endDate.getTime() / 1000),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    { title: "기록 — DiveLog" },
     { name: "description", content: loaderData?.metaDescription ?? "Apple Developer Academy @ POSTECH 러너들의 기록 모음" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "logs" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const stageId = url.searchParams.get("stage") ?? undefined;
  const format = url.searchParams.get("format") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const rhythm = url.searchParams.get("rhythm") ?? undefined;
  const sort = parseSortParam(url.searchParams.get("sort"));
  const view = parseViewParam(url.searchParams.get("view"));
  const month = parseMonthParam(url.searchParams.get("month"));
  const shouldLoadAllRecords = view === "timeline" || view === "calendar";
  const page = shouldLoadAllRecords ? 1 : Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  const database = db(context.cloudflare.env.DB);

  const conditions = [sql`${records.visibility} IN ('cohort', 'public')`];
  if (stageId) conditions.push(eq(records.stageId, stageId));
  if (format && (format === "note" || format === "article")) {
    conditions.push(eq(records.format, format));
  }
  if (type && (type === "personal" || type === "challenge" || type === "collaboration")) {
    conditions.push(eq(records.type, type));
  }
  if (rhythm && ["moment", "sprint", "weekly", "monthly", "stage", "reflection", "free"].includes(rhythm)) {
    conditions.push(eq(records.rhythm, rhythm));
  }
  if (view === "calendar") {
    conditions.push(gte(records.createdAt, month.startTimestamp));
    conditions.push(lt(records.createdAt, month.endTimestamp));
  }

  const pageSize = shouldLoadAllRecords ? 200 : 20;
  const offset = (page - 1) * pageSize;

  const effectiveSort = view === "timeline" ? "stage" : sort;

  const orderBy =
    effectiveSort === "stage"
      ? [asc(stages.order), desc(records.createdAt)]
      : effectiveSort === "oldest"
        ? [asc(records.createdAt)]
        : [desc(records.createdAt)];

  const [filteredRecords, allStages, totalCountResult] = await Promise.all([
    database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        rhythm: records.rhythm,
        createdAt: records.createdAt,
        stageId: records.stageId,
        authorId: records.authorId,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
        stage: {
          name: stages.name,
          type: stages.type,
          order: stages.order,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .leftJoin(stages, eq(records.stageId, stages.id))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset),
    database
      .select({ id: stages.id, name: stages.name, type: stages.type, order: stages.order })
      .from(stages)
      .orderBy(asc(stages.order)),
    database
      .select({ count: count() })
      .from(records)
      .where(and(...conditions)),
  ]);

  const totalCount = totalCountResult[0]?.count ?? 0;
  const totalPages = shouldLoadAllRecords ? 1 : Math.ceil(totalCount / pageSize);

  const recordIds = filteredRecords.map((r) => r.id);
  const participantsRaw = await getParticipantsBatch(context.cloudflare.env.DB, recordIds);
  const participantsByRecordId = new Map<string, typeof participantsRaw>();
  for (const p of participantsRaw) {
    const existing = participantsByRecordId.get(p.recordId) ?? [];
    existing.push(p);
    participantsByRecordId.set(p.recordId, existing);
  }

  const recordsWithSnippets = filteredRecords.map((record) => {
    const plainTextContent = getPlainText(record.content, normalizeContentFormat(record.format));

    return {
      ...record,
      contentSnippet:
        plainTextContent.substring(0, 120) + (plainTextContent.length > 120 ? "…" : ""),
    };
  });

  const firstRecordPlainText = filteredRecords[0]
    ? getPlainText(filteredRecords[0].content, normalizeContentFormat(filteredRecords[0].format))
    : null;
  const metaDescription = firstRecordPlainText
    ? firstRecordPlainText.substring(0, 150) + (firstRecordPlainText.length > 150 ? "…" : "")
    : "Apple Developer Academy @ POSTECH 러너들의 기록 모음";

  logger.info("loader_end");
  return {
    records: recordsWithSnippets,
    allStages,
    page,
    totalPages,
    filters: { stageId, format, type, rhythm, sort, view, month: month.value },
    metaDescription,
    participantsByRecordId: Object.fromEntries(participantsByRecordId),
  };
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (currentUrl.search !== nextUrl.search) {
    return true;
  }
  return defaultShouldRevalidate;
}

const FILTER_OPTIONS = [
  {
    key: "type",
    label: "유형",
    values: [
      { value: "personal", label: "개인" },
      { value: "challenge", label: "챌린지" },
      // [COLLAB_DISABLED] { value: "collaboration", label: "협업" },
    ],
  },
  {
    key: "rhythm",
    label: "리듬",
    values: [
      { value: "moment", label: "순간" },
      { value: "weekly", label: "주간" },
      { value: "sprint", label: "스프린트" },
      { value: "monthly", label: "월간" },
      { value: "stage", label: "구간 회고" },
      { value: "reflection", label: "개인 회고" },
      { value: "free", label: "자유" },
    ],
  },
];

export default function LogsPage({ loaderData }: Route.ComponentProps) {
  const { records: filteredRecords, allStages, page, totalPages, filters, participantsByRecordId } = loaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = filters.view;
  const activeFormat = searchParams.get("format") ?? "";
  const articleRecordIds = useMemo(
    () => filteredRecords.filter((r) => r.format === "article").map((r) => r.id),
    [filteredRecords],
  );
  const { isRead } = useReadState(articleRecordIds);

  const tabs = [
    { label: "전체", value: "" },
    { label: "노트", value: "note" },
    { label: "글", value: "article" },
  ];

  function handleTabClick(formatValue: string) {
    const newParams = new URLSearchParams(searchParams);
    if (formatValue) {
      newParams.set("format", formatValue);
    } else {
      newParams.delete("format");
    }
    newParams.delete("page");
    navigate(`/logs?${newParams.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    navigate(`/logs?${newParams.toString()}`);
  }

  const stageFilterOptions = allStages.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }));

  const allFilters = [
    { key: "stage", label: "Stage", values: stageFilterOptions },
    ...FILTER_OPTIONS,
  ];

  const recordsContent =
    filteredRecords.length === 0 ? (
      <EmptyState variant="records" message="조건에 맞는 기록이 없습니다." />
    ) : currentView === "calendar" ? (
      <CalendarView
        records={filteredRecords.map((record) => ({
          ...record,
          format: record.format as "note" | "article",
          contentSnippet: record.contentSnippet ?? undefined,
        }))}
        month={filters.month}
      />
    ) : currentView === "timeline" ? (
      <TimelineView
        records={filteredRecords.map((record) => ({
          ...record,
          format: record.format as "note" | "article",
          stageType:
            (record.stage?.type as "prelude" | "bridge" | "challenge" | "epilogue" | null) ?? null,
        }))}
        stages={allStages.map((stage) => ({
          ...stage,
          type: stage.type as "prelude" | "bridge" | "challenge" | "epilogue",
        }))}
        isRead={isRead}
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map((record: typeof filteredRecords[number]) => (
          <div key={record.id}>
            <SceneCard
              record={{
                slug: record.slug,
                title: record.title,
                content: record.content,
                format: record.format as "note" | "article",
                type: record.type as "personal" | "challenge" | "collaboration",
                rhythm: record.rhythm ?? undefined,
                createdAt: record.createdAt,
              }}
              contentSnippet={record.contentSnippet}
              author={
                record.author?.displayName
                  ? {
                      displayName: record.author.displayName,
                      slug: record.author.slug ?? "",
                    }
                  : undefined
              }
              stage={
                record.stage?.name
                  ? {
                      name: record.stage.name,
                      type: record.stage.type ?? "",
                    }
                  : undefined
              }
              participants={participantsByRecordId[record.id]}
              isRead={record.format === "article" && isRead(record.id)}
            />
          </div>
        ))}
      </div>
    );

  return (
    <div>
      <div className="max-w-content mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-text-primary mb-2">
          기록
        </h1>
        <p className="text-lg text-text-secondary leading-body">
          러너들이 남긴 탐구의 기록들
        </p>
      </div>

      <div className="max-w-content mx-auto px-6 pb-12 md:pb-16">
        <h2 className="sr-only">기록 목록</h2>
        <div className="mb-6 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              onClick={() => handleTabClick(tab.value)}
              className={`-mb-px h-auto rounded-none border-b-2 px-4 py-2.5 text-base font-medium transition-colors hover:bg-transparent ${
                activeFormat === tab.value
                  ? "border-ocean-blue text-ocean-blue"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <FilterBar filters={allFilters} />
          <div className="flex items-center gap-3">
            <SortBar
              options={[
                { value: "recent", label: "최근 기록" },
                { value: "oldest", label: "오래된 기록" },
                { value: "stage", label: "기간순" },
              ]}
            />
            <ViewToggle currentView={currentView} />
          </div>
        </div>

        {recordsContent}

        {currentView === "grid" && totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-full px-4 py-2 border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`rounded-full w-10 h-10 text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "bg-ocean-blue text-white"
                        : "border border-border text-text-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-full px-4 py-2 border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
