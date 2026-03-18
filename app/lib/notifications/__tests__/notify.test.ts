import { beforeEach, describe, expect, it, vi } from "vitest";

import { notify } from "../notify.server";
import { db } from "../../../db/client.server";
import { getNotificationPreferences } from "../../../db/queries/social/notificationPreferences.server";
import { createNotification } from "../../../db/queries/social/notifications.server";

vi.mock("../../../db/client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../db/queries/social/notificationPreferences.server", () => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock("../../../db/queries/social/notifications.server", () => ({
  createNotification: vi.fn(),
}));

function createDatabaseMock() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(async () => [{ id: "notification-id" }]),
    })),
  };
}

describe("notify service", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("self-notification prevention", () => {
    it("should NOT create a notification when actorId equals recipientId", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-123",
        type: "mention",
        title: "테스트 알림",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).not.toHaveBeenCalled();
    });
  });

  describe("opt-out enforcement", () => {
    it("should NOT create a notification when preference for the type is false", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: false,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "response",
        title: "응답 알림",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).not.toHaveBeenCalled();
    });

    it("should create a notification when preference for the type is true", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-001",
        recipientId: "user-456",
        actorId: null,
        type: "mention",
        title: "멘션 알림",
        content: null,
        recordId: null,
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "멘션 알림",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });
  });

  describe("draft guard", () => {
    it("should NOT create a notification when visibility is 'draft'", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "드래프트 알림",
        recordId: "record-001",
        visibility: "draft",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).not.toHaveBeenCalled();
    });

    it("should create a notification when visibility is 'cohort'", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-002",
        recipientId: "user-456",
        actorId: null,
        type: "mention",
        title: "코호트 알림",
        content: null,
        recordId: "record-001",
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "코호트 알림",
        recordId: "record-001",
        visibility: "cohort",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });

    it("should create a notification when visibility is 'public'", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-003",
        recipientId: "user-456",
        actorId: null,
        type: "mention",
        title: "공개 알림",
        content: null,
        recordId: "record-001",
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "공개 알림",
        recordId: "record-001",
        visibility: "public",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });
  });

  describe("deduplication", () => {
    it("should create only 1 row when calling notify twice with same (recipientId, type, recordId)", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-004",
        recipientId: "user-456",
        actorId: null,
        type: "mention",
        title: "중복 테스트",
        content: null,
        recordId: "record-001",
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      // First call
      await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "중복 테스트",
        recordId: "record-001",
      });

      // Second call with same parameters
      await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "중복 테스트",
        recordId: "record-001",
      });

      // Should only create 1 notification total
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });
  });

  describe("actor fallback", () => {
    it("should create a notification when actorId is null (system notification)", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-005",
        recipientId: "user-456",
        actorId: null,
        type: "reminder",
        title: "시스템 리마인더",
        content: null,
        recordId: null,
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: null,
        recipientId: "user-456",
        type: "reminder",
        title: "시스템 리마인더",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });

    it("should create a notification when actorId is undefined (system notification)", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-006",
        recipientId: "user-456",
        actorId: null,
        type: "reread_reminder",
        title: "재읽기 리마인더",
        content: null,
        recordId: "record-001",
        questionId: null,
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: undefined,
        recipientId: "user-456",
        type: "reread_reminder",
        title: "재읽기 리마인더",
        recordId: "record-001",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledTimes(1);
    });
  });

  describe("safe failure", () => {
    it("should NOT throw when DB insert fails, returning error result instead", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "실패 테스트",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });

    it("should handle preference query failure gracefully", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockRejectedValue(
        new Error("Preference query failed")
      );

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "mention",
        title: "선호도 조회 실패",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("complete notification flow", () => {
    it("should create a complete notification with all fields", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(getNotificationPreferences).mockResolvedValue({
        response: true,
        mention: true,
        participant_added: true,
        reminder: true,
        reread_reminder: true,
        reply: true,
        stage_transition: true,
      });
      vi.mocked(createNotification).mockResolvedValue({
        id: "notif-007",
        recipientId: "user-456",
        actorId: null,
        type: "response",
        title: "응답이 달렸습니다",
        content: "좋은 질문이네요",
        recordId: "record-001",
        questionId: "question-001",
        isRead: false,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const result = await notify({
        d1,
        actorId: "user-123",
        recipientId: "user-456",
        type: "response",
        title: "응답이 달렸습니다",
        content: "좋은 질문이네요",
        recordId: "record-001",
        questionId: "question-001",
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(createNotification)).toHaveBeenCalledWith(d1, {
        recipientId: "user-456",
        type: "response",
        title: "응답이 달렸습니다",
        content: "좋은 질문이네요",
        recordId: "record-001",
        questionId: "question-001",
      });
    });
  });
});
