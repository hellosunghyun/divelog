import { data, redirect } from "react-router";
import type { Route } from "./+types/$recordId";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { records } from "~/db/schema.server";
import { getPlainText } from "~/lib/content.server";
import { normalizeContentFormat } from "~/lib/editor-extensions";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records.$recordId" });
  logger.info("loader_start");
  const record = await db(context.cloudflare.env.DB).select().from(records).where(eq(records.id, params.recordId)).limit(1);
  if (!record[0]) throw data("Record not found", { status: 404 });
  const plainTextPreview = getPlainText(record[0].content, normalizeContentFormat(record[0].format));
  return { record: record[0], plainTextPreview };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records.$recordId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "moderate_record" });
  const moderationStatus = f.get("moderationStatus") as string;
  const moderationNote = (f.get("note") as string) || null;
  await db(context.cloudflare.env.DB).update(records).set({ moderationStatus, moderationNote, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(records.id, params.recordId));
  logger.info("admin_moderate_record", { recordId: params.recordId, newStatus: moderationStatus });
  throw redirect("/admin/records");
}
export function meta(_: Route.MetaArgs) { return [{ title: "기록 검토" }]; }
export default function AdminRecordDetailPage({ loaderData }: Route.ComponentProps) {
  const { record, plainTextPreview } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/records" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">기록 검토</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-admin-surface rounded-md p-4 border border-admin-border">
          <h3 className="text-base font-semibold mb-3">{record.title}</h3>
          <p className="text-[13px] text-admin-text-secondary whitespace-pre-wrap leading-relaxed">{plainTextPreview.substring(0, 500)}{plainTextPreview.length > 500 ? "..." : ""}</p>
        </div>
        <form method="post" className="bg-admin-surface rounded-md p-4 border border-admin-border flex flex-col gap-2 h-fit">
          <label htmlFor="moderation-status" className="text-xs text-admin-text-secondary">Moderation</label>
          <select id="moderation-status" name="moderationStatus" defaultValue={record.moderationStatus ?? "clean"} className="px-2.5 py-1.5 rounded-sm border border-admin-border text-[13px] outline-none">
            <option value="clean">Clean</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
          <label htmlFor="moderation-note" className="text-xs text-admin-text-secondary">메모</label>
          <textarea id="moderation-note" name="note" placeholder="메모 (선택)" rows={2} defaultValue={record.moderationNote ?? ""} className="px-2.5 py-1.5 rounded-sm border border-admin-border text-[13px] resize-y outline-none" />
          <button type="submit" className="px-3 py-1.5 rounded-sm bg-admin-accent text-white border-none cursor-pointer text-[13px] hover:opacity-90">저장</button>
        </form>
      </div>
    </div>
  );
}
