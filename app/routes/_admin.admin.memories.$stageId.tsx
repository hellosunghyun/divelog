import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.memories.$stageId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { collectiveMemories } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.memories.$stageId" });
  logger.info("loader_start");
  const memory = await db(context.cloudflare.env.DB).select().from(collectiveMemories).where(eq(collectiveMemories.id, params.stageId)).limit(1);
  if (!memory[0]) throw data("Memory not found", { status: 404 });
  return { memory: memory[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.memories.$stageId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_memory" });
  await db(context.cloudflare.env.DB).update(collectiveMemories).set({ summary: (f.get("summary") as string) || null, carryForwardQuestion: (f.get("carryForwardQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collectiveMemories.id, params.stageId));
  logger.info("admin_update_memory", { stageId: params.stageId });
  throw redirect("/admin/memories");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Memory 편집" }]; }
export default function AdminMemoryEditPage({ loaderData }: Route.ComponentProps) {
  const { memory } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/memories" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">Memory 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-4 max-w-2xl bg-admin-surface rounded-md p-6 border border-admin-border">
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">요약</label>
          <textarea name="summary" defaultValue={memory.summary ?? ""} rows={8} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm resize-y outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">다음 질문</label>
          <input name="carryForwardQuestion" defaultValue={memory.carryForwardQuestion ?? ""} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">상태</label>
          <select name="status" defaultValue={memory.status} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm outline-none">
            <option value="draft">초안</option>
            <option value="published">발행</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2 rounded-sm bg-admin-accent text-white border-none cursor-pointer text-sm hover:opacity-90">저장</button>
          <Link to="/admin/memories" className="px-5 py-2 rounded-sm border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg">취소</Link>
        </div>
      </form>
    </div>
  );
}
