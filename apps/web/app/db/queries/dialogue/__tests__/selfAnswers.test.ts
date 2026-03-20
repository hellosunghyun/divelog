import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLearnerSelfAnswerSummary } from "../selfAnswers.server";
import { db } from "../../../client.server";

vi.mock("../../../client.server", () => ({
  db: vi.fn(),
}));

function createDatabaseMock(
  selfAnswersData: Array<{
    selfAnswerId: string;
    questionContent: string;
    selfAnswerContent: string;
    recordSlug: string;
  }> = [],
) {
  const selectLimit = vi.fn(async () => selfAnswersData);
  const selectOrderBy = vi.fn(() => ({ limit: selectLimit }));
  const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
  const selectInnerJoin2 = vi.fn(() => ({ where: selectWhere }));
  const selectInnerJoin1 = vi.fn(() => ({ innerJoin: selectInnerJoin2 }));
  const selectFrom = vi.fn(() => ({ innerJoin: selectInnerJoin1 }));

  return {
    select: vi.fn(() => ({ from: selectFrom })),
    _spies: {
      selectLimit,
      selectWhere,
      selectOrderBy,
      selectInnerJoin1,
      selectInnerJoin2,
      selectFrom,
    },
  };
}

describe("selfAnswers query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recent self-answers for learner", async () => {
    const mockDb = createDatabaseMock([
      {
        selfAnswerId: "sa-1",
        questionContent: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What did you learn?"}]}]}',
        selfAnswerContent: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is my first self-answer about learning"}]}]}',
        recordSlug: "record-1",
      },
      {
        selfAnswerId: "sa-2",
        questionContent: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"How did you grow?"}]}]}',
        selfAnswerContent: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Another reflection on my journey"}]}]}',
        recordSlug: "record-2",
      },
    ]);

    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerSelfAnswerSummary(d1, "learner-123", 5);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "sa-1",
      questionTitle: expect.any(String),
      snippet: expect.any(String),
      recordSlug: "record-1",
    });
    expect(mockDb._spies.selectLimit).toHaveBeenCalledWith(5);
  });

  it("returns empty array when learner has no self-answers", async () => {
    const mockDb = createDatabaseMock([]);

    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerSelfAnswerSummary(d1, "learner-456", 5);

    expect(result).toEqual([]);
  });

  it("uses default limit of 5 when not specified", async () => {
    const mockDb = createDatabaseMock([]);

    vi.mocked(db).mockReturnValue(mockDb as never);

    await getLearnerSelfAnswerSummary(d1, "learner-123");

    expect(mockDb._spies.selectLimit).toHaveBeenCalledWith(5);
  });

  it("respects custom limit parameter", async () => {
    const mockDb = createDatabaseMock([]);

    vi.mocked(db).mockReturnValue(mockDb as never);

    await getLearnerSelfAnswerSummary(d1, "learner-123", 10);

    expect(mockDb._spies.selectLimit).toHaveBeenCalledWith(10);
  });
});
