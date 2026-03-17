import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNotification, type NotificationType } from "../social/notifications.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "notification-fixed-id"),
}));

function createDatabaseMock(overrides: Partial<any> = {}) {
  const mockResult = [
    {
      id: "notification-fixed-id",
      recipientId: "learner-001",
      type: "mention",
      title: "테스트 알림",
      content: "테스트 내용",
      recordId: "record-001",
      questionId: null,
      isRead: false,
      createdAt: Math.floor(Date.now() / 1000),
      ...overrides,
    },
  ];

  const insertValues = vi.fn(() => ({
    returning: vi.fn(async () => mockResult),
  }));

  return {
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    _spies: {
      insertValues,
    },
  };
}

describe("notifications query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createNotification으로 mention 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-001",
      type: "mention",
      title: "테스트 알림",
      content: "테스트 내용",
      recordId: "record-001",
    });

    expect(result.id).toBe("notification-fixed-id");
    expect(result.type).toBe("mention");
    expect(result.isRead).toBe(false);
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
  });

  it("createNotification으로 response 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock({ type: "response" });
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-002",
      type: "response",
      title: "응답 알림",
      questionId: "question-001",
    });

    expect(result.type).toBe("response");
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
  });

  it("createNotification으로 reminder 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock({ type: "reminder" });
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-003",
      type: "reminder",
      title: "리마인더",
    });

    expect(result.type).toBe("reminder");
  });

  it("createNotification으로 reread_reminder 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock({ type: "reread_reminder" });
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-004",
      type: "reread_reminder",
      title: "재읽기 리마인더",
      recordId: "record-002",
    });

    expect(result.type).toBe("reread_reminder");
  });

  it("createNotification으로 carry_over 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock({ type: "carry_over" });
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-005",
      type: "carry_over",
      title: "이월 알림",
      questionId: "question-002",
    });

    expect(result.type).toBe("carry_over");
  });

  it("createNotification으로 stage_closing 타입 알림을 생성한다", async () => {
    const mockDb = createDatabaseMock({ type: "stage_closing" });
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-006",
      type: "stage_closing",
      title: "스테이지 종료 알림",
    });

    expect(result.type).toBe("stage_closing");
  });

  it("createNotification은 isRead를 false로 기본값 설정한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createNotification(d1, {
      recipientId: "learner-007",
      type: "mention",
      title: "테스트",
    });

    expect(result.isRead).toBe(false);
  });
});
