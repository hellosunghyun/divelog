import type { Route } from "./+types/_admin.admin.memories._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collectiveMemories, stages } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Collective Memory" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { memories: await db(context.cloudflare.env.DB).select({ memory: collectiveMemories, stage: { name: stages.name, slug: stages.slug } }).from(collectiveMemories).leftJoin(stages, eq(collectiveMemories.stageId, stages.id)).orderBy(desc(collectiveMemories.createdAt)) };
}
export default function AdminMemoriesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>Collective Memory</h2>
      {loaderData.memories.length === 0 ? (
        <EmptyState variant="generic" message="Collective Memory가 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["Stage", "상태", "코호트", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.memories.map(({ memory, stage }) => (<tr key={memory.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{stage?.name ?? "-"}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{memory.status}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{memory.cohort ?? "-"}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/memories/${memory.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>편집</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
