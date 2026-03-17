import { data, redirect } from "react-router";
import type { Route } from "./+types/$challengeId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { eq, count } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { challenges } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges.$challengeId" });
  logger.info("loader_start");
  const ch = await db(context.cloudflare.env.DB).select().from(challenges).where(eq(challenges.id, params.challengeId)).limit(1);
  if (!ch[0]) throw data("Challenge not found", { status: 404 });
  return { challenge: ch[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { challenges } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges.$challengeId" });
  const f = await request.formData();
  const intent = f.get("intent") as string;
  logger.info("action_start", { intent });

  if (intent === "delete") {
    const { records } = await import("~/db/schema.server");
    const [result] = await db(context.cloudflare.env.DB).select({ cnt: count() }).from(records).where(eq(records.challengeId, params.challengeId));
    if (result.cnt > 0) {
      return data({ error: `이 챌린지에 연결된 기록이 ${result.cnt}개 있어 삭제할 수 없습니다. 먼저 기록의 챌린지를 변경하세요.` }, { status: 400 });
    }
    await db(context.cloudflare.env.DB).delete(challenges).where(eq(challenges.id, params.challengeId));
    logger.info("admin_delete_challenge", { challengeId: params.challengeId });
    throw redirect("/admin/challenges");
  }

  await db(context.cloudflare.env.DB).update(challenges).set({ name: f.get("name") as string, problemDefinition: (f.get("problemDefinition") as string) || null, currentQuestion: (f.get("currentQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(challenges.id, params.challengeId));
  logger.info("admin_update_challenge", { challengeId: params.challengeId });
  throw redirect("/admin/challenges");
}
export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 편집" }]; }
export default function AdminChallengeEditPage({ loaderData, actionData }: Route.ComponentProps) {
  const { challenge } = loaderData;
  const error = (actionData as { error?: string } | undefined)?.error;
  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/challenges" className="text-meta text-admin-text-secondary hover:text-admin-text transition-colors">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">챌린지 편집</h2>
      </div>
      {error && (
        <div className="mb-4 max-w-xl p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}
      <form method="post" className="flex flex-col gap-5 max-w-xl bg-admin-surface rounded-lg p-6 border border-admin-border">
        <div>
          <Label htmlFor="name" className="mb-2 block text-caption text-admin-text-secondary">이름</Label>
          <Input
            id="name"
            name="name"
            defaultValue={challenge.name}
            required
            className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text"
          />
        </div>
        <div>
          <Label htmlFor="problemDefinition" className="mb-2 block text-caption text-admin-text-secondary">문제 정의</Label>
          <Textarea
            id="problemDefinition"
            name="problemDefinition"
            defaultValue={challenge.problemDefinition ?? ""}
            rows={3}
            className="min-h-0 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text"
          />
        </div>
        <div>
          <Label htmlFor="currentQuestion" className="mb-2 block text-caption text-admin-text-secondary">현재 질문</Label>
          <Input
            id="currentQuestion"
            name="currentQuestion"
            defaultValue={challenge.currentQuestion ?? ""}
            className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text"
          />
        </div>
        <div>
          <Label htmlFor="status" className="mb-2 block text-caption text-admin-text-secondary">상태</Label>
          <Select name="status" defaultValue={challenge.status}>
            <SelectTrigger id="status" className="h-10 rounded-md border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">진행 중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="archived">아카이브</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="rounded-lg bg-admin-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            저장
          </Button>
          <Link to="/admin/challenges" className="px-5 py-2.5 rounded-lg border border-admin-border text-admin-text-secondary text-sm font-medium hover:bg-admin-bg transition-colors no-underline">취소</Link>
        </div>
      </form>
      <div className="mt-8 max-w-xl border border-error/30 rounded-lg p-6 bg-error/5">
        <h3 className="text-sm font-semibold text-error mb-2">위험 영역</h3>
        <p className="text-sm text-admin-text-secondary mb-4">이 챌린지를 삭제하면 되돌릴 수 없습니다. 연결된 기록이 있으면 삭제할 수 없습니다.</p>
        <form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
            onClick={(e) => {
              if (!confirm("정말로 이 챌린지를 삭제하시겠습니까?")) {
                e.preventDefault();
              }
            }}
          >
            챌린지 삭제
          </button>
        </form>
      </div>
    </div>
  );
}
