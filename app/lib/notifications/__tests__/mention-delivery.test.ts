import { beforeEach, describe, expect, it, vi } from "vitest";

import { deliverMentionNotifications } from "../mention-delivery.server";
import { notify } from "../notify.server";
import { extractMentionUserIdsFromContent } from "~/db/queries/dialogue/mentions.server";

vi.mock("../notify.server", () => ({
  notify: vi.fn(),
}));

vi.mock("~/db/queries/dialogue/mentions.server", () => ({
  extractMentionUserIdsFromContent: vi.fn(),
}));

describe("deliverMentionNotifications", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates mention recipients and forwards visibility", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue([
      "user-1",
      "user-2",
      "user-1",
    ]);
    vi.mocked(notify).mockResolvedValue({ success: true });

    await deliverMentionNotifications({
      d1,
      actorId: "author-1",
      actorName: "작성자",
      content: '{"type":"doc"}',
      recordId: "record-1",
      visibility: "cohort",
    });

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenNthCalledWith(1, {
      d1,
      actorId: "author-1",
      recipientId: "user-1",
      type: "mention",
      title: "작성자님이 회원님을 언급했습니다",
      recordId: "record-1",
      visibility: "cohort",
    });
    expect(notify).toHaveBeenNthCalledWith(2, {
      d1,
      actorId: "author-1",
      recipientId: "user-2",
      type: "mention",
      title: "작성자님이 회원님을 언급했습니다",
      recordId: "record-1",
      visibility: "cohort",
    });
  });

  it("returns early when no mentions are present", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue([]);

    await deliverMentionNotifications({
      d1,
      actorId: "author-1",
      actorName: "작성자",
      content: '{"type":"doc"}',
      recordId: "record-1",
      visibility: "public",
    });

    expect(notify).not.toHaveBeenCalled();
  });

  it("swallows notify failures so the caller can continue", async () => {
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue(["user-1"]);
    vi.mocked(notify).mockRejectedValue(new Error("boom"));

    await expect(
      deliverMentionNotifications({
        d1,
        actorId: "author-1",
        actorName: "작성자",
        content: '{"type":"doc"}',
        recordId: "record-1",
        visibility: "public",
      }),
    ).resolves.toBeUndefined();
  });
});
