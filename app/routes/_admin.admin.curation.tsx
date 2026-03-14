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
      <h2 className="text-xl font-semibold text-admin-text mb-6">큐레이션</h2>
      <table className="w-full border-collapse bg-admin-surface rounded-md">
        <thead>
          <tr className="border-b border-admin-border">
            {["슬롯 유형", "대상 ID", "순서", "고정", "숨김", "작업"].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id} className="border-b border-admin-border">
              <td className="px-3 py-2 text-[13px] text-admin-text">{SLOT_TYPE_LABELS[s.slotType] ?? s.slotType}</td>
              <td className="px-3 py-2 text-[13px] text-admin-text-secondary font-mono">{s.targetId.substring(0, 12)}...</td>
              <td className="px-3 py-2 text-[13px]">{s.position}</td>
              <td className="px-3 py-2 text-[13px]">{s.pinned ? "✓" : ""}</td>
              <td className="px-3 py-2 text-[13px]">{s.hidden ? "✓" : ""}</td>
              <td className="px-3 py-2 flex gap-2">
                <form method="post" className="inline">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="intent" value={s.pinned ? "unpin" : "pin"} />
                  <button type="submit" className="text-[11px] px-2 py-0.5 rounded-sm border border-admin-border cursor-pointer bg-admin-surface hover:bg-admin-bg">{s.pinned ? "고정 해제" : "고정"}</button>
                </form>
                <form method="post" className="inline">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="intent" value={s.hidden ? "unhide" : "hide"} />
                  <button type="submit" className="text-[11px] px-2 py-0.5 rounded-sm border border-admin-border cursor-pointer bg-admin-surface hover:bg-admin-bg">{s.hidden ? "표시" : "숨김"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
