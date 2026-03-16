import { redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.roles";
import { db } from "../db/client.server";
import { userRoles, learnerProfiles } from "../db/schema.server";
import { asc, eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "역할 & 권한" }]; }

export async function loader({ context }: Route.LoaderArgs) {
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
  const f = await request.formData();
  const database = db(context.cloudflare.env.DB);
  const intent = f.get("intent");
  if (intent === "grant") {
    await database.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId: f.get("userId") as string,
      role: f.get("role") as string,
      grantedAt: Math.floor(Date.now() / 1000),
    });
  }
  if (intent === "revoke") {
    await database.delete(userRoles).where(eq(userRoles.id, f.get("id") as string));
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

function userLabel(email: string | null, displayName: string | null, userId: string): string {
  if (email) return email;
  if (displayName) return displayName;
  return userId.substring(0, 12) + "…";
}

export default function AdminRolesPage({ loaderData }: Route.ComponentProps) {
  const { roles, allLearners } = loaderData;
  const labelClass = "block text-caption text-admin-text-secondary mb-1";
  const inputClass = "w-full px-3 py-1.5 rounded-md border border-admin-border text-meta font-sans focus:outline-none focus:ring-2 focus:ring-admin-accent";

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">역할 & 권한</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-admin-surface rounded-md p-5 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4 text-admin-text">현재 역할</h3>
          {roles.length === 0 ? (
            <p className="text-meta text-admin-text-secondary">부여된 역할이 없습니다.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["사용자", "역할", "작업"].map((h) => (
                    <th key={h} className="text-left px-2 py-1.5 text-caption text-admin-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map(({ role, learner }) => (
                  <tr key={role.id} className="border-b border-admin-border">
                    <td className="px-2 py-1.5">
                      <span className="text-caption text-admin-text block">{userLabel(learner?.email ?? null, learner?.displayName ?? null, role.userId)}</span>
                      {learner?.email && learner.displayName && (
                        <span className="text-[11px] text-admin-text-secondary">{learner.displayName}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-caption">{ROLE_LABELS[role.role] ?? role.role}</td>
                    <td className="px-2 py-1.5">
                      <form method="post" className="inline">
                        <input type="hidden" name="id" value={role.id} />
                        <input type="hidden" name="intent" value="revoke" />
                        <button type="submit" className="text-caption px-1.5 py-0.5 rounded border border-error text-error bg-transparent hover:bg-error/10 transition-colors cursor-pointer">회수</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-admin-surface rounded-md p-5 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4 text-admin-text">역할 부여</h3>
          <form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="intent" value="grant" />
            <div>
              <label htmlFor="role-user" className={labelClass}>사용자 (이메일)</label>
              <select id="role-user" name="userId" required className={inputClass}>
                <option value="">선택하세요</option>
                {allLearners.map((l) => (
                  <option key={l.userId} value={l.userId}>
                    {l.email ? `${l.email} (${l.displayName})` : `${l.displayName} (${l.userId.substring(0, 12)}…)`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="role-type" className={labelClass}>역할</label>
              <select id="role-type" name="role" className={inputClass}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <button type="submit" className="px-4 py-1.5 rounded-md bg-admin-accent text-white text-meta font-medium hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-admin-accent cursor-pointer">부여</button>
          </form>
        </div>
      </div>
    </div>
  );
}
