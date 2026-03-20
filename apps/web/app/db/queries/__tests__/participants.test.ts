import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getParticipantsBatch,
  getParticipantsByRecord,
  syncParticipantsForRecord,
} from "../records/participants.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];

  const select = vi.fn(() => {
    const result = queue.shift() ?? [];
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
      innerJoin: vi.fn(function (this: unknown) {
        return this;
      }),
      orderBy: vi.fn(function (this: unknown) {
        return this;
      }),
      limit: vi.fn(function (this: unknown) {
        return this;
      }),
      offset: vi.fn(function (this: unknown) {
        return this;
      }),
    };

    return Object.assign(Promise.resolve(result), query);
  });

  const deleteWhere = vi.fn(async () => undefined);
  const insertValues = vi.fn(async () => undefined);

  return {
    select,
    delete: vi.fn(() => ({ where: deleteWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
    _spies: {
      deleteWhere,
      insertValues,
    },
  };
}

describe("participants query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncParticipantsForRecord", () => {
    it("참여자를 전체 삭제 후 재삽입한다", async () => {
      const mockDb = createDatabaseMock([[{ authorId: "author-1" }]]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      await syncParticipantsForRecord(
        d1,
        "record-1",
        [
          { userId: "user-1", role: "companion" },
          { userId: "user-2", role: "interviewer" },
        ],
        "adder-1",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

      const insertCalls = mockDb._spies.insertValues.mock.calls as unknown[][];
      const inserted = insertCalls[0]?.[0] as Array<Record<string, unknown>> | undefined;
      expect(inserted).toHaveLength(2);
      expect(inserted?.[0]).toMatchObject({
        recordId: "record-1",
        participantUserId: "user-1",
        role: "companion",
        addedById: "adder-1",
      });
      expect(inserted?.[1]).toMatchObject({
        recordId: "record-1",
        participantUserId: "user-2",
        role: "interviewer",
        addedById: "adder-1",
      });
    });

    it("작성자 본인을 participants에서 자동 제외한다", async () => {
      const mockDb = createDatabaseMock([[{ authorId: "author-1" }]]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      await syncParticipantsForRecord(
        d1,
        "record-1",
        [
          { userId: "author-1", role: "companion" },
          { userId: "user-2", role: "companion" },
        ],
        "adder-1",
      );

      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
      const insertCalls = mockDb._spies.insertValues.mock.calls as unknown[][];
      const inserted = insertCalls[0]?.[0] as Array<Record<string, unknown>> | undefined;

      expect(inserted).toHaveLength(1);
      expect(inserted?.[0]?.participantUserId).toBe("user-2");
    });

    it("작성자만 들어온 경우 delete만 수행하고 insert는 생략한다", async () => {
      const mockDb = createDatabaseMock([[{ authorId: "author-1" }]]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      await syncParticipantsForRecord(
        d1,
        "record-1",
        [{ userId: "author-1", role: "companion" }],
        "adder-1",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).not.toHaveBeenCalled();
    });
  });

  describe("getParticipantsByRecord", () => {
    it("빈 결과를 그대로 반환한다", async () => {
      const mockDb = createDatabaseMock([[]]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getParticipantsByRecord(d1, "record-1");

      expect(result).toEqual([]);
    });

    it("여러 참여자 결과를 반환한다", async () => {
      const mockDb = createDatabaseMock([
        [
          {
            userId: "user-1",
            displayName: "하나",
            profilePhotoUrl: "https://example.com/hana.png",
            role: "companion",
            createdAt: 100,
          },
          {
            userId: "user-2",
            displayName: "둘",
            profilePhotoUrl: null,
            role: "interviewer",
            createdAt: 101,
          },
        ],
      ]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getParticipantsByRecord(d1, "record-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: "user-1",
        displayName: "하나",
        role: "companion",
      });
      expect(result[1]).toMatchObject({
        userId: "user-2",
        displayName: "둘",
        role: "interviewer",
      });
    });
  });

  describe("getParticipantsBatch", () => {
    it("recordIds 여러 개를 단일 select 쿼리로 조회한다", async () => {
      const mockDb = createDatabaseMock([
        [
          {
            recordId: "record-1",
            userId: "user-1",
            displayName: "하나",
            profilePhotoUrl: null,
            role: "companion",
            createdAt: 100,
          },
          {
            recordId: "record-2",
            userId: "user-2",
            displayName: "둘",
            profilePhotoUrl: null,
            role: "observer",
            createdAt: 101,
          },
        ],
      ]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getParticipantsBatch(d1, ["record-1", "record-2"]);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ recordId: "record-1", userId: "user-1" });
      expect(result[1]).toMatchObject({ recordId: "record-2", userId: "user-2" });
    });
  });
});
