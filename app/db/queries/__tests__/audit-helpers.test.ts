import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuditLog } from "../admin/insights/audit-helpers.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "audit-fixed-id"),
}));

function createDatabaseMock() {
  const insertValues = vi.fn(async () => undefined);

  return {
    insert: vi.fn(() => ({ values: insertValues })),
    _spies: {
      insertValues,
    },
  };
}

describe("audit-helpers", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("정상적으로 audit log를 생성한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const id = await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "create",
      beforeState: null,
      afterState: { title: "새 기록", content: "내용" },
    });

    expect(id).toBe("audit-fixed-id");
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-123",
        targetType: "record",
        action: "create",
        beforeState: null,
        afterState: JSON.stringify({ title: "새 기록", content: "내용" }),
      })
    );
  });

  it("beforeState가 null인 경우 (create action)", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "create",
      beforeState: null,
      afterState: { title: "새 기록" },
    });

    expect(mockDb._spies.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeState: null,
      })
    );
  });

  it("afterState가 null인 경우 (delete action)", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "delete",
      beforeState: { title: "삭제된 기록" },
      afterState: null,
    });

    expect(mockDb._spies.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        afterState: null,
      })
    );
  });
});
