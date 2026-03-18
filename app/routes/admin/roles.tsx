import { useState } from "react";
import { redirect, useNavigation } from "react-router";
import type { Route } from "./+types/roles";
import { asc, eq } from "drizzle-orm";
import { Spinner } from "~/components/feedback/Spinner";
import {
  adminTableClass,
  adminThClass,
  adminTdClass,
  adminTrClass,
  adminLabelClass,
  adminBtnPrimary,
  adminBtnDanger,
  adminBtnSm,
  adminCardClass,
  adminCardHeaderClass,
  adminCardBodyClass,
  adminBadgeBase,
  adminBadgePrimary,
  adminEmptyStateClass,
  adminEmptyIconClass,
  adminEmptyTitleClass,
  adminEmptyDescClass,
} from "~/components/admin/admin-patterns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta(_: Route.MetaArgs) {
  return [{ title: "역할 & 권한" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { userRoles, learnerProfiles } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env as { LOG_LEVEL?: string }).child({ route: "admin.roles" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const [roles, allLearners] = await database.batch([
    database.select({
      role: userRoles,
      learner: {
        displayName: learnerProfiles.displayName,
        email: learnerProfiles.email,
        userId: learnerProfiles.userId,
      },
    }).from(userRoles).leftJoin(learnerProfiles, eq(userRoles.userId, learnerProfiles.userId)),
    database.select({
      userId: learnerProfiles.userId,
      displayName: learnerProfiles.displayName,
      email: learnerProfiles.email,
    }).from(learnerProfiles).orderBy(asc(learnerProfiles.displayName)),
  ]);
  return { roles, allLearners };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { userRoles, learnerProfiles } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env as { LOG_LEVEL?: string }).child({ route: "admin.roles" });
  const f = await request.formData();
  const database = db(context.cloudflare.env.DB);
  const intent = f.get("intent");
  logger.info("action_start", { intent });
  if (intent === "grant") {
    const targetUserId = f.get("userId") as string;
    const role = f.get("role") as string;
    await database.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      role,
      grantedAt: Math.floor(Date.now() / 1000),
    });
    logger.info("admin_role_change", { targetUserId, role, action: "grant" });
  }
  if (intent === "revoke") {
    const id = f.get("id") as string;
    const existingRole = await database.select().from(userRoles).where(eq(userRoles.id, id)).limit(1);
    await database.delete(userRoles).where(eq(userRoles.id, id));
    logger.info("admin_role_change", { targetUserId: existingRole[0]?.userId, role: existingRole[0]?.role, action: "revoke" });
  }
  throw redirect("/admin/roles");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  operator: "운영자",
  curator: "큐레이터",
  moderator: "모더레이터",
  mentor_viewer: "멘토 뷰어",
  analytics_viewer: "애널리틱스 뷰어",
};

type RoleRow = {
  role: typeof userRoles.$inferSelect;
  learner: {
    displayName: string | null;
    email: string | null;
    userId: string;
  } | null;
};

type LearnerOption = {
  userId: string;
  displayName: string | null;
  email: string | null;
};

function userLabel(email: string | null, displayName: string | null, userId: string): string {
  if (email) return email;
  if (displayName) return displayName;
  return userId.substring(0, 12) + "…";
}

