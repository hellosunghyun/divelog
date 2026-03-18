import type { Route } from "./+types/inbox";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "~/lib/auth/auth.middleware";
import HeroSection from "~/components/sections/HeroSection";
import EmptyState from "~/components/feedback/EmptyState";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { db } from "~/db/client.server";
import { notifications, records } from "~/db/schema.server";
import { createLogger } from "~/lib/infra/logger.server";
import { Form } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "인박스 — DiveLog" }];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "inbox" });
  logger.info("loader_start");
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") ?? "all";

  const allNotifs = await database
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      content: notifications.content,
      recordId: notifications.recordId,
      recordSlug: records.slug,
      questionId: notifications.questionId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(records, eq(notifications.recordId, records.id))
    .where(eq(notifications.recipientId, auth.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unread = allNotifs.filter((n) => !n.isRead);
  const displayed = tab === "unread" ? unread : allNotifs;

  return { notifications: displayed, unreadCount: unread.length, tab };
}

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "inbox" });
  const auth = await requireAuth(request, context);
  const formData = await request.formData();
  const intent = formData.get("intent");
  logger.info("action_start", { intent });
  const database = db(context.cloudflare.env.DB);

  if (intent === "mark_read") {
    const id = formData.get("id") as string;
    logger.info("notification_mark_read", { notificationId: id });
    await database
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, id), eq(notifications.recipientId, auth.user.id))
      );
  }

  if (intent === "mark_all_read") {
    logger.info("notification_mark_all_read");
    await database
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, auth.user.id));
  }

  return null;
}

const NOTIF_TYPE: Record<string, string> = {
  response: "응답",
  question: "질문",
  mention: "언급",
  memory: "공동 기억",
  system: "시스템",
};

export default function InboxPage({ loaderData }: Route.ComponentProps) {
  const { notifications: notifs, unreadCount, tab } = loaderData;

  return (
    <div>
      <HeroSection variant="home" title="인박스" subtitle={`읽지 않은 알림 ${unreadCount}개`} />

      <div className="max-w-[760px] mx-auto py-12 px-6">
        <div className="flex gap-2 mb-6 items-center justify-between">
          <div className="flex gap-2">
            <a
              href="?tab=all"
              className={`px-4 py-2 rounded-full text-sm no-underline transition-colors ${
                tab === "all"
                  ? "bg-deep-ocean text-white font-medium"
                  : "text-text-secondary hover:bg-mist-blue/30"
              }`}
            >
              전체
            </a>
            <a
              href="?tab=unread"
              className={`px-4 py-2 rounded-full text-sm no-underline transition-colors ${
                tab === "unread"
                  ? "bg-deep-ocean text-white font-medium"
                  : "text-text-secondary hover:bg-mist-blue/30"
              }`}
            >
              읽지 않음
            </a>
          </div>
          {unreadCount > 0 && (
            <Form method="post">
              <input type="hidden" name="intent" value="mark_all_read" />
              <Button
                type="submit"
                variant="ghost"
                className="h-auto px-0 py-0 text-meta font-normal text-text-tertiary hover:bg-transparent hover:text-text-secondary"
              >
                모두 읽음 처리
              </Button>
            </Form>
          )}
        </div>

        {notifs.length === 0 ? (
          <EmptyState variant="notifications" />
        ) : (
          <div className="flex flex-col gap-4">
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`${n.isRead ? "bg-surface" : "bg-mist-blue"} rounded-lg border border-border p-5 flex items-start gap-3 hover:bg-surface-secondary transition-colors`}
              >
                <div className="flex-1">
                  <span className="text-caption text-ocean-blue">
                    {NOTIF_TYPE[n.type] ?? n.type}
                  </span>
                  <p className="text-base text-text-primary mt-1">
                    {n.title}
                  </p>
                  {n.content && (
                    <p className="text-meta text-text-secondary mt-1">
                      {n.content}
                    </p>
                  )}
                  {n.recordSlug && (
                    <Link
                      to={`/logs/${n.recordSlug}`}
                      className="text-caption text-text-tertiary hover:text-ocean-blue transition-colors no-underline"
                    >
                      기록 보기 →
                    </Link>
                  )}
                </div>
                {!n.isRead && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ocean-blue flex-shrink-0" />
                    <Form method="post">
                      <input type="hidden" name="intent" value="mark_read" />
                      <input type="hidden" name="id" value={n.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="h-auto whitespace-nowrap p-0 text-caption font-normal text-text-tertiary hover:bg-transparent hover:text-text-secondary"
                      >
                        읽음
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
