import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCarryOver, getCarryOversByStage } from "../misc/carryOvers.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils/utils.server", () => ({
  nanoid: vi.fn(() => "carry-fixed-id"),
}));

type QueryPlan = { mode: "limit" | "direct"; result: unknown };

function createDatabaseMock(plans: QueryPlan[]) {
  const queue = [...plans];
  const select = vi.fn(() => {
    const plan = queue.shift() ?? { mode: "limit", result: [] };

    const query = {
      from: vi.fn(() => query),
      where: vi.fn(() => (plan.mode === "direct" ? Promise.resolve(plan.result) : query)),
      limit: vi.fn(async () => plan.result),
    };

    return query;
  });

  const insertValues = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values: insertValues })),
    _spies: {
      insertValues,
    },
  };
}

describe("carryOvers query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create -> getByStage 흐름이 동작한다", async () => {
    const carryOverRow = {
      id: "carry-fixed-id",
      originalQuestionId: "q-001",
      newQuestionId: null,
      fromStageId: "stage-challenge-1",
      toStageId: "stage-bridge-1",
      carriedAt: 100,
    };

    const mockDb = createDatabaseMock([
      { mode: "limit", result: [carryOverRow] },
      { mode: "direct", result: [carryOverRow] },
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const created = await createCarryOver(d1, {
      originalQuestionId: "q-001",
      fromStageId: "stage-challenge-1",
      toStageId: "stage-bridge-1",
    });
    expect(created.id).toBe("carry-fixed-id");

    const rows = await getCarryOversByStage(d1, "stage-bridge-1");
    expect(rows).toHaveLength(1);
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
  });
});
