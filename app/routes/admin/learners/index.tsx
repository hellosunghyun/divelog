import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { asc, eq, desc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";

export function meta(_: Route.MetaArgs) {
  return [{ title: "러너 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { learnerProfiles, userRoles, stages } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.learners" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const learners = await database
    .select()
    .from(learnerProfiles)
    .orderBy(asc(learnerProfiles.displayName));

  const allRoles = await database.select().from(userRoles);

  const learnerRolesMap = new Map<string, string[]>();
  for (const r of allRoles) {
    const existing = learnerRolesMap.get(r.userId) ?? [];
    existing.push(r.role);
    learnerRolesMap.set(r.userId, existing);
  }

  const currentStageIds = [...new Set(learners.filter((l: typeof learners[0]) => l.currentStageId).map((l: typeof learners[0]) => l.currentStageId))];
  const stageMap = new Map<string, string>();
  if (currentStageIds.length > 0) {
    const stageResults = await database.select().from(stages).where(eq(stages.id, currentStageIds[0]!));
    for (const s of stageResults) {
      stageMap.set(s.id, s.name);
    }
  }

  return {
    learners: learners.map((l) => ({
      ...l,
      roles: learnerRolesMap.get(l.userId) ?? [],
      currentStageName: l.currentStageId ? stageMap.get(l.currentStageId) ?? null : null,
    })),
  };
}

export default function AdminLearnersPage({ loaderData }: Route.ComponentProps) {
  const { learners } = loaderData;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "operator":
        return "default";
      case "curator":
        return "secondary";
      case "moderator":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      operator: "운영자",
      curator: "큐레이터",
      moderator: "모더레이터",
      mentor_viewer: "멘토",
      analytics_viewer: "분석",
    };
    return labels[role] ?? role;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">러너 관리</h2>
        <span className="text-sm text-admin-text-secondary">총 {learners.length}명</span>
      </div>

      {learners.length === 0 ? (
        <EmptyState variant="generic" message="등록된 러너가 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  이름
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  이메일
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  코호트
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  현재 Stage
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  역할
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-admin-text-secondary">
                  작업
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((l) => (
                <TableRow key={l.userId} className="hover:bg-admin-bg transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {l.profilePhotoUrl ? (
                        <img
                          src={l.profilePhotoUrl}
                          alt={l.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-admin-bg flex items-center justify-center text-xs text-admin-text-secondary">
                          {l.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-admin-text">{l.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-admin-text-secondary">
                    {l.email ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-admin-text-secondary">
                    {l.cohort ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-admin-text-secondary">
                    {l.currentStageName ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.roles.length === 0 ? (
                        <span className="text-xs text-admin-text-secondary">-</span>
                      ) : (
                        l.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                            {getRoleLabel(role)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link
                      to={`/admin/learners/${l.userId}`}
                      className="text-xs text-admin-accent hover:underline font-medium"
                    >
                      상세
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
