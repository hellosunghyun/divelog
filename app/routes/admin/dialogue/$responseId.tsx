import { data, redirect } from "react-router";
import type { Route } from "./+types/$responseId";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { eq } from "drizzle-orm";

const RESPONSE_TYPE_LABELS: Record<string, string> = {
  resonance: "공명",
  question: "질문",
  connection: "연결",
  suggestion: "제안",
  self_answer: "자기답변",
};

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { responses, records, learnerProfiles, questions } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue.$responseId" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const response = await database
    .select()
    .from(responses)
    .where(eq(responses.id, params.responseId))
    .limit(1);

  if (!response[0]) {
    throw data("Response not found", { status: 404 });
  }

  const [record, author, question] = await Promise.all([
    response[0].recordId
      ? database.select().from(records).where(eq(records.id, response[0].recordId)).limit(1)
      : [],
    response[0].authorId
      ? database.select().from(learnerProfiles).where(eq(learnerProfiles.userId, response[0].authorId)).limit(1)
      : [],
    response[0].questionId
      ? database.select().from(questions).where(eq(questions.id, response[0].questionId)).limit(1)
      : [],
  ]);

  return {
    response: response[0],
    record: record[0] ?? null,
    author: author[0] ?? null,
    question: question[0] ?? null,
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { responses, records, learnerProfiles, questions } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue.$responseId" });
  const f = await request.formData();
  const intent = f.get("intent") as string;
  logger.info("action_start", { intent });

  if (intent === "delete") {
    await db(context.cloudflare.env.DB).delete(responses).where(eq(responses.id, params.responseId));
    logger.info("admin_delete_response", { responseId: params.responseId });
    throw redirect("/admin/dialogue");
  }

  const moderationStatus = f.get("moderationStatus") as string;

  await db(context.cloudflare.env.DB)
    .update(responses)
    .set({
      moderationStatus,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(responses.id, params.responseId));

  logger.info("admin_moderate_response", { responseId: params.responseId, newStatus: moderationStatus });
  throw redirect("/admin/dialogue");
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Dialogue 검토" }];
}

const getModerationBadgeVariant = (
  status: string,
): "destructive" | "secondary" | "outline" | "default" => {
  switch (status) {
    case "flagged":
      return "destructive";
    case "hidden":
      return "secondary";
    case "clean":
      return "outline";
    default:
      return "default";
  }
};

export default function AdminDialogueDetailPage({ loaderData }: Route.ComponentProps) {
  const { response, record, author, question } = loaderData;

  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/dialogue" className="text-sm text-admin-text-secondary hover:text-admin-text transition-colors">
          ← 목록
        </Link>
        <h2 className="text-xl font-semibold text-admin-text">Dialogue 검토</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {record && (
            <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-3">
                원문 기록
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-admin-text">{record.title}</span>
                <Link
                  to={`/logs/${record.slug}`}
                  className="text-xs text-admin-accent hover:underline"
                  target="_blank"
                >
                  보기 ↗
                </Link>
              </div>
            </div>
          )}

          {question && (
            <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-3">
                연결된 질문
              </h3>
              <p className="text-sm text-admin-text">{question.content}</p>
            </div>
          )}

          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="text-xs">
                {RESPONSE_TYPE_LABELS[response.type] ?? response.type}
              </Badge>
              <Badge variant={getModerationBadgeVariant(response.moderationStatus)} className="text-xs">
                {response.moderationStatus}
              </Badge>
            </div>

            <div className="border-t border-admin-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-3">
                응답 내용
              </h3>
              <p className="text-sm text-admin-text leading-relaxed whitespace-pre-wrap">
                {response.content}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {author && (
            <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-3">
                작성자
              </h3>
              <div className="flex items-center gap-3">
                {author.profilePhotoUrl ? (
                  <img
                    src={author.profilePhotoUrl}
                    alt={author.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-admin-bg flex items-center justify-center text-xs text-admin-text-secondary">
                    {author.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-admin-text">{author.displayName}</p>
                  {author.slug && (
                    <Link
                      to={`/admin/learners/${author.userId}`}
                      className="text-xs text-admin-accent hover:underline"
                    >
                      관리
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <form method="post" className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-4">
              Moderation
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="moderation-status" className="text-xs text-admin-text-secondary">
                  상태
                </Label>
                <Select name="moderationStatus" defaultValue={response.moderationStatus ?? "clean"}>
                  <SelectTrigger id="moderation-status" className="h-9 rounded-md border-admin-border px-3 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full h-9 rounded-md bg-admin-accent text-white text-sm hover:opacity-90"
              >
                저장
              </Button>
            </div>
          </form>

          <div className="border border-error/30 rounded-lg p-5 bg-error/5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-error mb-3">위험 영역</h3>
            <p className="text-sm text-admin-text-secondary mb-4">이 응답을 삭제하면 되돌릴 수 없습니다.</p>
            <form method="post">
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                className="w-full h-9 rounded-md bg-error text-white text-sm font-medium hover:opacity-90 transition-colors"
                onClick={(e) => {
                  if (!confirm("정말로 이 응답을 삭제하시겠습니까?")) {
                    e.preventDefault();
                  }
                }}
              >
                응답 삭제
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
