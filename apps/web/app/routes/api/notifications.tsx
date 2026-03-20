import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { and, desc, eq } from "drizzle-orm";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";
import { db } from "~/db/client.server";
import { notifications, records } from "~/db/schema.server";
import { getUnreadCount } from "~/db/queries/social/notifications.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ notifications: [], unreadCount: 0 });
  }

  const database = db(context.cloudflare.env.DB);

  const [notifs, unreadCount] = await Promise.all([
    database
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
      .limit(8),
    getUnreadCount(context.cloudflare.env.DB, auth.user.id),
  ]);

  return Response.json({
    notifications: notifs,
    unreadCount,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ success: false }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const { markAsRead, markAllAsRead } = await import(
    "~/db/queries/social/notifications.server"
  );

  if (intent === "mark_read") {
    const id = formData.get("id") as string;
    if (id) {
      await markAsRead(context.cloudflare.env.DB, id, auth.user.id);
    }
  }

  if (intent === "mark_all_read") {
    await markAllAsRead(context.cloudflare.env.DB, auth.user.id);
  }

  return Response.json({ success: true });
}
