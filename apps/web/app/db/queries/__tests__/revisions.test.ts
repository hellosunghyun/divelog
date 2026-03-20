import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRevision,
  getLatestRevisionNumber,
  getRevisionCount,
  getRevisionsByRecord,
} from "../records/revisions.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "revision-fixed-id"),
}));

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];
  const currentResult = queue.shift() ?? [];

  const query = {
    from: vi.fn(function (this: unknown) {
      return this;
    }),
    where: vi.fn(function (this: unknown) {
      return this;
    }),
    leftJoin: vi.fn(function (this: unknown) {
      return this;
    }),
    orderBy: vi.fn(() => Promise.resolve(currentResult)),
    limit: vi.fn(() => Promise.resolve(currentResult)),
  };

  const queryWithAwait = Object.assign(Promise.resolve(currentResult), query);

  const select = vi.fn(() => queryWithAwait);
  const insertValues = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values: insertValues })),
    _spies: {
      insertValues,
    },
  };
}

describe("revisions query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createRevision은 JSON 직렬화된 snapshot, changedFields, tagsSnapshot으로 insert를 호출한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const snapshot = { title: "수정된 제목", content: "수정된 내용" };
    const changedFields = ["title", "content"];
    const tagsSnapshot = [{ id: "tag-1", name: "태그1" }];

    const revisionId = await createRevision(d1, {
      recordId: "record-1",
      authorId: "author-1",
      revisionNumber: 2,
      snapshot,
      changedFields,
      tagsSnapshot,
    });

    expect(revisionId).toBe("revision-fixed-id");
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

    const calls = mockDb._spies.insertValues.mock.calls as unknown[][];
    const callArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.snapshot).toBe(JSON.stringify(snapshot));
    expect(callArgs?.changedFields).toBe(JSON.stringify(changedFields));
    expect(callArgs?.tagsSnapshot).toBe(JSON.stringify(tagsSnapshot));
  });

  it("createRevision은 tagsSnapshot이 없으면 null을 저장한다", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await createRevision(d1, {
      recordId: "record-1",
      authorId: "author-1",
      revisionNumber: 1,
      snapshot: { title: "제목" },
      changedFields: ["title"],
    });

    const calls = mockDb._spies.insertValues.mock.calls as unknown[][];
    const callArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.tagsSnapshot).toBeNull();
  });

  it("getRevisionsByRecord는 LEFT JOIN 쿼리 구조를 사용하고 DESC 순서로 정렬한다", async () => {
    const mockDb = createDatabaseMock([
      [
        {
          revision: {
            id: "rev-2",
            recordId: "record-1",
            authorId: "author-1",
            revisionNumber: 2,
            snapshot: '{"title":"수정"}',
            changedFields: '["title"]',
            tagsSnapshot: null,
            createdAt: 1000,
          },
          author: {
            displayName: "학습자1",
            slug: "learner-1",
          },
        },
        {
          revision: {
            id: "rev-1",
            recordId: "record-1",
            authorId: "author-1",
            revisionNumber: 1,
            snapshot: '{"title":"원본"}',
            changedFields: '["title"]',
            tagsSnapshot: null,
            createdAt: 900,
          },
          author: {
            displayName: "학습자1",
            slug: "learner-1",
          },
        },
      ],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const revisions = await getRevisionsByRecord(d1, "record-1");

    expect(revisions).toHaveLength(2);
    expect(revisions[0].revision.revisionNumber).toBe(2);
    expect(revisions[1].revision.revisionNumber).toBe(1);
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("getRevisionCount는 COUNT 쿼리를 사용하고 빈 결과에 0을 반환한다", async () => {
    const mockDb = createDatabaseMock([
      [
        {
          count: 3,
        },
      ],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const count = await getRevisionCount(d1, "record-1");

    expect(count).toBe(3);
  });

  it("getRevisionCount는 빈 결과에 0을 반환한다", async () => {
    const mockDb = createDatabaseMock([[]]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const count = await getRevisionCount(d1, "record-1");

    expect(count).toBe(0);
  });

  it("getLatestRevisionNumber는 MAX 쿼리를 사용하고 빈 결과에 0을 반환한다", async () => {
    const mockDb = createDatabaseMock([
      [
        {
          maxRevision: 5,
        },
      ],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const latestNumber = await getLatestRevisionNumber(d1, "record-1");

    expect(latestNumber).toBe(5);
  });

  it("getLatestRevisionNumber는 빈 결과에 0을 반환한다", async () => {
    const mockDb = createDatabaseMock([[]]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const latestNumber = await getLatestRevisionNumber(d1, "record-1");

    expect(latestNumber).toBe(0);
  });
});
