import { beforeEach, describe, expect, it, vi } from "vitest";

import { isRecordSaved, saveRecord, unsaveRecord } from "../savedRecords.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

function createQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => result),
  };

  return query;
}

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];
  const select = vi.fn(() => createQuery(queue.shift() ?? []));

  const onConflictDoNothing = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const deleteWhere = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    _spies: {
      values,
      onConflictDoNothing,
      deleteWhere,
    },
  };
}

describe("savedRecords query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("save -> isSaved(true) -> unsave -> isSaved(false) 흐름이 동작한다", async () => {
    const mockDb = createDatabaseMock([[{ learnerId: "hana" }], []]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await saveRecord(d1, "hana", "record-001");

    const saved = await isRecordSaved(d1, "hana", "record-001");
    expect(saved).toBe(true);

    await unsaveRecord(d1, "hana", "record-001");

    const unsaved = await isRecordSaved(d1, "hana", "record-001");
    expect(unsaved).toBe(false);
    expect(mockDb._spies.values).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
  });
});
