import { extractMentionUserIdsFromContent } from "~/db/queries/dialogue/mentions.server";

import { createModuleLogger } from "../infra/logger.server";
import { notify } from "./notify.server";

interface DeliverMentionNotificationsParams {
  d1: D1Database;
  actorId: string;
  actorName: string;
  content: string | null | undefined;
  recordId: string;
  visibility?: string;
}

const logger = createModuleLogger("notifications.mention-delivery");

export async function deliverMentionNotifications(
  params: DeliverMentionNotificationsParams,
): Promise<void> {
  const content = params.content ?? "";
  if (!content) {
    return;
  }

  const recipientIds = Array.from(new Set(extractMentionUserIdsFromContent(content)));
  if (recipientIds.length === 0) {
    return;
  }

  await Promise.all(
    recipientIds.map(async (recipientId) => {
      try {
        const result = await notify({
          d1: params.d1,
          actorId: params.actorId,
          recipientId,
          type: "mention",
          title: `${params.actorName}님이 회원님을 언급했습니다`,
          recordId: params.recordId,
          visibility: params.visibility,
        });

        if (!result.success) {
          logger.warn("mention_notification_failed", {
            actorId: params.actorId,
            recipientId,
            recordId: params.recordId,
            visibility: params.visibility ?? null,
            error: result.error ?? "알림 생성에 실패했습니다.",
          });
        }
      } catch (error) {
        logger.warn("mention_notification_failed", {
          actorId: params.actorId,
          recipientId,
          recordId: params.recordId,
          visibility: params.visibility ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}
