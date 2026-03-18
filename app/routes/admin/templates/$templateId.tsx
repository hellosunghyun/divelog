import { useState } from "react";
import { data, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/$templateId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { Spinner } from "~/components/feedback/Spinner";
import { eq } from "drizzle-orm";
import { requireRole } from "~/lib/auth/auth.middleware.server";

const ALL_VALUE = "__all__";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { templates } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.templates.$templateId" });
  logger.info("loader_start");
  const tmpl = await db(context.cloudflare.env.DB).select().from(templates).where(eq(templates.id, params.templateId)).limit(1);
  if (!tmpl[0]) throw data("Template not found", { status: 404 });
  return { template: tmpl[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  await requireRole(request, context, "admin");
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { templates } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.templates.$templateId" });
  const f = await request.formData();
  const intent = f.get("intent") as string;
  logger.info("action_start", { intent });

  if (intent === "delete") {
    await db(context.cloudflare.env.DB).delete(templates).where(eq(templates.id, params.templateId));
    logger.info("admin_delete_template", { templateId: params.templateId });
    throw redirect("/admin/templates");
  }

  await db(context.cloudflare.env.DB).update(templates).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, promptBody: (f.get("promptBody") as string) || null, context: (f.get("ctx") as string) || null, form: (f.get("form") as string) || null, rhythm: (f.get("rhythm") as string) || null, active: f.get("active") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(templates.id, params.templateId));
  logger.info("admin_update_template", { templateId: params.templateId });
  throw redirect("/admin/templates");
}
export function meta(_: Route.MetaArgs) { return [{ title: "템플릿 편집" }]; }
export default function AdminTemplateEditPage({ loaderData }: Route.ComponentProps) {
   const { template } = loaderData;
   const [contextValue, setContextValue] = useState(template.context ?? ALL_VALUE);
   const [formValue, setFormValue] = useState(template.form ?? ALL_VALUE);
   const [rhythmValue, setRhythmValue] = useState(template.rhythm ?? ALL_VALUE);
   const navigation = useNavigation();
   const isDeleting = navigation.state === "submitting" && navigation.formData?.get("intent") === "delete";
   return (
     <div>
       <div className="flex gap-4 items-center mb-6">
         <Link to="/admin/templates" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
         <h2 className="text-xl font-semibold text-admin-text">템플릿 편집</h2>
       </div>
       <form method="post" className="flex flex-col gap-4 max-w-[700px] bg-admin-surface rounded-md p-6 border border-admin-border">
         <input type="hidden" name="intent" value="update" />
         <div>
           <Label htmlFor="name" className="mb-1.5 block text-caption text-admin-text-secondary">이름</Label>
           <Input id="name" name="name" defaultValue={template.name} required className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text" />
         </div>
         <div>
           <Label htmlFor="description" className="mb-1.5 block text-caption text-admin-text-secondary">설명</Label>
           <Input id="description" name="description" defaultValue={template.description ?? ""} className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text" />
         </div>
         <div>
           <Label htmlFor="promptBody" className="mb-1.5 block text-caption text-admin-text-secondary">프롬프트 본문</Label>
           <Textarea id="promptBody" name="promptBody" defaultValue={template.promptBody ?? ""} rows={6} className="min-h-0 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text" />
         </div>
         <div className="grid grid-cols-3 gap-3">
           <div>
             <input type="hidden" name="ctx" value={contextValue === ALL_VALUE ? "" : contextValue} />
             <Label htmlFor="ctx" className="mb-1.5 block text-caption text-admin-text-secondary">유형</Label>
             <Select value={contextValue} onValueChange={setContextValue}>
               <SelectTrigger id="ctx" className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text">
                 <SelectValue placeholder="유형 선택" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_VALUE}>전체</SelectItem>
                 <SelectItem value="personal">개인</SelectItem>
                 <SelectItem value="challenge">챌린지</SelectItem>
                 {/* [COLLAB_DISABLED] <SelectItem value="collaboration">협업</SelectItem> */}
               </SelectContent>
             </Select>
           </div>
           <div>
             <input type="hidden" name="form" value={formValue === ALL_VALUE ? "" : formValue} />
             <Label htmlFor="form" className="mb-1.5 block text-caption text-admin-text-secondary">형식</Label>
             <Select value={formValue} onValueChange={setFormValue}>
               <SelectTrigger id="form" className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text">
                 <SelectValue placeholder="형식 선택" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_VALUE}>전체</SelectItem>
                 <SelectItem value="note">노트</SelectItem>
                 <SelectItem value="article">글</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div>
             <input type="hidden" name="rhythm" value={rhythmValue === ALL_VALUE ? "" : rhythmValue} />
             <Label htmlFor="rhythm" className="mb-1.5 block text-caption text-admin-text-secondary">리듬</Label>
             <Select value={rhythmValue} onValueChange={setRhythmValue}>
               <SelectTrigger id="rhythm" className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text">
                 <SelectValue placeholder="리듬 선택" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_VALUE}>전체</SelectItem>
                 <SelectItem value="sprint">스프린트</SelectItem>
                 <SelectItem value="weekly">주간</SelectItem>
                 <SelectItem value="monthly">월간</SelectItem>
                 <SelectItem value="free">자유</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
         <div>
           <div className="flex items-center gap-2">
             <Checkbox id="active" name="active" defaultChecked={template.active ?? true} className="border-admin-border data-[state=checked]:border-admin-accent data-[state=checked]:bg-admin-accent" />
             <Label htmlFor="active" className="cursor-pointer text-sm font-normal text-admin-text">활성화</Label>
           </div>
         </div>
         <div className="flex gap-3">
           <SubmitButton formDataMatch={{ intent: "update" }} loadingText="저장 중..." className="rounded-md bg-admin-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90" type="submit">저장</SubmitButton>
            <Link to="/admin/templates" className="inline-flex h-10 items-center justify-center px-5 py-2 rounded-md border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg transition-colors">취소</Link>
         </div>
       </form>
       <div className="mt-8 max-w-[700px] border border-error/30 rounded-md p-6 bg-error/5">
         <h3 className="text-sm font-semibold text-error mb-2">위험 영역</h3>
         <p className="text-sm text-admin-text-secondary mb-4">이 템플릿을 삭제하면 되돌릴 수 없습니다.</p>
         <form method="post">
           <input type="hidden" name="intent" value="delete" />
           <button
             type="submit"
             disabled={isDeleting}
             className="rounded-md bg-error px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             onClick={(e) => {
               if (!confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
                 e.preventDefault();
               }
             }}
           >
             {isDeleting ? <><Spinner size="sm" /> 템플릿 삭제 중...</> : "템플릿 삭제"}
           </button>
         </form>
       </div>
     </div>
   );
 }
