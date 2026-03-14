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

      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginBottom: "var(--space-6)",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <a
              href="?tab=all"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "13px",
                textDecoration: "none",
                backgroundColor: tab === "all" ? "var(--color-ocean-blue)" : "transparent",
                color: tab === "all" ? "white" : "var(--color-text-secondary)",
              }}
            >
              전체
            </a>
            <a
              href="?tab=unread"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "13px",
                textDecoration: "none",
                backgroundColor: tab === "unread" ? "var(--color-ocean-blue)" : "transparent",
                color: tab === "unread" ? "white" : "var(--color-text-secondary)",
              }}
            >
              읽지 않음
            </a>
          </div>
          {unreadCount > 0 && (
            <Form method="post">
              <input type="hidden" name="intent" value="mark_all_read" />
              <button
                type="submit"
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-tertiary)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                모두 읽음 처리
              </button>
            </Form>
          )}
        </div>

        {notifs.length === 0 ? (
          <EmptyState variant="notifications" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {notifs.map((n) => (
              <div
                key={n.id}
                style={{
                  backgroundColor: n.isRead ? "var(--color-surface)" : "var(--color-mist-blue)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  padding: "var(--space-4)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "12px", color: "var(--color-ocean-blue)" }}>
                    {NOTIF_TYPE[n.type] ?? n.type}
                  </span>
                  <p
                    style={{
                      fontSize: "var(--font-size-base)",
                      color: "var(--color-text-primary)",
                      marginTop: "4px",
                    }}
                  >
                    {n.title}
                  </p>
                  {n.content && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                        marginTop: "4px",
                      }}
                    >
                      {n.content}
                    </p>
                  )}
                  {n.recordId && (
                    <Link
                      to={`/logs/${n.recordId}`}
                      style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}
                    >
                      기록 보기 →
                    </Link>
                  )}
                </div>
                {!n.isRead && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="mark_read" />
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-tertiary)",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      읽음
                    </button>
                  </Form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
