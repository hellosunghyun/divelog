import { data, redirect } from "react-router";
import type { Route } from "./+types/$recordId";
import { useNavigation } from "react-router";
import { requireRole } from "~/lib/auth/auth.middleware.server";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { VISIBILITY_LABELS } from "~/lib/constants/visibility";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { RevisionTimeline } from "~/components/revision/RevisionTimeline";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { getRevisionsByRecord } from "~/db/queries/records/revisions.server";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { Spinner } from "~/components/feedback/Spinner";
import { eq, desc } from "drizzle-orm";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { records, learnerProfiles, challenges, questions, responses } = await import("~/db/schema.server");
  const { getPlainText } = await import("~/lib/content/content.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records.$recordId" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const record = await database
    .select()
    .from(records)
    .where(eq(records.id, params.recordId))
    .limit(1);

  if (!record[0]) {
    throw data("Record not found", { status: 404 });
  }

  const [author, challenge, relatedQuestions, relatedResponses] = await Promise.all([
    record[0].authorId
      ? database.select().from(learnerProfiles).where(eq(learnerProfiles.userId, record[0].authorId)).limit(1)
      : [],
    record[0].challengeId
      ? database.select().from(challenges).where(eq(challenges.id, record[0].challengeId)).limit(1)
      : [],
    database.select().from(questions).where(eq(questions.recordId, record[0].id)).orderBy(desc(questions.createdAt)),
    database.select().from(responses).where(eq(responses.recordId, record[0].id)).orderBy(desc(responses.createdAt)).limit(10),
  ]);

  const plainTextPreview = getPlainText(record[0].content, normalizeContentFormat(record[0].format));

  const revisions = await getRevisionsByRecord(context.cloudflare.env.DB, record[0].id);
  const revisionCount = revisions.length;

  return {
    record: record[0],
    author: author[0] ?? null,
    challenge: challenge[0] ?? null,
    questions: relatedQuestions,
    responses: relatedResponses,
    plainTextPreview,
    revisions,
    revisionCount,
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  await requireRole(request, context, "admin");
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { records, learnerProfiles, challenges, questions, responses } = await import("~/db/schema.server");
  const { getPlainText } = await import("~/lib/content/content.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records.$recordId" });
  const f = await request.formData();
  const intent = f.get("intent") as string;
  logger.info("action_start", { intent });

  if (intent === "delete") {
    await db(context.cloudflare.env.DB).delete(records).where(eq(records.id, params.recordId));
    logger.info("admin_delete_record", { recordId: params.recordId });
    throw redirect("/admin/records");
  }

  const moderationStatus = f.get("moderationStatus") as string;
  const moderationNote = (f.get("note") as string) || null;

  await db(context.cloudflare.env.DB)
    .update(records)
    .set({
      moderationStatus,
      moderationNote,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(records.id, params.recordId));

  logger.info("admin_moderate_record", { recordId: params.recordId, newStatus: moderationStatus });
  throw redirect("/admin/records");
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "기록 검토" }];
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

