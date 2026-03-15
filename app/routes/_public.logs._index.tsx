import type { Route } from "./+types/_public.logs._index";
import { useSearchParams } from "react-router";
import { db } from "../db/client.server";
import { records, stages, learnerProfiles } from "../db/schema.server";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import FilterBar from "../components/FilterBar";
import SortBar from "../components/SortBar";
import ViewToggle from "../components/ViewToggle";
import TimelineView from "../components/TimelineView";
import EmptyState from "../components/EmptyState";
import HeroSection from "../components/HeroSection";
import { getPlainText } from "../lib/content.server";
import { normalizeContentFormat } from "../lib/editor-extensions";

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    { title: "기록 — divelog" },
    { name: "description", content: loaderData?.metaDescription ?? "ADA Learner들의 기록 모음" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const stageId = url.searchParams.get("stage") ?? undefined;
  const format = url.searchParams.get("format") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const rhythm = url.searchParams.get("rhythm") ?? undefined;
  const sort = url.searchParams.get("sort") ?? "recent";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  const database = db(context.cloudflare.env.DB);

  const conditions = [ne(records.visibility, "draft")];
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

  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const orderBy = sort === "oldest" ? records.createdAt : desc(records.createdAt);

  const [filteredRecords, allStages] = await Promise.all([
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
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .leftJoin(stages, eq(records.stageId, stages.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    database
      .select({ id: stages.id, name: stages.name })
      .from(stages)
      .orderBy(sql`"order" ASC`),
  ]);

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
    : "ADA Learner들의 기록 모음";

  return {
    records: recordsWithSnippets,
    allStages,
    page,
    filters: { stageId, format, type, rhythm, sort },
    metaDescription,
  };
}

const FILTER_OPTIONS = [
  {
    key: "format",
    label: "형식",
    values: [
      { value: "note", label: "노트" },
      { value: "article", label: "글" },
    ],
  },
  {
    key: "type",
    label: "유형",
    values: [
      { value: "personal", label: "개인" },
      { value: "challenge", label: "챌린지" },
      { value: "collaboration", label: "협업" },
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
  const { records: filteredRecords, allStages } = loaderData;
  const [searchParams] = useSearchParams();

  const viewParam = searchParams.get("view");
  const currentView = viewParam === "timeline" ? "timeline" : "grid";

  const stageFilterOptions = allStages.map((s) => ({ value: s.id, label: s.name }));

  const allFilters = [
    { key: "stage", label: "Stage", values: stageFilterOptions },
    ...FILTER_OPTIONS,
  ];

  return (
    <div>
      <HeroSection
        variant="stage"
        title="기록"
        subtitle="러너들이 남긴 탐구의 기록들"
      />

      <div className="max-w-content mx-auto px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <FilterBar filters={allFilters} />
          <div className="flex items-center gap-3">
            <SortBar />
            <ViewToggle currentView={currentView} />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <EmptyState variant="records" message="조건에 맞는 기록이 없습니다." />
        ) : (
          currentView === "timeline" ? (
            <TimelineView records={filteredRecords} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecords.map((record) => (
                <SceneCard
                  key={record.id}
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
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
