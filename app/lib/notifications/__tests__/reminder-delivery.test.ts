import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deliverDueQuestionReminders,
  deliverReminderNotification,
  deliverRereadReminderNotification,
} from "../reminder-delivery.server";
import { getDueReminders, markReminderSent } from "~/db/queries/misc/reminders.server";
import { notify } from "../notify.server";

vi.mock("../notify.server", () => ({
  notify: vi.fn(),
}));

vi.mock("~/db/queries/misc/reminders.server", () => ({
  getDueReminders: vi.fn(),
  markReminderSent: vi.fn(),
}));

describe("reminder delivery", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards self-answer reminders through notify with system actor", async () => {
    vi.mocked(notify).mockResolvedValue({ success: true });

    const delivered = await deliverReminderNotification({
      d1,
      recipientId: "learner-1",
      type: "reminder",
      questionId: "question-1",
    });

    expect(delivered).toBe(true);
    expect(notify).toHaveBeenCalledWith({
      d1,
      actorId: null,
      recipientId: "learner-1",
      type: "reminder",
      title: "자기답변을 남겨보세요",
      questionId: "question-1",
    });
  });

  it("marks only successfully delivered due question reminders as sent", async () => {
    vi.mocked(getDueReminders).mockResolvedValue([
      {
        id: "reminder-1",
        learnerId: "learner-1",
        questionId: "question-1",
        remindAt: 100,
        sentAt: null,
        createdAt: 90,
      },
      {
        id: "reminder-2",
        learnerId: "learner-1",
        questionId: "question-2",
        remindAt: 101,
        sentAt: null,
        createdAt: 91,
      },
    ]);
    vi.mocked(notify)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "boom" });

    const deliveredCount = await deliverDueQuestionReminders({
      d1,
      learnerId: "learner-1",
    });

    expect(deliveredCount).toBe(1);
    expect(markReminderSent).toHaveBeenCalledTimes(1);
    expect(markReminderSent).toHaveBeenCalledWith(d1, "reminder-1");
    expect(notify).toHaveBeenNthCalledWith(1, {
      d1,
      actorId: null,
      recipientId: "learner-1",
      type: "reminder",
      title: "자기답변을 남겨보세요",
      questionId: "question-1",
    });
    expect(notify).toHaveBeenNthCalledWith(2, {
      d1,
      actorId: null,
      recipientId: "learner-1",
      type: "reminder",
      title: "자기답변을 남겨보세요",
      questionId: "question-2",
    });
  });

  it("forwards reread reminders through notify with the reread type", async () => {
    vi.mocked(notify).mockResolvedValue({ success: true });

    const delivered = await deliverRereadReminderNotification({
      d1,
      recipientId: "learner-2",
      recordId: "record-1",
      visibility: "cohort",
    });

    expect(delivered).toBe(true);
    expect(notify).toHaveBeenCalledWith({
      d1,
      actorId: null,
      recipientId: "learner-2",
      type: "reread_reminder",
      title: "다시 읽어보세요",
      recordId: "record-1",
      visibility: "cohort",
    });
  });
});
