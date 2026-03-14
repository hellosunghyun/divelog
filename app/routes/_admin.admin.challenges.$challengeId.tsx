import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.challenges.$challengeId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const ch = await db(context.cloudflare.env.DB).select().from(challenges).where(eq(challenges.id, params.challengeId)).limit(1);
  if (!ch[0]) throw data("Challenge not found", { status: 404 });
  return { challenge: ch[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(challenges).set({ name: f.get("name") as string, problemDefinition: (f.get("problemDefinition") as string) || null, currentQuestion: (f.get("currentQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(challenges.id, params.challengeId));
  throw redirect("/admin/challenges");
}
export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 편집" }]; }
export default function AdminChallengeEditPage({ loaderData }: Route.ComponentProps) {
  const { challenge } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/challenges" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">챌린지 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-4 max-w-xl bg-admin-surface rounded-md p-6 border border-admin-border">
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">이름</label>
          <input name="name" defaultValue={challenge.name} required className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm focus:ring-2 focus:ring-admin-accent outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">문제 정의</label>
          <textarea name="problemDefinition" defaultValue={challenge.problemDefinition ?? ""} rows={3} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm resize-y outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">현재 질문</label>
          <input name="currentQuestion" defaultValue={challenge.currentQuestion ?? ""} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs text-admin-text-secondary mb-1.5">상태</label>
          <select name="status" defaultValue={challenge.status} className="w-full px-3 py-2 rounded-sm border border-admin-border bg-admin-surface text-sm outline-none">
            <option value="active">진행 중</option>
            <option value="completed">완료</option>
            <option value="archived">아카이브</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2 rounded-sm bg-admin-accent text-white border-none cursor-pointer text-sm hover:opacity-90">저장</button>
          <Link to="/admin/challenges" className="px-5 py-2 rounded-sm border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg">취소</Link>
        </div>
      </form>
    </div>
  );
}
