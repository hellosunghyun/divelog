import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteDraft, getDraftByAuthorAndFormat, upsertDraft } from "../records/drafts.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils.server", () => ({
  nanoid: vi.fn(() => "draft-fixed-id"),
}));

function createQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
  };

  return query;
}

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];
  const select = vi.fn(() => createQuery(queue.shift() ?? []));
  const insertValues = vi.fn(async () => undefined);
  const updateWhere = vi.fn(async () => undefined);
  const deleteWhere = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    _spies: {
      insertValues,
      updateWhere,
      deleteWhere,
    },
  };
}

describe("drafts query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsert -> get -> delete 흐름이 동작한다", async () => {
    const mockDb = createDatabaseMock([
      [],
      [
        {
          id: "draft-fixed-id",
          authorId: "hana",
          format: "note",
          title: "임시 제목",
          content: "임시 내용",
        },
      ],
      [
        {
          id: "draft-fixed-id",
          authorId: "hana",
          format: "note",
          title: "임시 제목",
          content: "임시 내용",
        },
      ],
      [
        {
          id: "draft-fixed-id",
          authorId: "hana",
          format: "note",
          title: "임시 제목",
          content: "임시 내용",
        },
      ],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    await upsertDraft(d1, {
      authorId: "hana",
      format: "note",
      title: "임시 제목",
      content: "임시 내용",
    });

    const found = await getDraftByAuthorAndFormat(d1, "hana", "note");
    expect(found).not.toBeNull();

    await deleteDraft(d1, "hana", "note");

    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.deleteWhere).toHaveBeenCalledTimes(1);
  });

  it("같은 author+format은 새 레코드를 만들지 않고 업데이트한다", async () => {
    const mockDb = createDatabaseMock([
      [
        {
          id: "draft-fixed-id",
          authorId: "hana",
          format: "note",
          title: "기존 제목",
          content: "기존 내용",
        },
      ],
      [
        {
          id: "draft-fixed-id",
          authorId: "hana",
          format: "note",
          title: "수정 제목",
          content: "수정 내용",
        },
      ],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const updated = await upsertDraft(d1, {
      authorId: "hana",
      format: "note",
      title: "수정 제목",
      content: "수정 내용",
    });

    expect(updated.id).toBe("draft-fixed-id");
    expect(mockDb._spies.insertValues).not.toHaveBeenCalled();
    expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
  });
});
