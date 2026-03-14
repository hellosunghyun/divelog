import type { Route } from "./+types/_admin.admin.learners._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Learner 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { learners: await db(context.cloudflare.env.DB).select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName)) };
}
export default function AdminLearnersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>Learner 관리 ({loaderData.learners.length}명)</h2>
      {loaderData.learners.length === 0 ? (
        <EmptyState variant="generic" message="등록된 Learner가 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["이름", "Slug", "코호트", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.learners.map((l) => (<tr key={l.userId} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{l.displayName}</td><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>{l.slug}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{l.cohort ?? "-"}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/learners/${l.userId}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>상세</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
