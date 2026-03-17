import { data, redirect } from "react-router";
import type { Route } from "./+types/$stageId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { stages } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.stages.$stageId" });
  logger.info("loader_start");
  const stage = await db(context.cloudflare.env.DB).select().from(stages).where(eq(stages.id, params.stageId)).limit(1);
  if (!stage[0]) throw data("Stage not found", { status: 404 });
  return { stage: stage[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { stages } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.stages.$stageId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_stage" });
  await db(context.cloudflare.env.DB).update(stages).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, status: f.get("status") as string, isCurrent: f.get("isCurrent") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(stages.id, params.stageId));
  logger.info("admin_update_stage", { stageId: params.stageId });
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
          <Label htmlFor="name" className="mb-1.5 block text-xs text-admin-text-secondary">이름</Label>
          <Input
            id="name"
            name="name"
            defaultValue={stage.name}
            required
            className="h-10 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="description" className="mb-1.5 block text-xs text-admin-text-secondary">설명</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={stage.description ?? ""}
            rows={3}
            className="min-h-0 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="status" className="mb-1.5 block text-xs text-admin-text-secondary">상태</Label>
          <Select name="status" defaultValue={stage.status}>
            <SelectTrigger id="status" className="h-10 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">예정</SelectItem>
              <SelectItem value="active">진행 중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isCurrent"
              name="isCurrent"
              defaultChecked={stage.isCurrent ?? false}
              className="border-admin-border data-[state=checked]:border-admin-accent data-[state=checked]:bg-admin-accent"
            />
            <Label htmlFor="isCurrent" className="cursor-pointer text-sm font-normal text-admin-text">
              현재 Stage로 설정
            </Label>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="rounded-sm bg-admin-accent px-5 py-2 text-sm text-white hover:opacity-90">
            저장
          </Button>
          <Link to="/admin/stages" className="px-5 py-2 rounded-sm border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg">취소</Link>
        </div>
      </form>
    </div>
  );
}
