import { redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.curation";
import { db } from "../db/client.server";
import { curationSlots } from "../db/schema.server";
import { desc, eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "큐레이션" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { slots: await db(context.cloudflare.env.DB).select().from(curationSlots).orderBy(desc(curationSlots.position)) };
}
export async function action({ request, context }: Route.ActionArgs) {
  const f = await request.formData();
  const intent = f.get("intent");
  const database = db(context.cloudflare.env.DB);
  if (intent === "pin") {
    await database.update(curationSlots).set({ pinned: true, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "hide") {
    await database.update(curationSlots).set({ hidden: true, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "unpin") {
    await database.update(curationSlots).set({ pinned: false, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "unhide") {
    await database.update(curationSlots).set({ hidden: false, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  throw redirect("/admin/curation");
}
export default function AdminCurationPage({ loaderData }: Route.ComponentProps) {
  const { slots } = loaderData;
  const SLOT_TYPE_LABELS: Record<string, string> = { scene: "장면", question: "질문", sentence: "문장", learner: "Learner", stage_featured: "Stage 특집" };
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>큐레이션</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
        <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["슬롯 유형", "대상 ID", "순서", "고정", "숨김", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
        <tbody>{slots.map((s) => (<tr key={s.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}>
          <td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{SLOT_TYPE_LABELS[s.slotType] ?? s.slotType}</td>
          <td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text-secondary)", fontFamily: "monospace" }}>{s.targetId.substring(0, 12)}...</td>
          <td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.position}</td>
          <td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.pinned ? "✓" : ""}</td>
          <td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.hidden ? "✓" : ""}</td>
          <td style={{ padding: "10px 16px", display: "flex", gap: "8px" }}>
            <form method="post" style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="intent" value={s.pinned ? "unpin" : "pin"} /><button type="submit" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", cursor: "pointer", backgroundColor: "var(--color-admin-surface)" }}>{s.pinned ? "고정 해제" : "고정"}</button></form>
            <form method="post" style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="intent" value={s.hidden ? "unhide" : "hide"} /><button type="submit" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", cursor: "pointer", backgroundColor: "var(--color-admin-surface)" }}>{s.hidden ? "표시" : "숨김"}</button></form>
          </td>
        </tr>))}</tbody>
      </table>
    </div>
  );
}
