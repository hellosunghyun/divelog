import { data, redirect } from "react-router";
import type { Route } from "./+types/$groupId";
import { Link } from "~/components/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { collaborationUnits } from "~/db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration.$groupId" });
  logger.info("loader_start");
  const unit = await db(context.cloudflare.env.DB).select().from(collaborationUnits).where(eq(collaborationUnits.id, params.groupId)).limit(1);
  if (!unit[0]) throw data("Collaboration unit not found", { status: 404 });
  return { unit: unit[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration.$groupId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_collaboration" });
  await db(context.cloudflare.env.DB).update(collaborationUnits).set({ status: f.get("status") as string, currentQuestion: (f.get("currentQuestion") as string) || null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collaborationUnits.id, params.groupId));
  logger.info("admin_update_collaboration", { groupId: params.groupId });
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
          <Label htmlFor="status" className="mb-2 block text-caption text-admin-text-secondary">상태</Label>
          <Select name="status" defaultValue={unit.status}>
            <SelectTrigger id="status" className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="forming">구성 중</SelectItem>
              <SelectItem value="active">탐구 중</SelectItem>
              <SelectItem value="restructured">재편성됨</SelectItem>
              <SelectItem value="archived">아카이브</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="currentQuestion" className="mb-2 block text-caption text-admin-text-secondary">현재 질문</Label>
          <Input
            id="currentQuestion"
            name="currentQuestion"
            defaultValue={unit.currentQuestion ?? ""}
            className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="rounded-lg bg-admin-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            저장
          </Button>
          <Link to="/admin/collaboration" className="px-5 py-2.5 rounded-lg border border-admin-border text-admin-text-secondary text-sm font-medium hover:bg-admin-bg transition-colors no-underline">취소</Link>
        </div>
      </form>
    </div>
  );
}
