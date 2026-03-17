import type { Route } from "./+types/index";
import { Link } from "~/components/content/SmartLink";
import { eq, desc, and, inArray, SQL } from "drizzle-orm";
import EmptyState from "~/components/feedback/EmptyState";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const MODERATION_FILTERS = ["all", "clean", "flagged", "hidden"] as const;
type ModerationFilter = (typeof MODERATION_FILTERS)[number];

const VISIBILITY_OPTIONS = ["all", "draft", "cohort", "public"] as const;
type VisibilityFilter = (typeof VISIBILITY_OPTIONS)[number];

export function meta(_: Route.MetaArgs) {
  return [{ title: "기록 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { records, learnerProfiles, stages } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records" });
  logger.info("loader_start");

  const url = new URL(request.url);
  const moderationFilter = (url.searchParams.get("moderation") ?? "all") as ModerationFilter;
  const visibilityFilter = (url.searchParams.get("visibility") ?? "all") as VisibilityFilter;
  const stageFilter = url.searchParams.get("stage");

  const database = db(context.cloudflare.env.DB);

  const conditions: SQL<unknown>[] = [];

  if (moderationFilter !== "all") {
    conditions.push(eq(records.moderationStatus, moderationFilter));
  }

  if (visibilityFilter !== "all") {
    conditions.push(eq(records.visibility, visibilityFilter));
  }

  const result = await database
    .select({
      record: records,
      author: { displayName: learnerProfiles.displayName, slug: learnerProfiles.slug },
      stage: { name: stages.name, slug: stages.slug },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(records.createdAt))
    .limit(100);

  const allStages = await database.select().from(stages).orderBy(desc(stages.order));

  return {
    records: result,
    filters: {
      moderation: moderationFilter,
      visibility: visibilityFilter,
      stage: stageFilter,
    },
    stages: allStages,
  };
}

const getModerationBadgeVariant = (
  status: string,
): "destructive" | "secondary" | "outline" | "default" => {
  switch (status) {
    case "flagged":
      return "destructive";
    case "hidden":
      return "secondary";
    case "clean":
      return "outline";
    default:
      return "default";
  }
};

const getVisibilityBadgeVariant = (
  visibility: string,
): "default" | "secondary" | "outline" => {
  switch (visibility) {
    case "public":
      return "default";
    case "cohort":
      return "secondary";
    case "draft":
      return "outline";
    default:
      return "outline";
  }
};

export default function AdminRecordsPage({ loaderData }: Route.ComponentProps) {
  const { records: recordList, filters, stages } = loaderData;

  const buildFilterUrl = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "moderation" || value !== "all") params.set("moderation", key === "moderation" ? value : filters.moderation);
    if (key !== "visibility" || value !== "all") params.set("visibility", key === "visibility" ? value : filters.visibility);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">기록 관리</h2>
        <span className="text-sm text-admin-text-secondary">총 {recordList.length}건</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-admin-text-secondary">Moderation:</span>
          <div className="flex gap-1">
            {MODERATION_FILTERS.map((f) => (
              <a
                key={f}
                href={buildFilterUrl("moderation", f)}
                className={`text-xs px-2.5 py-1 rounded no-underline transition-colors ${
                  filters.moderation === f
                    ? "bg-admin-accent text-white"
                    : "bg-admin-bg text-admin-text-secondary hover:bg-admin-border"
                }`}
              >
                {f === "all" ? "전체" : f.charAt(0).toUpperCase() + f.slice(1)}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-admin-text-secondary">공개:</span>
          <div className="flex gap-1">
            {VISIBILITY_OPTIONS.map((v) => (
              <a
                key={v}
                href={buildFilterUrl("visibility", v)}
                className={`text-xs px-2.5 py-1 rounded no-underline transition-colors ${
                  filters.visibility === v
                    ? "bg-admin-accent text-white"
                    : "bg-admin-bg text-admin-text-secondary hover:bg-admin-border"
                }`}
              >
                {v === "all" ? "전체" : v}
              </a>
            ))}
          </div>
        </div>
      </div>

      {recordList.length === 0 ? (
        <EmptyState variant="generic" message="조건에 맞는 기록이 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  제목
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  작성자
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  Stage
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  형식
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  공개
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  Moderation
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  작업
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordList.map(({ record, author, stage }) => (
                <TableRow key={record.id} className="hover:bg-admin-bg transition-colors">
                  <TableCell className="px-4 py-3">
                    <span className="text-sm text-admin-text truncate block max-w-[200px]">
                      {record.title}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {author?.slug ? (
                      <Link
                        to={`/learners/${author.slug}`}
                        className="text-sm text-admin-text-secondary hover:text-admin-accent"
                      >
                        {author.displayName ?? "-"}
                      </Link>
                    ) : (
                      <span className="text-sm text-admin-text-secondary">
                        {author?.displayName ?? "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-sm text-admin-text-secondary">
                      {stage?.name ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {record.format}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={getVisibilityBadgeVariant(record.visibility)} className="text-xs">
                      {record.visibility}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={getModerationBadgeVariant(record.moderationStatus)} className="text-xs">
                      {record.moderationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link
                      to={`/admin/records/${record.id}`}
                      className="text-xs text-admin-accent hover:underline font-medium"
                    >
                      검토
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
