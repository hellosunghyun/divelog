import type { Route } from "./+types/_admin.admin.dialogue._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { responses, learnerProfiles } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { responses: await db(context.cloudflare.env.DB).select({ response: responses, author: { displayName: learnerProfiles.displayName } }).from(responses).leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId)).orderBy(desc(responses.createdAt)).limit(50) };
}
export default function AdminDialoguePage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>Dialogue 관리</h2>
      {loaderData.responses.length === 0 ? (
        <EmptyState variant="generic" message="응답이 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["유형", "내용", "작성자", "moderation", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.responses.map(({ response, author }) => (<tr key={response.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px" }}>{response.type}</td><td style={{ padding: "10px 16px", fontSize: "13px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{response.content}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{author?.displayName ?? "-"}</td><td style={{ padding: "10px 16px", fontSize: "13px", color: response.moderationStatus === "flagged" ? "var(--color-error)" : undefined }}>{response.moderationStatus}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/dialogue/${response.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>검토</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
