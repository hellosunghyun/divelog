import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPersonalReflection, upsertPersonalReflection } from "../learners/reflections.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils.server", () => ({
  nanoid: vi.fn(() => "reflection-fixed-id"),
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
  const insertValues = vi.fn(async () => undefined);
  const updateWhere = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    _spies: {
      insertValues,
      updateWhere,
    },
  };
}

describe("reflections query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsert -> get -> upsert(update) -> get(same id) 흐름이 동작한다", async () => {
    const firstRow = {
      id: "reflection-fixed-id",
      stageId: "stage-bridge-1",
      learnerId: "hana",
      letGo: "첫 메모",
      carryQuestion: "첫 질문",
      lastingSentence: "첫 문장",
      createdAt: 100,
      updatedAt: 100,
    };
    const updatedRow = {
      ...firstRow,
      letGo: "수정 메모",
      carryQuestion: "수정 질문",
      updatedAt: 200,
    };

    const mockDb = createDatabaseMock([
      [],
      [firstRow],
      [firstRow],
      [firstRow],
      [updatedRow],
      [updatedRow],
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const created = await upsertPersonalReflection(d1, {
      stageId: "stage-bridge-1",
      learnerId: "hana",
      letGo: "첫 메모",
      carryQuestion: "첫 질문",
      lastingSentence: "첫 문장",
    });

    const foundBefore = await getPersonalReflection(d1, "stage-bridge-1", "hana");

    const updated = await upsertPersonalReflection(d1, {
      stageId: "stage-bridge-1",
      learnerId: "hana",
      letGo: "수정 메모",
      carryQuestion: "수정 질문",
      lastingSentence: "첫 문장",
    });

    const foundAfter = await getPersonalReflection(d1, "stage-bridge-1", "hana");

    expect(created.id).toBe("reflection-fixed-id");
    expect(foundBefore?.id).toBe("reflection-fixed-id");
    expect(updated.id).toBe("reflection-fixed-id");
    expect(foundAfter?.id).toBe("reflection-fixed-id");
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
  });
});