export default function AdminRolesPage({ loaderData }: Route.ComponentProps) {
  const { roles, allLearners } = loaderData;
  const [selectedUserId, setSelectedUserId] = useState("__none__");
  const [selectedRole, setSelectedRole] = useState(Object.keys(ROLE_LABELS)[0] ?? "admin");
  const navigation = useNavigation();

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">역할 & 권한</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={adminCardClass}>
          <div className={adminCardHeaderClass}>
            <h3 className="text-sm font-semibold text-admin-text">현재 역할</h3>
            <span className="text-caption text-admin-text-secondary tabular-nums">
              {roles.length}개
            </span>
          </div>
          <div className={adminCardBodyClass}>
            {roles.length === 0 ? (
              <div className={adminEmptyStateClass}>
                <svg className={adminEmptyIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className={adminEmptyTitleClass}>부여된 역할이 없습니다</p>
                <p className={adminEmptyDescClass}>오른쪽에서 역할을 부여하세요</p>
              </div>
            ) : (
              <table className={adminTableClass}>
                <thead>
                  <tr>
                    {["사용자", "역할", "부여일", "작업"].map((header) => (
                      <th key={header} className={adminThClass}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map(({ role, learner }: RoleRow) => {
                    const isRevokingThisRow =
                      navigation.state === "submitting" &&
                      navigation.formData?.get("intent") === "revoke" &&
                      navigation.formData?.get("id") === role.id;
                    return (
                      <tr key={role.id} className={adminTrClass}>
                        <td className={adminTdClass}>
                          <div>
                            <span className="block text-caption font-medium text-admin-text">
                              {userLabel(learner?.email ?? null, learner?.displayName ?? null, role.userId)}
                            </span>
                            {learner?.email && learner.displayName && (
                              <span className="text-[11px] text-admin-text-secondary">
                                {learner.displayName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={adminTdClass}>
                          <span className={`${adminBadgeBase} ${adminBadgePrimary}`}>
                            {ROLE_LABELS[role.role] ?? role.role}
                          </span>
                        </td>
                        <td className={`${adminTdClass} text-admin-text-secondary tabular-nums`}>
                          {new Date(role.grantedAt * 1000).toLocaleDateString("ko-KR")}
                        </td>
                        <td className={adminTdClass}>
                          <form method="post" className="inline">
                            <input type="hidden" name="id" value={role.id} />
                            <input type="hidden" name="intent" value="revoke" />
                            <button
                              type="submit"
                              disabled={isRevokingThisRow}
                              className={`${adminBtnDanger} ${adminBtnSm} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isRevokingThisRow ? (
                                <>
                                  <Spinner size="sm" /> 회수 중...
                                </>
                              ) : (
                                "회수"
                              )}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={adminCardClass}>
          <div className={adminCardHeaderClass}>
            <h3 className="text-sm font-semibold text-admin-text">역할 부여</h3>
          </div>
          <div className={adminCardBodyClass}>
            <form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="grant" />
              <input type="hidden" name="userId" value={selectedUserId === "__none__" ? "" : selectedUserId} />
              <input type="hidden" name="role" value={selectedRole} />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="role-user" className={adminLabelClass}>
                  사용자 선택
                </label>
                <Select value={selectedUserId} onValueChange={(value: string) => setSelectedUserId(value)}>
                  <SelectTrigger id="role-user" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">선택하세요</SelectItem>
                    {allLearners.map((learner: LearnerOption) => (
                      <SelectItem key={learner.userId} value={learner.userId}>
                        {learner.email
                          ? `${learner.email} (${learner.displayName})`
                          : `${learner.displayName} (${learner.userId.substring(0, 12)}…)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="role-type" className={adminLabelClass}>
                  역할 선택
                </label>
                <Select value={selectedRole} onValueChange={(value: string) => setSelectedRole(value)}>
                  <SelectTrigger id="role-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={selectedUserId === "__none__" || navigation.state === "submitting"}
                  className={`${adminBtnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {navigation.state === "submitting" && navigation.formData?.get("intent") === "grant" ? (
                    <>
                      <Spinner size="sm" /> 부여 중...
                    </>
                  ) : (
                    "역할 부여"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <div className={adminCardHeaderClass}>
          <h3 className="text-sm font-semibold text-admin-text">역할 설명</h3>
        </div>
        <div className={adminCardBodyClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <div key={key} className="p-3 bg-admin-bg rounded-lg">
                <p className="text-caption font-medium text-admin-text mb-1">{label}</p>
                <p className="text-[11px] text-admin-text-secondary">
                  {key === "admin" && "모든 기능에 접근 가능"}
                  {key === "operator" && "Stage, Challenge, 기록 관리"}
                  {key === "curator" && "큐레이션 및 콘텐츠 관리"}
                  {key === "moderator" && "모더레이션 및 응답 관리"}
                  {key === "mentor_viewer" && "멘토링 데이터 조회"}
                  {key === "analytics_viewer" && "애널리틱스 조회만"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
