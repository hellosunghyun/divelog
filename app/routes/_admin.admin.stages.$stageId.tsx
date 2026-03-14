import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.stages.$stageId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const stage = await db(context.cloudflare.env.DB).select().from(stages).where(eq(stages.id, params.stageId)).limit(1);
  if (!stage[0]) throw data("Stage not found", { status: 404 });
  return { stage: stage[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(stages).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, status: f.get("status") as string, isCurrent: f.get("isCurrent") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(stages.id, params.stageId));
  throw redirect("/admin/stages");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Stage 편집" }]; }
export default function AdminStageEditPage({ loaderData }: Route.ComponentProps) {
  const { stage } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/stages" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← Stage 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">Stage 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-4 max-w-xl bg-admin-surface rounded-md p-6 border border-admin-border">
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">이름</label>
          <input name="name" defaultValue={stage.name} required className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm focus:ring-2 focus:ring-admin-accent outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">설명</label>
          <textarea name="description" defaultValue={stage.description ?? ""} rows={3} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm resize-y outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">상태</label>
          <select name="status" defaultValue={stage.status} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm outline-none">
            <option value="upcoming">예정</option>
            <option value="active">진행 중</option>
            <option value="completed">완료</option>
          </select>
        </div>
        <div>
          <label className="flex gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="isCurrent" defaultChecked={stage.isCurrent ?? false} className="accent-admin-accent" />
            현재 Stage로 설정
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2 rounded-sm bg-admin-accent text-white border-none cursor-pointer text-sm hover:opacity-90">저장</button>
          <Link to="/admin/stages" className="px-5 py-2 rounded-sm border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg">취소</Link>
        </div>
      </form>
    </div>
  );
}
