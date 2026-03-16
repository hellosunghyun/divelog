import { data, redirect } from "react-router";
import type { Route } from "./+types/$responseId";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { responses, records } from "~/db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue.$responseId" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const response = await database.select().from(responses).where(eq(responses.id, params.responseId)).limit(1);
  if (!response[0]) throw data("Response not found", { status: 404 });
  const record = response[0].recordId ? await database.select().from(records).where(eq(records.id, response[0].recordId)).limit(1) : [];
  return { response: response[0], record: record[0] ?? null };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue.$responseId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "moderate_response" });
  const moderationStatus = f.get("moderationStatus") as string;
  await db(context.cloudflare.env.DB).update(responses).set({ moderationStatus, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(responses.id, params.responseId));
  logger.info("admin_moderate_response", { responseId: params.responseId, newStatus: moderationStatus });
  throw redirect("/admin/dialogue");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 검토" }]; }
export default function AdminDialogueDetailPage({ loaderData }: Route.ComponentProps) {
  const { response, record } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/dialogue" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">Dialogue 검토</h2>
      </div>
      {record && (
        <div className="bg-admin-surface rounded-lg p-5 border border-admin-border mb-4">
          <p className="text-caption text-admin-text-secondary mb-1">원문 기록</p>
          <p className="text-meta text-admin-text">{record.title}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-admin-surface rounded-lg p-5 border border-admin-border">
          <span className="text-caption text-admin-text-secondary">{response.type}</span>
          <p className="text-sm text-admin-text mt-2 leading-relaxed">{response.content}</p>
        </div>
        <form method="post" className="bg-admin-surface rounded-lg p-5 border border-admin-border flex flex-col gap-3 h-fit">
          <label htmlFor="moderationStatus" className="text-caption font-medium text-admin-text-secondary">Moderation</label>
          <select id="moderationStatus" name="moderationStatus" defaultValue={response.moderationStatus ?? "clean"} className="w-full px-3 py-2.5 rounded-md border border-admin-border text-meta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">
            <option value="clean">Clean</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
          <button type="submit" className="px-5 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2">저장</button>
        </form>
      </div>
    </div>
  );
}
