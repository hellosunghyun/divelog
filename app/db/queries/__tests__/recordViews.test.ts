import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecordViewCount, getRecordViewCounts, trackRecordView } from "../records/recordViews.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

function createQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    groupBy: vi.fn(async () => result),
    limit: vi.fn(async () => result),
  };

  return query;
}

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];
  const select = vi.fn(() => createQuery(queue.shift() ?? []));

  const onConflictDoNothing = vi.fn(async () => ({ meta: { changes: 1 } }));
  const values = vi.fn(() => ({ onConflictDoNothing }));

  return {
    select,
    insert: vi.fn(() => ({ values })),
    _spies: {
      values,
      onConflictDoNothing,
    },
  };
}

describe("recordViews query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trackRecordView는 중복 키를 허용하지 않고 삽입 결과를 반환한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const inserted = await trackRecordView(d1, "record-001", "viewer-001");

    expect(inserted).toBe(true);
    expect(mockDb._spies.values).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("getRecordViewCount는 단일 기록의 조회수를 반환한다", async () => {
    const mockDb = createDatabaseMock([[{ count: 7 }]]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const viewCount = await getRecordViewCount(d1, "record-001");

    expect(viewCount).toBe(7);
  });

  it("getRecordViewCounts는 여러 기록의 조회수를 Map으로 반환한다", async () => {
    const mockDb = createDatabaseMock([[
      { recordId: "record-001", count: 3 },
      { recordId: "record-002", count: 5 },
    ]]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const counts = await getRecordViewCounts(d1, ["record-001", "record-002"]);

    expect(counts.get("record-001")).toBe(3);
    expect(counts.get("record-002")).toBe(5);
  });

  it("getRecordViewCounts는 빈 배열 입력 시 즉시 빈 Map을 반환한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const counts = await getRecordViewCounts(d1, []);

    expect(counts.size).toBe(0);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
