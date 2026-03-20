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

  it("beforeState와 afterState를 JSON 문자열로 저장한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const beforeData = { status: "draft", title: "Old Title" };
    const afterData = { status: "published", title: "New Title" };

    await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "update",
      beforeState: beforeData,
      afterState: afterData,
    });

    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    const calls = mockDb._spies.insertValues.mock.calls as unknown[][];
    const callArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    expect(callArgs?.beforeState).toBe(JSON.stringify(beforeData));
    expect(callArgs?.afterState).toBe(JSON.stringify(afterData));
    expect(callArgs?.id).toBe("audit-fixed-id");
    expect(callArgs?.actorId).toBe("user-123");
    expect(callArgs?.targetType).toBe("record");
    expect(callArgs?.targetId).toBe("record-456");
    expect(callArgs?.action).toBe("update");
  });

  it("beforeState가 null일 때 null로 저장한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const afterData = { status: "published" };

    await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "create",
      beforeState: null,
      afterState: afterData,
    });

    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    const calls = mockDb._spies.insertValues.mock.calls as unknown[][];
    const callArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    expect(callArgs?.beforeState).toBeNull();
    expect(callArgs?.afterState).toBe(JSON.stringify(afterData));
  });

  it("afterState가 null일 때 null로 저장한다", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const beforeData = { status: "published" };

    await createAuditLog(d1, {
      actorId: "user-123",
      targetType: "record",
      targetId: "record-456",
      action: "delete",
      beforeState: beforeData,
      afterState: null,
    });

    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    const calls = mockDb._spies.insertValues.mock.calls as unknown[][];
    const callArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    expect(callArgs?.beforeState).toBe(JSON.stringify(beforeData));
    expect(callArgs?.afterState).toBeNull();
  });
});
