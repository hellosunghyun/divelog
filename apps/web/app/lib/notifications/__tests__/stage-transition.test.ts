import { beforeEach, describe, expect, it, vi } from "vitest";

import { deliverStageTransitionNotification } from "../stage-transition.server";
import { notify } from "../notify.server";

vi.mock("../notify.server", () => ({
  notify: vi.fn(),
}));

describe("stage transition delivery", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards stage transitions through notify with admin actor", async () => {
    vi.mocked(notify).mockResolvedValue({ success: true });

    const delivered = await deliverStageTransitionNotification({
      d1,
      actorId: "admin-1",
      recipientId: "learner-1",
      stageId: "stage-2",
      stageName: "Bridge",
    });

    expect(delivered).toBe(true);
    expect(notify).toHaveBeenCalledWith({
      d1,
      actorId: "admin-1",
      recipientId: "learner-1",
      type: "stage_transition",
      title: "새로운 스테이지로 이동했습니다",
      content: "Bridge",
    });
  });

  it("swallows notify failures and returns false", async () => {
    vi.mocked(notify).mockRejectedValue(new Error("boom"));

    await expect(
      deliverStageTransitionNotification({
        d1,
        actorId: "admin-1",
        recipientId: "learner-1",
        stageId: "stage-2",
        stageName: "Bridge",
      }),
    ).resolves.toBe(false);
  });
});
