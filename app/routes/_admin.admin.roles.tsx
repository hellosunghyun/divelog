import { redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.roles";
import { db } from "../db/client.server";
import { userRoles, learnerProfiles } from "../db/schema.server";
import { eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "역할 & 권한" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { roles: await db(context.cloudflare.env.DB).select({ role: userRoles, learner: { displayName: learnerProfiles.displayName, userId: learnerProfiles.userId } }).from(userRoles).leftJoin(learnerProfiles, eq(userRoles.userId, learnerProfiles.userId)) };
}
export async function action({ request, context }: Route.ActionArgs) {
  const f = await request.formData();
  const database = db(context.cloudflare.env.DB);
  const intent = f.get("intent");
  if (intent === "grant") {
    await database.insert(userRoles).values({ id: crypto.randomUUID(), userId: f.get("userId") as string, role: f.get("role") as string, grantedAt: Math.floor(Date.now() / 1000) });
  }
  if (intent === "revoke") {
    await database.delete(userRoles).where(eq(userRoles.id, f.get("id") as string));
  }
  throw redirect("/admin/roles");
}

const ROLE_LABELS: Record<string, string> = { admin: "관리자", operator: "운영자", curator: "큐레이터", moderator: "모더레이터", mentor_viewer: "멘토 뷰어", analytics_viewer: "애널리틱스 뷰어" };

export default function AdminRolesPage({ loaderData }: Route.ComponentProps) {
  const { roles } = loaderData;
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>역할 & 권한</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "var(--color-admin-text)" }}>현재 역할</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["사용자", "역할", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "var(--color-admin-text-secondary)" }}>{h}</th>)}</tr></thead>
            <tbody>{roles.map(({ role, learner }) => (<tr key={role.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "6px 8px", fontSize: "12px" }}>{learner?.displayName ?? role.userId.substring(0, 10)}</td><td style={{ padding: "6px 8px", fontSize: "12px" }}>{ROLE_LABELS[role.role] ?? role.role}</td><td style={{ padding: "6px 8px" }}><form method="post" style={{ display: "inline" }}><input type="hidden" name="id" value={role.id} /><input type="hidden" name="intent" value="revoke" /><button type="submit" style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "3px", border: "1px solid var(--color-error)", color: "var(--color-error)", background: "none", cursor: "pointer" }}>회수</button></form></td></tr>))}</tbody>
          </table>
        </div>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "var(--color-admin-text)" }}>역할 부여</h3>
          <form method="post" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="hidden" name="intent" value="grant" />
            <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "4px" }}>사용자 ID</label><input name="userId" required placeholder="usr-..." style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", fontSize: "13px", fontFamily: "inherit" }} /></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "4px" }}>역할</label><select name="role" style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", fontSize: "13px" }}>{Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <button type="submit" style={{ padding: "6px 16px", borderRadius: "4px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}>부여</button>
          </form>
        </div>
      </div>
    </div>
  );
}
