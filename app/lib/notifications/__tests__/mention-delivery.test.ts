import { beforeEach, describe, expect, it, vi } from "vitest";

import { deliverMentionNotifications } from "../mention-delivery.server";
import { publishNotification } from "../publish.server";
import { extractMentionUserIdsFromContent } from "~/db/queries/dialogue/mentions.server";

vi.mock("../publish.server", () => ({
  publishNotification: vi.fn(),
}));

vi.mock("~/db/queries/dialogue/mentions.server", () => ({
  extractMentionUserIdsFromContent: vi.fn(),
}));

describe("deliverMentionNotifications", () => {
  const d1 = {} as D1Database;
  const queue = {} as Queue;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates mention recipients and forwards visibility", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue([
      "user-1",
      "user-2",
      "user-1",
    ]);
    vi.mocked(publishNotification).mockResolvedValue({
      success: true,
      enqueued: true,
    });

    await deliverMentionNotifications({
      d1,
      queue,
      actorId: "author-1",
      actorName: "작성자",
      content: '{"type":"doc"}',
      recordId: "record-1",
      visibility: "cohort",
    });

    expect(publishNotification).toHaveBeenCalledTimes(2);
    expect(publishNotification).toHaveBeenNthCalledWith(
      1,
      queue,
      {
        actorId: "author-1",
        recipientId: "user-1",
        type: "mention",
        title: "작성자님이 회원님을 언급했습니다",
        recordId: "record-1",
        visibility: "cohort",
      },
      d1,
    );
    expect(publishNotification).toHaveBeenNthCalledWith(
      2,
      queue,
      {
        actorId: "author-1",
        recipientId: "user-2",
        type: "mention",
        title: "작성자님이 회원님을 언급했습니다",
        recordId: "record-1",
        visibility: "cohort",
      },
      d1,
    );
  });

  it("returns early when no mentions are present", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue([]);

    await deliverMentionNotifications({
      d1,
      queue,
      actorId: "author-1",
      actorName: "작성자",
      content: '{"type":"doc"}',
      recordId: "record-1",
      visibility: "public",
    });

    expect(publishNotification).not.toHaveBeenCalled();
  });

  it("swallows notify failures so the caller can continue", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue(["user-1"]);
    vi.mocked(publishNotification).mockRejectedValue(new Error("boom"));

    await expect(
      deliverMentionNotifications({
        d1,
        queue,
        actorId: "author-1",
        actorName: "작성자",
        content: '{"type":"doc"}',
        recordId: "record-1",
        visibility: "public",
      }),
    ).resolves.toBeUndefined();
  });
});