export default function AdminRecordDetailPage({ loaderData }: Route.ComponentProps) {
  const { record, author, challenge, questions, responses, plainTextPreview, revisions, revisionCount } = loaderData;
  const navigation = useNavigation();
  const isDeleting = navigation.state === "submitting" && navigation.formData?.get("intent") === "delete";

  return (
    <div>
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/records" className="text-sm text-admin-text-secondary hover:text-admin-text transition-colors">
          ← 목록
        </Link>
        <h2 className="text-xl font-semibold text-admin-text">기록 검토</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-admin-text">{record.title}</h3>
              <Badge variant={getModerationBadgeVariant(record.moderationStatus)} className="text-xs shrink-0">
                {record.moderationStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-admin-text-secondary">작성자:</span>
                <span className="ml-2 text-admin-text">{author?.displayName ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">형식:</span>
                <span className="ml-2 text-admin-text">{record.format}</span>
              </div>
               <div>
                 <span className="text-admin-text-secondary">공개 범위:</span>
                 <span className="ml-2 text-admin-text">{VISIBILITY_LABELS[record.visibility] ?? record.visibility}</span>
               </div>
              <div>
                <span className="text-admin-text-secondary">Challenge:</span>
                <span className="ml-2 text-admin-text">{challenge?.name ?? "-"}</span>
              </div>
              <div>
                <span className="text-admin-text-secondary">리듬:</span>
                <span className="ml-2 text-admin-text">{record.rhythm}</span>
              </div>
            </div>

            <div className="border-t border-admin-border pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-2">
                본문 미리보기
              </h4>
              <p className="text-sm text-admin-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {plainTextPreview.substring(0, 1000)}
                {plainTextPreview.length > 1000 ? "..." : ""}
              </p>
            </div>
          </div>

          {revisionCount > 0 && (
            <section className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-base font-semibold text-admin-text mb-3">
                수정 이력 ({revisionCount}건)
              </h3>
              <RevisionTimeline
                revisions={revisions}
                currentRecord={record as Record<string, unknown>}
                currentTags={[]}
              />
            </section>
          )}

          {questions.length > 0 && (
            <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-sm font-semibold mb-4 text-admin-text">
                남긴 질문 ({questions.length})
              </h3>
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="p-3 bg-admin-bg rounded-lg">
                    <p className="text-sm text-admin-text">{q.content}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {q.direction === "outward" ? "밖으로" : "안으로"}
                      </Badge>
                      <Badge variant={q.isOpen ? "default" : "secondary"} className="text-xs">
                        {q.isOpen ? "열림" : "닫힘"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {responses.length > 0 && (
            <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
              <h3 className="text-sm font-semibold mb-4 text-admin-text">
                받은 응답 ({responses.length})
              </h3>
              <div className="space-y-2">
                {responses.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-3 bg-admin-bg rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{r.type}</Badge>
                      <Badge variant={getModerationBadgeVariant(r.moderationStatus)} className="text-xs">
                        {r.moderationStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-admin-text line-clamp-2">{r.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

         <div className="space-y-6">
           <form method="post" className="bg-admin-surface rounded-lg p-5 border border-admin-border">
             <h3 className="text-sm font-semibold mb-4 text-admin-text">Moderation</h3>

             <div className="space-y-4">
               <input type="hidden" name="intent" value="moderate" />
               <div>
                 <Label htmlFor="moderation-status" className="text-xs text-admin-text-secondary">
                   상태
                 </Label>
                 <Select name="moderationStatus" defaultValue={record.moderationStatus ?? "clean"}>
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

               <div>
                 <Label htmlFor="moderation-note" className="text-xs text-admin-text-secondary">
                   메모
                 </Label>
                 <Textarea
                   id="moderation-note"
                   name="note"
                   placeholder="메모 (선택)"
                   rows={3}
                   defaultValue={record.moderationNote ?? ""}
                   className="min-h-0 rounded-md border-admin-border px-3 py-2 text-sm mt-1"
                 />
               </div>

               <SubmitButton
                 formDataMatch={{ intent: "moderate" }}
                 loadingText="저장 중..."
                 className="w-full h-9 rounded-md bg-admin-accent text-white text-sm hover:opacity-90"
               >
                 저장
               </SubmitButton>
             </div>
           </form>

          <div className="bg-admin-surface rounded-lg p-5 border border-admin-border">
            <h3 className="text-sm font-semibold mb-4 text-admin-text">공개 링크</h3>
            <Link
              to={`/logs/${record.slug}`}
              className="text-sm text-admin-accent hover:underline"
              target="_blank"
            >
              /logs/{record.slug} ↗
            </Link>
          </div>

           <div className="border border-error/30 rounded-lg p-5 bg-error/5">
             <h3 className="text-sm font-semibold text-error mb-2">위험 영역</h3>
             <p className="text-sm text-admin-text-secondary mb-4">이 기록을 삭제하면 관련된 질문, 응답, 문장도 함께 삭제됩니다. 되돌릴 수 없습니다.</p>
             <form method="post">
               <input type="hidden" name="intent" value="delete" />
               <button
                 type="submit"
                 disabled={isDeleting}
                 className="w-full h-9 rounded-md bg-error text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 onClick={(e) => {
                   if (!confirm("정말로 이 기록을 삭제하시겠습니까? 관련된 질문, 응답, 문장도 모두 삭제됩니다.")) {
                     e.preventDefault();
                   }
                 }}
               >
                 {isDeleting ? <><Spinner size="sm" /> 삭제 중...</> : "기록 삭제"}
               </button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
}
