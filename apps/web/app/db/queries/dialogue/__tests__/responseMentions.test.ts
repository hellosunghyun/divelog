import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../../lib/content/extract-references.server", () => ({
  extractUserMentions: vi.fn(),
  extractRecordRefs: vi.fn(),
}));

vi.mock("../../../../lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "test_id"),
}));

import { db } from "../../../client.server";
import {
  extractRecordRefs,
  extractUserMentions,
} from "../../../../lib/content/extract-references.server";
import {
  deleteMentionsForResponse,
  syncMentionsForResponse,
} from "../responseMentions.server";
import {
  deleteRecordRefsForResponse,
  syncRecordRefsForResponse,
} from "../responseRecordRefs.server";

function createDatabaseMock() {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const insertValues = vi.fn().mockResolvedValue(undefined);

  return {
    delete: vi.fn(() => ({ where: deleteWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
    _spies: {
      deleteWhere,
      insertValues,
    },
  };
}

describe("response mention and record ref sync queries", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes existing mentions and skips insert when content has no mentions", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);
    vi.mocked(extractUserMentions).mockReturnValue([]);

    await syncMentionsForResponse(
      d1,
      "resp_1",
      "rec_1",
      '{"type":"doc","content":[]}',
      "user_1",
    );

    expect(mockDb.delete).toHaveBeenCalledOnce();
    expect(mockDb._spies.deleteWhere).toHaveBeenCalledOnce();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("inserts deduplicated mentions for a response", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);
    vi.mocked(extractUserMentions).mockReturnValue([
      { userId: "usr_a", slug: "user-a", displayName: "A" },
      { userId: "usr_b", slug: "user-b", displayName: "B" },
      { userId: "usr_a", slug: "user-a", displayName: "A" },
    ]);

    await syncMentionsForResponse(d1, "resp_1", "rec_1", '{"type":"doc"}', "user_1");

    expect(mockDb.delete).toHaveBeenCalledOnce();
    expect(mockDb.insert).toHaveBeenCalledOnce();
    expect(mockDb._spies.insertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "test_id",
        responseId: "resp_1",
        recordId: "rec_1",
        mentionedUserId: "usr_a",
        mentionedById: "user_1",
        createdAt: expect.any(Number),
      }),
      expect.objectContaining({
        id: "test_id",
        responseId: "resp_1",
        recordId: "rec_1",
        mentionedUserId: "usr_b",
        mentionedById: "user_1",
        createdAt: expect.any(Number),
      }),
    ]);
  });

  it("inserts deduplicated record refs for a response", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);
    vi.mocked(extractRecordRefs).mockReturnValue([
      { recordId: "rec_a", recordSlug: "record-a", recordTitle: "A" },
      { recordId: "rec_b", recordSlug: "record-b", recordTitle: "B" },
      { recordId: "rec_a", recordSlug: "record-a", recordTitle: "A" },
    ]);

    await syncRecordRefsForResponse(d1, "resp_1", '{"type":"doc"}');

    expect(mockDb.delete).toHaveBeenCalledOnce();
    expect(mockDb.insert).toHaveBeenCalledOnce();
    expect(mockDb._spies.insertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "test_id",
        responseId: "resp_1",
        referencedRecordId: "rec_a",
        createdAt: expect.any(Number),
      }),
      expect.objectContaining({
        id: "test_id",
        responseId: "resp_1",
        referencedRecordId: "rec_b",
        createdAt: expect.any(Number),
      }),
    ]);
  });

  it("deletes mentions and record refs for a response", async () => {
    const mockDb = createDatabaseMock();
    vi.mocked(db).mockReturnValue(mockDb as never);

    await deleteMentionsForResponse(d1, "resp_1");
    await deleteRecordRefsForResponse(d1, "resp_1");

    expect(mockDb.delete).toHaveBeenCalledTimes(2);
    expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
