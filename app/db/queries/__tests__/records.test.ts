import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecord, updateRecord } from "../records/records.server";
import { db } from "../../client.server";
import { createAuditLog } from "../admin/insights/audit-helpers.server";
import { createRevision, getLatestRevisionNumber } from "../records/revisions.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../admin/insights/audit-helpers.server", () => ({
  createAuditLog: vi.fn(async () => undefined),
}));

vi.mock("../records/revisions.server", () => ({
  createRevision: vi.fn(async () => "revision-fixed-id"),
  getLatestRevisionNumber: vi.fn(async () => 0),
}));

vi.mock("~/lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "record-fixed-id"),
}));

function createDatabaseMock(existingRecords: unknown[] = []) {
  const insertValues = vi.fn(async () => undefined);
  const selectLimit = vi.fn(async () => existingRecords);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const updateWhere = vi.fn(async () => undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));

  return {
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    _spies: {
      insertValues,
      selectLimit,
      updateWhere,
      updateSet,
    },
  };
}

describe("records query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createRecord calls createAuditLog with create action", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createRecord(d1, "author-123", {
      title: "새 기록",
      content: "내용",
      contentText: "내용",
      format: "note",
      type: "personal",
      rhythm: "free",
      visibility: "cohort",
      responsePreference: "open",
    });

    expect(result.id).toBe("record-fixed-id");
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    expect(createAuditLog).toHaveBeenCalledTimes(1);
    expect(createAuditLog).toHaveBeenCalledWith(
      d1,
      expect.objectContaining({
        actorId: "author-123",
        targetType: "record",
        targetId: "record-fixed-id",
        action: "create",
        beforeState: null,
        afterState: expect.objectContaining({
          id: "record-fixed-id",
          title: "새 기록",
          content: "내용",
        }),
      })
    );
  });

  it("createRecord returns id and slug", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await createRecord(d1, "author-123", {
      title: "새 기록",
      content: "내용",
      contentText: "내용",
      format: "note",
      type: "personal",
      rhythm: "free",
      visibility: "cohort",
      responsePreference: "open",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("slug");
    expect(result.id).toBe("record-fixed-id");
  });

  describe("updateRecord", () => {
    const existingRecord = {
      id: "record-1",
      authorId: "author-123",
      slug: "old-slug",
      title: "기존 제목",
      content: "기존 내용",
      contentText: "기존 내용",
      format: "note",
      type: "personal",
      rhythm: "free",
      visibility: "cohort",
      responsePreference: "open",
      challengeId: null,
      collaborationUnitId: null,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    };

    beforeEach(() => {
      vi.mocked(getLatestRevisionNumber).mockResolvedValue(3);
      vi.mocked(createRevision).mockResolvedValue("revision-fixed-id");
      vi.mocked(createAuditLog).mockResolvedValue(undefined);
    });

    it("필드 변경 시 revision/audit/update를 모두 수행한다", async () => {
      const mockDb = createDatabaseMock([existingRecord]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await updateRecord(d1, "record-1", "author-123", { title: "새 제목" }, {
        oldTags: [{ id: "tag-1", name: "회고" }],
        newTags: [{ id: "tag-1", name: "회고" }],
      });

      expect(createRevision).toHaveBeenCalledTimes(1);
      expect(createAuditLog).toHaveBeenCalledTimes(1);
      expect(createAuditLog).toHaveBeenCalledWith(
        d1,
        expect.objectContaining({
          action: "update",
          actorId: "author-123",
          targetType: "record",
          targetId: "record-1",
        }),
      );
      expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: true, revisionCreated: true });
    });

    it("태그만 변경되어도 revision을 생성한다", async () => {
      const mockDb = createDatabaseMock([existingRecord]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await updateRecord(d1, "record-1", "author-123", {}, {
        oldTags: [{ id: "tag-1", name: "회고" }],
        newTags: [{ id: "tag-2", name: "질문" }],
      });

      expect(createRevision).toHaveBeenCalledTimes(1);
      expect(createRevision).toHaveBeenCalledWith(
        d1,
        expect.objectContaining({
          changedFields: ["tags"],
        }),
      );
      expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: true, revisionCreated: true });
    });

    it("변경사항이 없으면 revision/update를 수행하지 않는다", async () => {
      const mockDb = createDatabaseMock([existingRecord]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await updateRecord(d1, "record-1", "author-123", {}, {
        oldTags: [{ id: "tag-1", name: "회고" }],
        newTags: [{ id: "tag-1", name: "회고" }],
      });

      expect(createRevision).not.toHaveBeenCalled();
      expect(createAuditLog).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: false, revisionCreated: false });
    });

    it("revision 생성 실패여도 update는 진행한다", async () => {
      const mockDb = createDatabaseMock([existingRecord]);
      vi.mocked(db).mockReturnValue(mockDb as never);
      vi.mocked(createRevision).mockRejectedValueOnce(new Error("revision failed"));

      const result = await updateRecord(d1, "record-1", "author-123", { title: "새 제목" }, {
        oldTags: [{ id: "tag-1", name: "회고" }],
        newTags: [{ id: "tag-1", name: "회고" }],
      });

      expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
      expect(createAuditLog).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: true, revisionCreated: false });
    });
  });
});
