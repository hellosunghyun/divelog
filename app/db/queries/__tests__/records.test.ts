import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecord } from "../records/records.server";
import { db } from "../../client.server";
import { createAuditLog } from "../admin/insights/audit-helpers.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../admin/insights/audit-helpers.server", () => ({
  createAuditLog: vi.fn(async () => undefined),
}));

vi.mock("../../../lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "record-fixed-id"),
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
});
