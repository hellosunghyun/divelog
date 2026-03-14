import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.dialogue.$responseId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { responses, records } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const response = await database.select().from(responses).where(eq(responses.id, params.responseId)).limit(1);
  if (!response[0]) throw data("Response not found", { status: 404 });
  const record = response[0].recordId ? await database.select().from(records).where(eq(records.id, response[0].recordId)).limit(1) : [];
  return { response: response[0], record: record[0] ?? null };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(responses).set({ moderationStatus: f.get("moderationStatus") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(responses.id, params.responseId));
  throw redirect("/admin/dialogue");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 검토" }]; }
export default function AdminDialogueDetailPage({ loaderData }: Route.ComponentProps) {
  const { response, record } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/dialogue" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">Dialogue 검토</h2>
      </div>
      {record && (
        <div className="bg-admin-surface rounded-md p-4 border border-admin-border mb-4">
          <p className="text-xs text-admin-text-secondary mb-1">원문 기록</p>
          <p className="text-[13px] text-admin-text">{record.title}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-admin-surface rounded-md p-4 border border-admin-border">
          <span className="text-xs text-admin-text-secondary">{response.type}</span>
          <p className="text-sm text-admin-text mt-2 leading-relaxed">{response.content}</p>
        </div>
        <form method="post" className="bg-admin-surface rounded-md p-4 border border-admin-border flex flex-col gap-2 h-fit">
          <label className="text-xs text-admin-text-secondary">Moderation</label>
          <select name="moderationStatus" defaultValue={response.moderationStatus ?? "clean"} className="px-2.5 py-1.5 rounded-sm border border-admin-border text-[13px] outline-none">
            <option value="clean">Clean</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
          <button type="submit" className="px-3 py-1.5 rounded-sm bg-admin-accent text-white border-none cursor-pointer text-[13px] hover:opacity-90">저장</button>
        </form>
      </div>
    </div>
  );
}
