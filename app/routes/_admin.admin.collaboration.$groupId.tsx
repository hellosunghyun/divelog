import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.collaboration.$groupId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collaborationUnits } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const unit = await db(context.cloudflare.env.DB).select().from(collaborationUnits).where(eq(collaborationUnits.id, params.groupId)).limit(1);
  if (!unit[0]) throw data("Collaboration unit not found", { status: 404 });
  return { unit: unit[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(collaborationUnits).set({ status: f.get("status") as string, currentQuestion: (f.get("currentQuestion") as string) || null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collaborationUnits.id, params.groupId));
  throw redirect("/admin/collaboration");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export default function AdminCollaborationDetailPage({ loaderData }: Route.ComponentProps) {
  const { unit } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/collaboration" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">{unit.name}</h2>
      </div>
      <form method="post" className="flex flex-col gap-5 max-w-md bg-admin-surface rounded-lg p-6 border border-admin-border">
        <div>
          <label htmlFor="status" className="block text-caption font-medium text-admin-text-secondary mb-2">상태</label>
          <select id="status" name="status" defaultValue={unit.status} className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">
            <option value="forming">구성 중</option>
            <option value="active">탐구 중</option>
            <option value="restructured">재편성됨</option>
            <option value="archived">아카이브</option>
          </select>
        </div>
        <div>
          <label htmlFor="currentQuestion" className="block text-caption font-medium text-admin-text-secondary mb-2">현재 질문</label>
          <input id="currentQuestion" name="currentQuestion" defaultValue={unit.currentQuestion ?? ""} className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">저장</button>
          <Link to="/admin/collaboration" className="px-5 py-2.5 rounded-lg border border-admin-border text-admin-text-secondary text-sm font-medium hover:bg-admin-bg transition-colors no-underline">취소</Link>
        </div>
      </form>
    </div>
  );
}
