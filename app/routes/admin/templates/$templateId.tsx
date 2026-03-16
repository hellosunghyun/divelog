import { data, redirect } from "react-router";
import type { Route } from "./+types/$templateId";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { templates } from "~/db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.templates.$templateId" });
  logger.info("loader_start");
  const tmpl = await db(context.cloudflare.env.DB).select().from(templates).where(eq(templates.id, params.templateId)).limit(1);
  if (!tmpl[0]) throw data("Template not found", { status: 404 });
  return { template: tmpl[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.templates.$templateId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_template" });
  await db(context.cloudflare.env.DB).update(templates).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, promptBody: (f.get("promptBody") as string) || null, context: (f.get("ctx") as string) || null, form: (f.get("form") as string) || null, rhythm: (f.get("rhythm") as string) || null, active: f.get("active") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(templates.id, params.templateId));
  logger.info("admin_update_template", { templateId: params.templateId });
  throw redirect("/admin/templates");
}
export function meta(_: Route.MetaArgs) { return [{ title: "템플릿 편집" }]; }
export default function AdminTemplateEditPage({ loaderData }: Route.ComponentProps) {
  const { template } = loaderData;
  const labelClass = "block text-caption text-admin-text-secondary mb-1.5";
  const inputClass = "w-full px-3 py-2 rounded-md border border-admin-border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-admin-accent focus:ring-offset-1";
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/templates" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">템플릿 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-4 max-w-[700px] bg-admin-surface rounded-md p-6 border border-admin-border">
        <div>
          <label className={labelClass}>이름</label>
          <input name="name" defaultValue={template.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>설명</label>
          <input name="description" defaultValue={template.description ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>프롬프트 본문</label>
          <textarea name="promptBody" defaultValue={template.promptBody ?? ""} rows={6} className={`${inputClass} resize-y`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>유형</label>
            <select name="ctx" defaultValue={template.context ?? ""} className={inputClass}>
              <option value="">전체</option><option value="personal">개인</option><option value="challenge">챌린지</option><option value="collaboration">협업</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>형식</label>
            <select name="form" defaultValue={template.form ?? ""} className={inputClass}>
              <option value="">전체</option><option value="note">노트</option><option value="article">글</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>리듬</label>
            <select name="rhythm" defaultValue={template.rhythm ?? ""} className={inputClass}>
              <option value="">전체</option><option value="sprint">스프린트</option><option value="weekly">주간</option><option value="monthly">월간</option><option value="free">자유</option>
            </select>
          </div>
        </div>
        <div>
          <label className="flex gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="active" defaultChecked={template.active ?? true} className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent" />
            활성화
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2 rounded-md bg-admin-accent text-white text-sm font-medium hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-admin-accent">저장</button>
          <Link to="/admin/templates" className="px-5 py-2 rounded-md border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg transition-colors">취소</Link>
        </div>
      </form>
    </div>
  );
}
