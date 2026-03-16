import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/roles";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { userRoles, learnerProfiles } from "~/db/schema.server";
import { asc, eq } from "drizzle-orm";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta(_: Route.MetaArgs) { return [{ title: "역할 & 권한" }]; }

export async function loader({ request, context }: Route.LoaderArgs) {
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">역할 & 권한</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-admin-surface rounded-md p-5 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4 text-admin-text">현재 역할</h3>
          {roles.length === 0 ? (
            <p className="text-meta text-admin-text-secondary">부여된 역할이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader className="bg-admin-bg">
                <TableRow className="border-admin-border hover:bg-admin-bg">
                  {["사용자", "역할", "작업"].map((header) => (
                    <TableHead
                      key={header}
                      className="h-auto px-3 py-2 text-caption text-admin-text-secondary"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(({ role, learner }: RoleRow) => (
                  <TableRow key={role.id} className="border-admin-border hover:bg-admin-bg/50">
                    <TableCell className="px-3 py-2">
                      <span className="block text-caption text-admin-text">
                        {userLabel(learner?.email ?? null, learner?.displayName ?? null, role.userId)}
                      </span>
                      {learner?.email && learner.displayName && (
                        <span className="text-[11px] text-admin-text-secondary">{learner.displayName}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-caption">
                      <Badge variant="outline">{ROLE_LABELS[role.role] ?? role.role}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <form method="post" className="inline">
                        <input type="hidden" name="id" value={role.id} />
                        <input type="hidden" name="intent" value="revoke" />
                        <Button type="submit" variant="destructive" size="sm">
                          회수
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="bg-admin-surface rounded-md p-5 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4 text-admin-text">역할 부여</h3>
          <form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="intent" value="grant" />
            <input type="hidden" name="userId" value={selectedUserId === "__none__" ? "" : selectedUserId} />
            <input type="hidden" name="role" value={selectedRole} />
            <div>
              <Label htmlFor="role-user" className="mb-2 block text-caption text-admin-text-secondary">
                사용자 (이메일)
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="role-user" className="h-10 rounded-md border-admin-border bg-admin-bg text-meta">
                  <SelectValue placeholder="선택하세요" />
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
            <div>
              <Label htmlFor="role-type" className="mb-2 block text-caption text-admin-text-secondary">
                역할
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role-type" className="h-10 rounded-md border-admin-border bg-admin-bg text-meta">
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
            <Button type="submit" disabled={selectedUserId === "__none__"} className="w-fit px-4 py-1.5 text-meta font-medium">
              부여
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
