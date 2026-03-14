import type { Route } from "./+types/_admin.admin.challenges._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { challenges: await db(context.cloudflare.env.DB).select().from(challenges).orderBy(asc(challenges.name)) };
}
export default function AdminChallengesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>챌린지 관리</h2>
      {loaderData.challenges.length === 0 ? (
        <EmptyState variant="generic" message="등록된 챌린지가 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["이름", "상태", "코호트", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.challenges.map((c) => (<tr key={c.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{c.name}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{c.status}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{c.cohort ?? "-"}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/challenges/${c.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>편집</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
