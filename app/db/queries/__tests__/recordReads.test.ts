import { beforeEach, describe, expect, it, vi } from "vitest";

import { bulkMarkAsRead, clearAllReads, getReadRecordIds, markAsRead, markAsUnread } from "../records/recordReads.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

function createQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(async () => result),
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

describe("recordReads query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("markAsRead -> getReadRecordIds -> markAsUnread 흐름이 동작한다", async () => {
    const mockDb = createDatabaseMock([
      [{ recordId: "record-001" }, { recordId: "record-002" }],
      [{ recordId: "record-001" }],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await markAsRead(d1, "hana", "record-001");

    const readIds = await getReadRecordIds(d1, "hana", ["record-001", "record-002"]);
    expect(readIds.has("record-001")).toBe(true);
    expect(readIds.has("record-002")).toBe(true);

    await markAsUnread(d1, "hana", "record-001");

    expect(mockDb._spies.values).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
  });

  it("getReadRecordIds 빈 배열 입력 시 빈 Set을 반환한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const readIds = await getReadRecordIds(d1, "hana", []);

    expect(readIds.size).toBe(0);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("clearAllReads는 특정 learner의 모든 읽음 기록을 삭제한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await clearAllReads(d1, "hana");

    expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
  });

  it("bulkMarkAsRead 빈 배열 입력 시 조기 반환한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await bulkMarkAsRead(d1, "hana", []);

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("bulkMarkAsRead 여러 항목을 한 번에 삽입한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const entries = [
      { recordId: "record-001", readAt: 1000 },
      { recordId: "record-002", readAt: 2000 },
    ];

    await bulkMarkAsRead(d1, "hana", entries);

    expect(mockDb._spies.values).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("markAsRead 중복 호출 시 에러 없이 처리한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await markAsRead(d1, "hana", "record-001");
    await markAsRead(d1, "hana", "record-001");

    expect(mockDb._spies.onConflictDoNothing).toHaveBeenCalledTimes(2);
  });
});
