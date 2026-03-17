import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { eq, desc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const RESPONSE_TYPE_LABELS: Record<string, string> = {
  resonance: "공명",
  question: "질문",
  connection: "연결",
  suggestion: "제안",
  self_answer: "자기답변",
};

const MODERATION_FILTERS = ["all", "clean", "flagged", "hidden"] as const;
type ModerationFilter = (typeof MODERATION_FILTERS)[number];

export function meta(_: Route.MetaArgs) {
  return [{ title: "Dialogue 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { responses, learnerProfiles, records, questions } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue" });
  logger.info("loader_start");

  const url = new URL(request.url);
  const moderationFilter = (url.searchParams.get("moderation") ?? "all") as ModerationFilter;
  const typeFilter = url.searchParams.get("type");

  const database = db(context.cloudflare.env.DB);

  const conditions = [];
  if (moderationFilter !== "all") {
    conditions.push(eq(responses.moderationStatus, moderationFilter));
  }
  if (typeFilter) {
    conditions.push(eq(responses.type, typeFilter));
  }

  const result = await database
    .select({
      response: responses,
      author: { displayName: learnerProfiles.displayName, slug: learnerProfiles.slug },
      record: { id: records.id, title: records.title, slug: records.slug },
    })
    .from(responses)
    .leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
    .leftJoin(records, eq(responses.recordId, records.id))
    .orderBy(desc(responses.createdAt))
    .limit(100);

  const filteredResult = conditions.length > 0
    ? result.filter((item) => {
        if (moderationFilter !== "all" && item.response.moderationStatus !== moderationFilter) return false;
        if (typeFilter && item.response.type !== typeFilter) return false;
        return true;
      })
    : result;

  return {
    responses: filteredResult,
    filters: {
      moderation: moderationFilter,
      type: typeFilter,
    },
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

const getTypeBadgeVariant = (
  type: string,
): "default" | "secondary" | "outline" => {
  switch (type) {
    case "resonance":
      return "default";
    case "question":
      return "secondary";
    case "connection":
      return "outline";
    case "suggestion":
      return "outline";
    case "self_answer":
      return "secondary";
    default:
      return "outline";
  }
};

export default function AdminDialoguePage({ loaderData }: Route.ComponentProps) {
  const { responses: responseList, filters } = loaderData;

  const buildFilterUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams();
    const modValue = key === "moderation" ? value : filters.moderation;
    const typeValue = key === "type" ? value : filters.type;

    if (modValue && modValue !== "all") params.set("moderation", modValue);
    if (typeValue) params.set("type", typeValue);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">Dialogue 관리</h2>
        <span className="text-sm text-admin-text-secondary">총 {responseList.length}건</span>
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
          <span className="text-xs text-admin-text-secondary">유형:</span>
          <div className="flex gap-1">
            <a
              href={buildFilterUrl("type", null)}
              className={`text-xs px-2.5 py-1 rounded no-underline transition-colors ${
                !filters.type
                  ? "bg-admin-accent text-white"
                  : "bg-admin-bg text-admin-text-secondary hover:bg-admin-border"
              }`}
            >
              전체
            </a>
            {Object.entries(RESPONSE_TYPE_LABELS).map(([key, label]) => (
              <a
                key={key}
                href={buildFilterUrl("type", key)}
                className={`text-xs px-2.5 py-1 rounded no-underline transition-colors ${
                  filters.type === key
                    ? "bg-admin-accent text-white"
                    : "bg-admin-bg text-admin-text-secondary hover:bg-admin-border"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {responseList.length === 0 ? (
        <EmptyState variant="generic" message="조건에 맞는 응답이 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  유형
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  내용
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  작성자
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  원문
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
              {responseList.map(({ response, author, record }) => (
                <TableRow key={response.id} className="hover:bg-admin-bg transition-colors">
                  <TableCell className="px-4 py-3">
                    <Badge variant={getTypeBadgeVariant(response.type)} className="text-xs">
                      {RESPONSE_TYPE_LABELS[response.type] ?? response.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-sm text-admin-text line-clamp-2 max-w-[300px]">
                      {response.content}
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
                    {record?.slug ? (
                      <Link
                        to={`/logs/${record.slug}`}
                        className="text-sm text-admin-text-secondary hover:text-admin-accent line-clamp-1 max-w-[150px]"
                      >
                        {record.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-admin-text-secondary">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={getModerationBadgeVariant(response.moderationStatus)} className="text-xs">
                      {response.moderationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link
                      to={`/admin/dialogue/${response.id}`}
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
