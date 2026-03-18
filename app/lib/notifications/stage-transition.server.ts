import { createModuleLogger } from "../infra/logger.server";
import { notify } from "./notify.server";

interface DeliverStageTransitionNotificationParams {
  d1: D1Database;
  actorId: string;
  recipientId: string;
  stageId: string;
  stageName: string;
}

const logger = createModuleLogger("notifications.stage-transition");

export async function deliverStageTransitionNotification(
  params: DeliverStageTransitionNotificationParams,
): Promise<boolean> {
  try {
    const result = await notify({
      d1: params.d1,
      actorId: params.actorId,
      recipientId: params.recipientId,
      type: "stage_transition",
      title: "새로운 스테이지로 이동했습니다",
      content: params.stageName,
    });

    if (!result.success) {
      logger.warn("stage_transition_notification_failed", {
        actorId: params.actorId,
        recipientId: params.recipientId,
        stageId: params.stageId,
        error: result.error ?? "알림 생성에 실패했습니다.",
      });
    }

    return result.success;
  } catch (error) {
    logger.warn("stage_transition_notification_failed", {
      actorId: params.actorId,
      recipientId: params.recipientId,
      stageId: params.stageId,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}
