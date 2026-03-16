import { data, redirect } from "react-router";
import type { Route } from "./+types/$challengeId";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { challenges } from "~/db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges.$challengeId" });
  logger.info("loader_start");
  const ch = await db(context.cloudflare.env.DB).select().from(challenges).where(eq(challenges.id, params.challengeId)).limit(1);
  if (!ch[0]) throw data("Challenge not found", { status: 404 });
  return { challenge: ch[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges.$challengeId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_challenge" });
  await db(context.cloudflare.env.DB).update(challenges).set({ name: f.get("name") as string, problemDefinition: (f.get("problemDefinition") as string) || null, currentQuestion: (f.get("currentQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(challenges.id, params.challengeId));
  logger.info("admin_update_challenge", { challengeId: params.challengeId });
  throw redirect("/admin/challenges");
}
export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 편집" }]; }
export default function AdminChallengeEditPage({ loaderData }: Route.ComponentProps) {
  const { challenge } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/challenges" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">챌린지 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-5 max-w-xl bg-admin-surface rounded-lg p-6 border border-admin-border">
        <div>
          <label htmlFor="name" className="block text-caption font-medium text-admin-text-secondary mb-2">이름</label>
          <input id="name" name="name" defaultValue={challenge.name} required className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2" />
        </div>
        <div>
          <label htmlFor="problemDefinition" className="block text-caption font-medium text-admin-text-secondary mb-2">문제 정의</label>
          <textarea id="problemDefinition" name="problemDefinition" defaultValue={challenge.problemDefinition ?? ""} rows={3} className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2" />
        </div>
        <div>
          <label htmlFor="currentQuestion" className="block text-caption font-medium text-admin-text-secondary mb-2">현재 질문</label>
          <input id="currentQuestion" name="currentQuestion" defaultValue={challenge.currentQuestion ?? ""} className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2" />
        </div>
        <div>
          <label htmlFor="status" className="block text-caption font-medium text-admin-text-secondary mb-2">상태</label>
          <select id="status" name="status" defaultValue={challenge.status} className="w-full px-3 py-2.5 rounded-md border border-admin-border bg-admin-surface text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">
            <option value="active">진행 중</option>
            <option value="completed">완료</option>
            <option value="archived">아카이브</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">저장</button>
          <Link to="/admin/challenges" className="px-5 py-2.5 rounded-lg border border-admin-border text-admin-text-secondary text-sm font-medium hover:bg-admin-bg transition-colors no-underline">취소</Link>
        </div>
      </form>
    </div>
  );
}
