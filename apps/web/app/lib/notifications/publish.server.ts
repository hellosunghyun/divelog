import { createModuleLogger } from "../infra/logger.server";
import { notify, type NotifyParams } from "./notify.server";

export type NotificationQueueMessage = Omit<NotifyParams, "d1">;

const logger = createModuleLogger("notifications.publish");

export async function publishNotification(
  queue: Queue,
  params: NotificationQueueMessage,
  d1: D1Database,
): Promise<{ success: boolean; enqueued: boolean; error?: string }> {
  try {
    await queue.send(params);

    return {
      success: true,
      enqueued: true,
    };
  } catch (error) {
    const queueError = error instanceof Error ? error.message : String(error);

    logger.warn("queue_publish_failed_fallback_to_direct_notify", {
      recipientId: params.recipientId,
      type: params.type,
      error: queueError,
    });

    const directResult = await notify({
      d1,
      ...params,
    });

    return {
      success: directResult.success,
      enqueued: false,
      ...(directResult.error ? { error: directResult.error } : {}),
    };
  }
}
