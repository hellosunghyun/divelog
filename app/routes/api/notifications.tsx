import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getOptionalUser } from "~/lib/auth.middleware";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ notifications: [], unreadCount: 0 });
  }

  const { getNotifications, getUnreadCount } = await import(
    "~/db/queries/social/notifications.server"
  );

  const [notifs, unreadCount] = await Promise.all([
    getNotifications(context.cloudflare.env.DB, auth.user.id),
    getUnreadCount(context.cloudflare.env.DB, auth.user.id),
  ]);

  return Response.json({
    notifications: notifs.slice(0, 8),
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
