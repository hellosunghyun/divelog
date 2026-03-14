import type { Route } from "./+types/_public.logs._index";
import { db } from "../db/client.server";
import { records, stages, learnerProfiles } from "../db/schema.server";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import FilterBar from "../components/FilterBar";
import SortBar from "../components/SortBar";
import EmptyState from "../components/EmptyState";
import HeroSection from "../components/HeroSection";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "기록 — divelog" },
    { name: "description", content: "ADA Learner들의 기록 모음" },
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
  if (rhythm && (rhythm === "sprint" || rhythm === "weekly" || rhythm === "monthly" || rhythm === "free")) {
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

  return { records: filteredRecords, allStages, page, filters: { stageId, format, type, rhythm, sort } };
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
      { value: "sprint", label: "스프린트" },
      { value: "weekly", label: "주간" },
      { value: "monthly", label: "월간" },
      { value: "free", label: "자유" },
    ],
  },
];

export default function LogsPage({ loaderData }: Route.ComponentProps) {
  const { records: filteredRecords, allStages } = loaderData;

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
        subtitle="Learner들이 남긴 탐구의 기록들"
      />

      <div className="max-w-content mx-auto px-4 py-8 md:py-12">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <FilterBar filters={allFilters} />
          <SortBar />
        </div>

        {filteredRecords.length === 0 ? (
          <EmptyState variant="records" message="조건에 맞는 기록이 없습니다." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                author={
                  record.author.displayName
                    ? {
                        displayName: record.author.displayName,
                        slug: record.author.slug ?? "",
                      }
                    : undefined
                }
                stage={
                  record.stage.name
                    ? {
                        name: record.stage.name,
                        type: record.stage.type ?? "",
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
