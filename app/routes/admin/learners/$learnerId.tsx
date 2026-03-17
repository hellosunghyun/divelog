import { data, redirect } from "react-router";
import type { Route } from "./+types/$learnerId";
import { Link } from "~/components/content/SmartLink";
import { eq, desc } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ADMIN_ROLES, type AdminRole } from "~/db/queries/admin/ops/roles";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { learnerProfiles, records, questions, responses, stages } = await import("~/db/schema.server");
  const { adminGetUserRoles, adminAddUserRole, adminRemoveUserRole } = await import("~/db/queries/admin/ops/roles.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.learners.$learnerId" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const learner = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, params.learnerId))
    .limit(1);

  if (!learner[0]) {
    throw data("러너를 찾을 수 없습니다", { status: 404 });
  }

  const [lr, qs, rs, userRoleList, currentStage] = await Promise.all([
    database
      .select()
      .from(records)
      .where(eq(records.authorId, params.learnerId))
      .orderBy(desc(records.createdAt))
      .limit(20),
    database
      .select()
      .from(questions)
      .innerJoin(records, eq(questions.recordId, records.id))
      .where(eq(records.authorId, params.learnerId))
      .orderBy(desc(questions.createdAt))
      .limit(10),
    database
      .select()
      .from(responses)
      .where(eq(responses.authorId, params.learnerId))
      .orderBy(desc(responses.createdAt))
      .limit(10),
    adminGetUserRoles(context.cloudflare.env.DB, params.learnerId),
    learner[0].currentStageId
      ? database.select().from(stages).where(eq(stages.id, learner[0].currentStageId)).limit(1)
      : [],
  ]);

  return {
    learner: learner[0],
    records: lr,
    questions: qs.map((q) => q.questions),
    responses: rs,
    roles: userRoleList,
    currentStage: currentStage[0] ?? null,
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { learnerProfiles, records, questions, responses, stages } = await import("~/db/schema.server");
  const { adminGetUserRoles, adminAddUserRole, adminRemoveUserRole } = await import("~/db/queries/admin/ops/roles.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.learners.$learnerId" });
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  logger.info("action_start", { intent, learnerId: params.learnerId });

  if (intent === "add_role") {
    const role = formData.get("role") as AdminRole;
    if (role && ADMIN_ROLES.includes(role)) {
      await adminAddUserRole(context.cloudflare.env.DB, params.learnerId, role);
      logger.info("role_added", { role });
    }
  } else if (intent === "remove_role") {
    const role = formData.get("role") as AdminRole;
    if (role) {
      await adminRemoveUserRole(context.cloudflare.env.DB, params.learnerId, role);
      logger.info("role_removed", { role });
    }
  }

  throw redirect(`/admin/learners/${params.learnerId}`);
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "러너 상세" }];
}

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

const getRoleBadgeVariant = (role: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (role) {
    case "admin":
      return "destructive";
    case "operator":
      return "default";
    case "curator":
      return "secondary";
    default:
      return "outline";
  }
};

export default function AdminLearnerDetailPage({ loaderData }: Route.ComponentProps) {
  const { learner, records: lr, questions: qs, responses: rs, roles, currentStage } = loaderData;

  const availableRoles = ADMIN_ROLES.filter(
    (role: AdminRole) => !roles.some((ur) => ur.role === role),
  );

  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/learners" className="text-sm text-admin-text-secondary hover:text-admin-text transition-colors">
          ← 목록
        </Link>
        <h2 className="text-xl font-semibold text-admin-text">{learner.displayName}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-sm font-semibold mb-4 text-admin-text">프로필</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-admin-text-secondary">Slug:</span>
                <span className="ml-2 text-admin-text">{learner.slug}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">이메일:</span>
                <span className="ml-2 text-admin-text">{learner.email ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">코호트:</span>
                <span className="ml-2 text-admin-text">{learner.cohort ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">현재 Stage:</span>
                <span className="ml-2 text-admin-text">{currentStage?.name ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">현재 질문:</span>
                <span className="ml-2 text-admin-text">{learner.currentQuestion ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">기본 공개 범위:</span>
                <span className="ml-2 text-admin-text">{learner.defaultVisibility}</span>
              </div>
            </div>
          </div>

          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-sm font-semibold mb-4 text-admin-text">활동 요약</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-admin-bg rounded-lg">
                <div className="text-2xl font-semibold text-admin-text">{lr.length}</div>
                <div className="text-xs text-admin-text-secondary mt-1">기록</div>
              </div>
              <div className="p-4 bg-admin-bg rounded-lg">
                <div className="text-2xl font-semibold text-admin-text">{qs.length}</div>
                <div className="text-xs text-admin-text-secondary mt-1">질문</div>
              </div>
              <div className="p-4 bg-admin-bg rounded-lg">
                <div className="text-2xl font-semibold text-admin-text">{rs.length}</div>
                <div className="text-xs text-admin-text-secondary mt-1">응답</div>
              </div>
            </div>
          </div>

          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-sm font-semibold mb-4 text-admin-text">최근 기록</h3>
            {lr.length === 0 ? (
              <p className="text-sm text-admin-text-secondary">기록이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {lr.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex gap-3 py-2 border-b border-admin-border last:border-b-0">
                    <span className="text-sm text-admin-text flex-1 truncate">{r.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {r.visibility}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-sm font-semibold mb-4 text-admin-text">역할 관리</h3>

            <div className="space-y-3 mb-4">
              {roles.length === 0 ? (
                <p className="text-sm text-admin-text-secondary">할당된 역할이 없습니다</p>
              ) : (
                roles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-admin-bg rounded-lg">
                    <Badge variant={getRoleBadgeVariant(r.role)} className="text-xs">
                      {getRoleLabel(r.role)}
                    </Badge>
                    <form method="post">
                      <input type="hidden" name="intent" value="remove_role" />
                      <input type="hidden" name="role" value={r.role} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-admin-text-secondary hover:text-error"
                      >
                        제거
                      </Button>
                    </form>
                  </div>
                ))
              )}
            </div>

            {availableRoles.length > 0 && (
              <form method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="add_role" />
                <Select name="role">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {getRoleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" className="h-9 px-3 text-xs bg-admin-accent hover:opacity-90">
                  추가
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
