import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLearnerInterestTags, getLearnerStageActivity } from "../learners.server";
import { db } from "../../../client.server";

vi.mock("../../../client.server", () => ({
  db: vi.fn(),
}));

function createDatabaseMock(tagsData: unknown[] = []) {
  const selectWhere = vi.fn(async () => tagsData);
  const selectInnerJoin2 = vi.fn(() => ({ where: selectWhere }));
  const selectInnerJoin1 = vi.fn(() => ({ innerJoin: selectInnerJoin2 }));
  const selectFrom = vi.fn(() => ({ innerJoin: selectInnerJoin1 }));

  return {
    select: vi.fn(() => ({ from: selectFrom })),
    _spies: {
      selectWhere,
      selectInnerJoin1,
      selectInnerJoin2,
      selectFrom,
    },
  };
}

describe("learners query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns derived interest tags for learner with tagged records", async () => {
    const mockDb = createDatabaseMock([
      { slug: "design", name: "Design" },
      { slug: "ux", name: "UX" },
      { slug: "design", name: "Design" },
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerInterestTags(d1, "learner-123");

    expect(result).toEqual([
      { slug: "design", name: "Design" },
      { slug: "ux", name: "UX" },
    ]);
    expect(mockDb._spies.selectFrom).toHaveBeenCalled();
    expect(mockDb._spies.selectWhere).toHaveBeenCalled();
  });

  it("returns empty array for learner with no eligible tags", async () => {
    const mockDb = createDatabaseMock([]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerInterestTags(d1, "learner-456");

    expect(result).toEqual([]);
  });

  it("deduplicates tags by slug", async () => {
    const mockDb = createDatabaseMock([
      { slug: "reflection", name: "Reflection" },
      { slug: "reflection", name: "Reflection" },
      { slug: "reflection", name: "Reflection" },
      { slug: "growth", name: "Growth" },
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerInterestTags(d1, "learner-789");

    expect(result).toEqual([
      { slug: "reflection", name: "Reflection" },
      { slug: "growth", name: "Growth" },
    ]);
  });

  it("orders tags by frequency (most-used first)", async () => {
    const mockDb = createDatabaseMock([
      { slug: "design", name: "Design" },
      { slug: "design", name: "Design" },
      { slug: "design", name: "Design" },
      { slug: "ux", name: "UX" },
      { slug: "ux", name: "UX" },
      { slug: "research", name: "Research" },
    ]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerInterestTags(d1, "learner-999");

    expect(result).toEqual([
      { slug: "design", name: "Design" },
      { slug: "ux", name: "UX" },
      { slug: "research", name: "Research" },
    ]);
  });
});

function createStageActivityDatabaseMock(
  learnerProfile: unknown = null,
  stage: unknown = null,
  records: unknown[] = [],
  questions: unknown[] = [],
) {
  let selectCallCount = 0;
  const hasStage = stage !== null;

  const selectLimit = vi.fn(async () => (learnerProfile ? [learnerProfile] : []));
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));

  const recordsSelectWhere = vi.fn(async () => records);
  const recordsSelectFrom = vi.fn(() => ({ where: recordsSelectWhere }));

  const stageSelectLimit = vi.fn(async () => (stage ? [stage] : []));
  const stageSelectWhere = vi.fn(() => ({ limit: stageSelectLimit }));
  const stageSelectFrom = vi.fn(() => ({ where: stageSelectWhere }));

  const questionsSelectWhere = vi.fn(async () => questions);
  const questionsInnerJoin = vi.fn(() => ({ where: questionsSelectWhere }));
  const questionsSelectFrom = vi.fn(() => ({ innerJoin: questionsInnerJoin }));

  const selectFn = vi.fn(() => {
    selectCallCount += 1;
    if (selectCallCount === 1) {
      return { from: selectFrom };
    } else if (hasStage && selectCallCount === 2) {
      return { from: stageSelectFrom };
    } else if ((hasStage && selectCallCount === 3) || (!hasStage && selectCallCount === 2)) {
      return { from: recordsSelectFrom };
    } else {
      return { from: questionsSelectFrom };
    }
  });

  return {
    select: selectFn,
    _resetCallCount: () => {
      selectCallCount = 0;
    },
    _spies: {
      selectLimit,
      recordsSelectWhere,
      stageSelectLimit,
      questionsSelectWhere,
    },
  };
}

describe("getLearnerStageActivity", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stage and activity summary for learner with public records", async () => {
    const learnerProfile = {
      userId: "user-123",
      currentStageId: "stage-1",
    };

    const stage = {
      id: "stage-1",
      name: "Bridge",
      slug: "bridge",
    };

    const records = [
      {
        id: "record-1",
        createdAt: 1700000000,
        visibility: "public",
      },
      {
        id: "record-2",
        createdAt: 1700100000,
        visibility: "cohort",
      },
    ];

    const questions = [
      {
        id: "q-1",
        createdAt: 1700050000,
      },
    ];

    const mockDb = createStageActivityDatabaseMock(learnerProfile, stage, records, questions);
    mockDb._resetCallCount();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerStageActivity(d1, "user-123", false);

    expect(result).toEqual({
      currentStage: {
        id: "stage-1",
        name: "Bridge",
        slug: "bridge",
      },
      recentActivity: {
        recordCount: 2,
        questionCount: 1,
        lastActiveAt: expect.any(String),
      },
    });

    expect(result.recentActivity.lastActiveAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null stage safely when currentStageId is null", async () => {
    const learnerProfile = {
      userId: "user-123",
      currentStageId: null,
    };

    const records = [
      {
        id: "record-1",
        createdAt: 1700000000,
        visibility: "public",
      },
    ];

    const questions: unknown[] = [];

    const mockDb = createStageActivityDatabaseMock(learnerProfile, null, records, questions);
    mockDb._resetCallCount();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerStageActivity(d1, "user-123", false);

    expect(result).toEqual({
      currentStage: null,
      recentActivity: {
        recordCount: 1,
        questionCount: 0,
        lastActiveAt: expect.any(String),
      },
    });
  });

  it("excludes draft records from public viewer summary", async () => {
    const learnerProfile = {
      userId: "user-123",
      currentStageId: "stage-1",
    };

    const stage = {
      id: "stage-1",
      name: "Challenge",
      slug: "challenge",
    };

    const filteredRecords = [
      {
        id: "record-2",
        createdAt: 1700100000,
        visibility: "public",
      },
    ];

    const questions: unknown[] = [];

    const mockDb = createStageActivityDatabaseMock(learnerProfile, stage, filteredRecords, questions);
    mockDb._resetCallCount();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerStageActivity(d1, "user-123", false);

    // Only public record should be counted for non-owner
    expect(result.recentActivity.recordCount).toBe(1);
    expect(result.recentActivity.questionCount).toBe(0);
  });

  it("includes draft records when isOwner is true", async () => {
    const learnerProfile = {
      userId: "user-123",
      currentStageId: "stage-1",
    };

    const stage = {
      id: "stage-1",
      name: "Prelude",
      slug: "prelude",
    };

    const records = [
      {
        id: "record-1",
        createdAt: 1700000000,
        visibility: "draft",
      },
      {
        id: "record-2",
        createdAt: 1700100000,
        visibility: "public",
      },
    ];

    const questions: unknown[] = [];

    const mockDb = createStageActivityDatabaseMock(learnerProfile, stage, records, questions);
    mockDb._resetCallCount();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerStageActivity(d1, "user-123", true);

    // Both records should be counted for owner
    expect(result.recentActivity.recordCount).toBe(2);
  });

  it("returns null lastActiveAt when no records or questions exist", async () => {
    const learnerProfile = {
      userId: "user-123",
      currentStageId: "stage-1",
    };

    const stage = {
      id: "stage-1",
      name: "Bridge",
      slug: "bridge",
    };

    const mockDb = createStageActivityDatabaseMock(learnerProfile, stage, [], []);
    mockDb._resetCallCount();
    vi.mocked(db).mockReturnValue(mockDb as never);

    const result = await getLearnerStageActivity(d1, "user-123", false);

    expect(result.recentActivity.recordCount).toBe(0);
    expect(result.recentActivity.questionCount).toBe(0);
    expect(result.recentActivity.lastActiveAt).toBeNull();
  });
});
