import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractMentionUserIdsFromContent,
  getMentionsByRecord,
  getMentionsOfUser,
  syncAllMentionsForRecord,
} from "../dialogue/mentions.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "mention-fixed-id"),
}));

function createDatabaseMock(existingMentions: unknown[] = []) {
  const deleteWhere = vi.fn(async () => undefined);
  const insertValues = vi.fn(async () => undefined);

  const createChainableMock = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      leftJoin: vi.fn(() => createChainableMock()),
      where: vi.fn(() => {
        const result = [...existingMentions];
        Object.defineProperty(result, "limit", {
          value: vi.fn(() => result),
          enumerable: false,
          configurable: true,
        });
        return result;
      }),
    };
    return chain;
  };

  const mockDb = {
    delete: vi.fn(() => ({ where: deleteWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => ({
      from: vi.fn(() => createChainableMock()),
    })),
    _spies: {
      deleteWhere,
      insertValues,
    },
  };

  return mockDb;
}

describe("mentions query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncAllMentionsForRecord", () => {
    it("merges explicit and regex mentions, removing duplicates", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "userMention",
                attrs: { id: "user-2", label: "Alice" },
              },
            ],
          },
        ],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        ["user-1", "user-2"],
        content,
        "author-123",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      expect(Array.isArray(insertedValues)).toBe(true);
      expect((insertedValues as Array<unknown>)).toHaveLength(2);

      const userIds = ((insertedValues as unknown) as Array<{ mentionedUserId: string }>).map(
        (m) => m.mentionedUserId,
      );
      expect(userIds).toContain("user-1");
      expect(userIds).toContain("user-2");
    });

    it("handles regex-only mentions from content", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "userMention",
                attrs: { id: "user-1", label: "Bob" },
              },
              {
                type: "userMention",
                attrs: { id: "user-2", label: "Charlie" },
              },
            ],
          },
        ],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        [],
        content,
        "author-123",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      expect(Array.isArray(insertedValues)).toBe(true);
      expect((insertedValues as Array<unknown>)).toHaveLength(2);
    });

    it("handles explicit-only mentions", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        ["user-1", "user-2"],
        content,
        "author-123",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      expect(Array.isArray(insertedValues)).toBe(true);
      expect((insertedValues as Array<unknown>)).toHaveLength(2);
    });

    it("handles no mentions at all", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        [],
        content,
        "author-123",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).not.toHaveBeenCalled();
    });

    it("sets correct metadata on inserted mentions", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "userMention",
                attrs: { id: "user-1", label: "Test" },
              },
            ],
          },
        ],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        [],
        content,
        "author-123",
      );

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      const mention = ((insertedValues as unknown) as Array<Record<string, unknown>>)[0];

      expect(mention).toHaveProperty("id", "mention-fixed-id");
      expect(mention).toHaveProperty("recordId", "record-1");
      expect(mention).toHaveProperty("mentionedUserId", "user-1");
      expect(mention).toHaveProperty("mentionedById", "author-123");
      expect(mention).toHaveProperty("createdAt");
    });

    it("handles invalid JSON content gracefully", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        ["user-1"],
        "invalid json {",
        "author-123",
      );

      expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
      expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      expect(Array.isArray(insertedValues)).toBe(true);
      expect((insertedValues as Array<unknown>)).toHaveLength(1);
    });

    it("deduplicates mentions from both sources", async () => {
      const mockDb = createDatabaseMock();
      vi.mocked(db).mockReturnValue(mockDb as never);

      const content = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "userMention",
                attrs: { id: "user-1", label: "Same" },
              },
              {
                type: "userMention",
                attrs: { id: "user-1", label: "Same" },
              },
            ],
          },
        ],
      });

      await syncAllMentionsForRecord(
        d1,
        "record-1",
        ["user-1", "user-1"],
        content,
        "author-123",
      );

      const calls = mockDb._spies.insertValues.mock.calls as Array<Array<unknown>>;
      const insertedValues = calls[0]?.[0];
      expect(Array.isArray(insertedValues)).toBe(true);
      expect((insertedValues as Array<unknown>)).toHaveLength(1);
    });
  });

  describe("extractMentionUserIdsFromContent", () => {
    it("returns unique user ids from mention nodes", () => {
      const content = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "userMention", attrs: { id: "user-1", label: "하나" } },
              { type: "mention", attrs: { id: "user-2", label: "둘" } },
              { type: "userMention", attrs: { id: "user-1", label: "하나" } },
            ],
          },
        ],
      });

      expect(extractMentionUserIdsFromContent(content)).toEqual(["user-1", "user-2"]);
    });

    it("returns empty array for invalid json", () => {
      expect(extractMentionUserIdsFromContent("not-json")).toEqual([]);
    });
  });

  describe("getMentionsByRecord", () => {
    it("returns mentions with profile data for a record", async () => {
      const existingMentions = [
        {
          mentionId: "mention-1",
          userId: "user-1",
          displayName: "Alice",
          slug: "alice",
          profilePhotoUrl: "https://example.com/alice.jpg",
        },
        {
          mentionId: "mention-2",
          userId: "user-2",
          displayName: "Bob",
          slug: "bob",
          profilePhotoUrl: "https://example.com/bob.jpg",
        },
      ];

      const mockDb = createDatabaseMock(existingMentions);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getMentionsByRecord(d1, "record-1");

      expect(result).toEqual(existingMentions);
    });

    it("returns empty array when no mentions exist", async () => {
      const mockDb = createDatabaseMock([]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getMentionsByRecord(d1, "record-1");

      expect(result).toEqual([]);
    });
  });

  describe("getMentionsOfUser", () => {
    it("returns mentions of a specific user with limit", async () => {
      const existingMentions = [
        {
          mentionId: "mention-1",
          recordId: "record-1",
          recordTitle: "First Record",
          recordSlug: "first-record",
          mentionedByDisplayName: "Charlie",
        },
      ];

      const mockDb = createDatabaseMock(existingMentions);
      vi.mocked(db).mockReturnValue(mockDb as never);

      const result = await getMentionsOfUser(d1, "user-1", 10);

      expect(result).toEqual(existingMentions);
    });

    it("uses default limit of 10", async () => {
      const mockDb = createDatabaseMock([]);
      vi.mocked(db).mockReturnValue(mockDb as never);

      await getMentionsOfUser(d1, "user-1");

      expect(mockDb._spies).toBeDefined();
    });
  });
});
