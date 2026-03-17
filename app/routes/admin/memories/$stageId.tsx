import { data, redirect } from "react-router";
import type { Route } from "./+types/$stageId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { eq } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { collectiveMemories } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.memories.$stageId" });
  logger.info("loader_start");
  const memory = await db(context.cloudflare.env.DB).select().from(collectiveMemories).where(eq(collectiveMemories.id, params.stageId)).limit(1);
  if (!memory[0]) throw data("Memory not found", { status: 404 });
  return { memory: memory[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { collectiveMemories } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.memories.$stageId" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_memory" });
  await db(context.cloudflare.env.DB).update(collectiveMemories).set({ summary: (f.get("summary") as string) || null, carryForwardQuestion: (f.get("carryForwardQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collectiveMemories.id, params.stageId));
  logger.info("admin_update_memory", { stageId: params.stageId });
  throw redirect("/admin/memories");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Memory 편집" }]; }
export default function AdminMemoryEditPage({ loaderData }: Route.ComponentProps) {
  const { memory } = loaderData;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/memories" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">Memory 편집</h2>
      </div>
      <form method="post" className="flex flex-col gap-4 max-w-2xl bg-admin-surface rounded-md p-6 border border-admin-border">
        <div>
          <Label htmlFor="summary" className="mb-1.5 block text-xs text-admin-text-secondary">요약</Label>
          <Textarea id="summary" name="summary" defaultValue={memory.summary ?? ""} rows={8} className="min-h-0 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text" />
        </div>
        <div>
          <Label htmlFor="carryForwardQuestion" className="mb-1.5 block text-xs text-admin-text-secondary">다음 질문</Label>
          <Input id="carryForwardQuestion" name="carryForwardQuestion" defaultValue={memory.carryForwardQuestion ?? ""} className="h-10 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text" />
        </div>
        <div>
          <Label htmlFor="status" className="mb-1.5 block text-xs text-admin-text-secondary">상태</Label>
          <Select name="status" defaultValue={memory.status}>
            <SelectTrigger id="status" className="h-10 rounded-sm border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">초안</SelectItem>
              <SelectItem value="published">발행</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="rounded-sm bg-admin-accent px-5 py-2 text-sm text-white hover:opacity-90">저장</Button>
          <Link to="/admin/memories" className="px-5 py-2 rounded-sm border border-admin-border text-admin-text-secondary text-sm hover:bg-admin-bg">취소</Link>
        </div>
      </form>
    </div>
  );
}
