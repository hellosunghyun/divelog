import { data, redirect } from "react-router";
import type { Route } from "./+types/$groupId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { eq, count } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { collaborationUnits } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration.$groupId" });
  logger.info("loader_start");
  const unit = await db(context.cloudflare.env.DB).select().from(collaborationUnits).where(eq(collaborationUnits.id, params.groupId)).limit(1);
  if (!unit[0]) throw data("Collaboration unit not found", { status: 404 });
  return { unit: unit[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { collaborationUnits } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration.$groupId" });
  const f = await request.formData();
  const intent = f.get("intent") as string;
  logger.info("action_start", { intent });

  if (intent === "delete") {
    const { records } = await import("~/db/schema.server");
    const [result] = await db(context.cloudflare.env.DB).select({ cnt: count() }).from(records).where(eq(records.collaborationUnitId, params.groupId));
    if (result.cnt > 0) {
      return data({ error: `이 협업 그룹에 연결된 기록이 ${result.cnt}개 있어 삭제할 수 없습니다. 먼저 기록의 협업 그룹을 변경하세요.` }, { status: 400 });
    }
    await db(context.cloudflare.env.DB).delete(collaborationUnits).where(eq(collaborationUnits.id, params.groupId));
    logger.info("admin_delete_collaboration", { groupId: params.groupId });
    throw redirect("/admin/collaboration");
  }

  await db(context.cloudflare.env.DB).update(collaborationUnits).set({ status: f.get("status") as string, currentQuestion: (f.get("currentQuestion") as string) || null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collaborationUnits.id, params.groupId));
  logger.info("admin_update_collaboration", { groupId: params.groupId });
  throw redirect("/admin/collaboration");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export default function AdminCollaborationDetailPage({ loaderData, actionData }: Route.ComponentProps) {
  const { unit } = loaderData;
  const error = (actionData as { error?: string } | undefined)?.error;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/collaboration" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">{unit.name}</h2>
      </div>
      {error && (
        <div className="mb-4 max-w-md p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}
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
      <div className="mt-8 max-w-md border border-error/30 rounded-lg p-6 bg-error/5">
        <h3 className="text-sm font-semibold text-error mb-2">위험 영역</h3>
        <p className="text-sm text-admin-text-secondary mb-4">이 협업 그룹을 삭제하면 되돌릴 수 없습니다. 연결된 기록이 있으면 삭제할 수 없습니다.</p>
        <form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
            onClick={(e) => {
              if (!confirm("정말로 이 협업 그룹을 삭제하시겠습니까?")) {
                e.preventDefault();
              }
            }}
          >
            협업 그룹 삭제
          </button>
        </form>
      </div>
    </div>
  );
}
