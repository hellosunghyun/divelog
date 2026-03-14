import type { Route } from "./+types/_public.inbox";
import { db } from "../db/client.server";
import { notifications } from "../db/schema.server";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.middleware";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";
import { Link, Form } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "인박스 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") ?? "all";

  const allNotifs = await database
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, auth.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unread = allNotifs.filter((n) => !n.isRead);
  const displayed = tab === "unread" ? unread : allNotifs;

  return { notifications: displayed, unreadCount: unread.length, tab };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const database = db(context.cloudflare.env.DB);

  if (intent === "mark_read") {
    const id = formData.get("id") as string;
    await database
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, id), eq(notifications.recipientId, auth.user.id))
      );
  }

  if (intent === "mark_all_read") {
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

      <div className="max-w-[760px] mx-auto py-8 px-4">
        <div className="flex gap-2 mb-6 items-center justify-between">
          <div className="flex gap-2">
            <a
              href="?tab=all"
              className={`px-3 py-1.5 rounded-full text-meta no-underline ${
                tab === "all"
                  ? "bg-ocean-blue text-white"
                  : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              전체
            </a>
            <a
              href="?tab=unread"
              className={`px-3 py-1.5 rounded-full text-meta no-underline ${
                tab === "unread"
                  ? "bg-ocean-blue text-white"
                  : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              읽지 않음
            </a>
          </div>
          {unreadCount > 0 && (
            <Form method="post">
              <input type="hidden" name="intent" value="mark_all_read" />
              <button
                type="submit"
                className="text-meta text-text-tertiary border-none bg-transparent cursor-pointer hover:text-text-secondary transition-colors"
              >
                모두 읽음 처리
              </button>
            </Form>
          )}
        </div>

        {notifs.length === 0 ? (
          <EmptyState variant="notifications" />
        ) : (
          <div className="flex flex-col gap-3">
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`${n.isRead ? "bg-surface" : "bg-mist-blue"} rounded-md border border-border p-4 flex items-start gap-3 hover:bg-surface-secondary transition-colors`}
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
                  {n.recordId && (
                    <Link
                      to={`/logs/${n.recordId}`}
                      className="text-caption text-text-tertiary hover:text-text-secondary"
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
                      <button
                        type="submit"
                        className="text-caption text-text-tertiary border-none bg-transparent cursor-pointer whitespace-nowrap hover:text-text-secondary transition-colors"
                      >
                        읽음
                      </button>
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
