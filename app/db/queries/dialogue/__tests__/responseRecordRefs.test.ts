import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/content/extract-references.server", () => ({
  extractRecordRefs: vi.fn(),
}));

vi.mock("~/db/client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "test_id"),
}));

import { db } from "~/db/client.server";
import {
  syncRecordRefsForResponse,
  deleteRecordRefsForResponse,
  getResponsesByReferencedRecord,
} from "../responseRecordRefs.server";
import { extractRecordRefs } from "~/lib/content/extract-references.server";

const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectChain = {
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn().mockResolvedValue([]),
};

// Chain the methods
mockSelectChain.from.mockReturnValue(mockSelectChain);
mockSelectChain.innerJoin.mockReturnValue(mockSelectChain);
mockSelectChain.where.mockReturnValue(mockSelectChain);
mockSelectChain.orderBy.mockReturnValue(mockSelectChain);

const mockSelect = vi.fn().mockReturnValue(mockSelectChain);

const mockDb = { delete: mockDelete, insert: mockInsert, select: mockSelect };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db).mockReturnValue(mockDb as any);
  mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mockSelectChain.limit.mockResolvedValue([]);
});

describe("syncRecordRefsForResponse", () => {
  it("deletes existing refs and inserts 0 when content has no record refs", async () => {
    vi.mocked(extractRecordRefs).mockReturnValue([]);

    await syncRecordRefsForResponse({} as any, "resp_1", '{"type":"doc","content":[]}');

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts 2 refs when content has 2 record refs", async () => {
    vi.mocked(extractRecordRefs).mockReturnValue([
      { recordId: "rec_a", recordSlug: "record-a", recordTitle: "기록 A" },
      { recordId: "rec_b", recordSlug: "record-b", recordTitle: "기록 B" },
    ]);

    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: insertValues });

    await syncRecordRefsForResponse({} as any, "resp_1", '{"type":"doc"}');

    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ referencedRecordId: "rec_a" }),
        expect.objectContaining({ referencedRecordId: "rec_b" }),
      ]),
    );
  });
});

describe("deleteRecordRefsForResponse", () => {
  it("calls delete with responseId", async () => {
    await deleteRecordRefsForResponse({} as any, "resp_1");
    expect(mockDelete).toHaveBeenCalledOnce();
  });
});

describe("getResponsesByReferencedRecord", () => {
  it("returns empty array when no responses reference the record", async () => {
    const result = await getResponsesByReferencedRecord({} as any, "rec_1");
    expect(result).toEqual([]);
  });
});
