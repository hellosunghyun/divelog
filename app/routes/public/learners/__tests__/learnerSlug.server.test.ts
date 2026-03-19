import { beforeEach, describe, expect, it, vi } from "vitest";

import { loader } from "../$learnerSlug.server";
import { buildEmptyLearnerProfile, buildPopulatedLearnerProfile } from "./fixtures";
import { db } from "~/db/client.server";
import { getRecordsWithMention } from "~/db/queries/dialogue/mentions.server";
import { getLearnerSelfAnswerSummary } from "~/db/queries/dialogue/selfAnswers.server";
import { getLearnerInterestTags, getLearnerStageActivity } from "~/db/queries/learners/learners.server";
import { getParticipantsBatch, getRecordsWithParticipant } from "~/db/queries/records/participants.server";
import { fetchAdaProfile, resolveContextLine, resolveProfileIntro } from "~/lib/auth/ada-profile.server";
import { getAuth } from "~/lib/auth/auth.server";

vi.mock("~/db/client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/db/queries/records/participants.server", () => ({
  getRecordsWithParticipant: vi.fn(),
  getParticipantsBatch: vi.fn(),
}));

vi.mock("~/db/queries/dialogue/mentions.server", () => ({
  getRecordsWithMention: vi.fn(),
}));

vi.mock("~/db/queries/learners/learners.server", () => ({
  getLearnerInterestTags: vi.fn(),
  getLearnerStageActivity: vi.fn(),
}));

vi.mock("~/db/queries/dialogue/selfAnswers.server", () => ({
  getLearnerSelfAnswerSummary: vi.fn(),
}));

vi.mock("~/lib/auth/auth.server", () => ({
  getAuth: vi.fn(),
}));

vi.mock("~/lib/infra/logger.server", () => ({
  createLogger: vi.fn(() => ({
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("~/lib/auth/ada-profile.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/lib/auth/ada-profile.server")>();
  return {
    ...actual,
    fetchAdaProfile: vi.fn(),
    resolveProfileIntro: vi.fn(actual.resolveProfileIntro),
    resolveContextLine: vi.fn(actual.resolveContextLine),
  };
});

function createContext() {
  return {
    cloudflare: {
      env: {
        DB: {} as D1Database,
        ADAKRPOS_API_KEY: "test-api-key",
      },
    },
  };
}

function createRequest() {
  return new Request("http://localhost/learners/kim-sunghyun");
}

function createDatabaseMock(options: {
  learner: Record<string, unknown> | null;
  learnerRecords?: unknown[];
  learnerQuestions?: unknown[];
  learnerSentences?: unknown[];
}) {
  let selectCallCount = 0;

  const learnerLimit = vi.fn(async () => (options.learner ? [options.learner] : []));
  const learnerWhere = vi.fn(() => ({ limit: learnerLimit }));
  const learnerFrom = vi.fn(() => ({ where: learnerWhere }));

  function createBatchQueryBuilder() {
    const limit = vi.fn(() => Symbol("query"));
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy, limit }));
    const leftJoin = vi.fn(() => ({ leftJoin, where }));
    const from = vi.fn(() => ({ leftJoin, where }));
    return { from };
  }

  const select = vi.fn(() => {
    selectCallCount += 1;
    if (selectCallCount === 1) {
      return { from: learnerFrom };
    }
    return createBatchQueryBuilder();
  });

  const batch = vi.fn(async () => [
    options.learnerRecords ?? [],
    options.learnerQuestions ?? [],
    options.learnerSentences ?? [],
  ]);

  return { select, batch };
}

describe("learner slug loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRecordsWithParticipant).mockResolvedValue([]);
    vi.mocked(getRecordsWithMention).mockResolvedValue([]);
    vi.mocked(getParticipantsBatch).mockResolvedValue([]);
    vi.mocked(getLearnerInterestTags).mockResolvedValue([]);
    vi.mocked(getLearnerSelfAnswerSummary).mockResolvedValue([]);
    vi.mocked(fetchAdaProfile).mockResolvedValue(null);
    vi.mocked(getAuth).mockResolvedValue({
      isAuthenticated: false,
      user: null,
      session: null,
    });
  });

  it("returns enriched profile payload for populated learner", async () => {
    const fixture = buildPopulatedLearnerProfile();
    const databaseMock = createDatabaseMock({
      learner: fixture.learner,
      learnerRecords: [{ record: { id: "record-1" } }],
    });
    vi.mocked(db).mockReturnValue(databaseMock as never);

    vi.mocked(getAuth).mockResolvedValue({
      isAuthenticated: true,
      user: {
        id: fixture.learner.userId,
        email: "test@example.com",
        verifiedEmail: true,
        nickname: "test",
        name: "Test User",
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        metadata: {},
      },
      session: null,
    } as unknown as Awaited<ReturnType<typeof getAuth>>);
    vi.mocked(fetchAdaProfile).mockResolvedValue({ bio: fixture.profileIntro } as never);
    vi.mocked(getLearnerInterestTags).mockResolvedValue(fixture.interestTags);
    vi.mocked(getLearnerStageActivity).mockResolvedValue({
      currentStage: fixture.currentStage,
      recentActivity: fixture.recentActivity ?? {
        recordCount: 0,
        questionCount: 0,
        lastActiveAt: null,
      },
    });
    vi.mocked(getLearnerSelfAnswerSummary).mockResolvedValue(fixture.selfAnswers);

    const result = await loader({
      params: { learnerSlug: fixture.learner.slug },
      request: createRequest(),
      context: createContext(),
    } as unknown as Parameters<typeof loader>[0]);

    expect(result.learner).toEqual(fixture.learner);
    expect(result.profileIntro).toBe(fixture.profileIntro);
    expect(result.contextLine).toBe(resolveContextLine(fixture.learner.cohort, fixture.currentStage?.name ?? null));
    expect(result.interestTags).toEqual(fixture.interestTags);
    expect(result.currentStage).toEqual(fixture.currentStage);
    expect(result.recentActivity).toEqual(fixture.recentActivity);
    expect(result.selfAnswers).toEqual(fixture.selfAnswers);

    expect(resolveProfileIntro).toHaveBeenCalledWith(null, fixture.learner.bio);
    expect(getLearnerInterestTags).toHaveBeenCalledWith(expect.anything(), fixture.learner.userId);
    expect(getLearnerStageActivity).toHaveBeenCalledWith(expect.anything(), fixture.learner.userId, true, undefined);
    expect(getLearnerSelfAnswerSummary).toHaveBeenCalledWith(expect.anything(), fixture.learner.userId);
  });

  it("filters hidden activity for non-owner", async () => {
    const fixture = buildPopulatedLearnerProfile();
    const databaseMock = createDatabaseMock({
      learner: fixture.learner,
      learnerRecords: [{ record: { id: "record-1" } }],
    });
    vi.mocked(db).mockReturnValue(databaseMock as never);

    vi.mocked(getAuth).mockResolvedValue({
      isAuthenticated: true,
      user: {
        id: "different-user",
        email: "other@example.com",
        verifiedEmail: true,
        nickname: "other",
        name: "Other User",
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        metadata: {},
      },
      session: null,
    } as unknown as Awaited<ReturnType<typeof getAuth>>);

    vi.mocked(getLearnerStageActivity).mockResolvedValue({
      currentStage: fixture.currentStage,
      recentActivity: {
        recordCount: 1,
        questionCount: 2,
        lastActiveAt: fixture.recentActivity?.lastActiveAt ?? null,
      },
    });

    vi.mocked(getRecordsWithParticipant).mockResolvedValue([
      { record: { id: "a", visibility: "draft" } },
      { record: { id: "b", visibility: "public" } },
    ] as never);
    vi.mocked(getRecordsWithMention).mockResolvedValue([
      { record: { id: "c", visibility: "draft" } },
      { record: { id: "d", visibility: "public" } },
    ] as never);

    const result = await loader({
      params: { learnerSlug: fixture.learner.slug },
      request: createRequest(),
      context: createContext(),
    } as unknown as Parameters<typeof loader>[0]);

    expect(getLearnerStageActivity).toHaveBeenCalledWith(expect.anything(), fixture.learner.userId, false, undefined);
    expect(result.participatedRecords).toEqual([{ record: { id: "b", visibility: "public" } }]);
    expect(result.mentionedRecords).toEqual([{ record: { id: "d", visibility: "public" } }]);
  });

  it("handles null stage gracefully", async () => {
    const fixture = buildEmptyLearnerProfile();
    const databaseMock = createDatabaseMock({ learner: fixture.learner });
    vi.mocked(db).mockReturnValue(databaseMock as never);

    vi.mocked(getLearnerStageActivity).mockResolvedValue({
      currentStage: null,
      recentActivity: {
        recordCount: 0,
        questionCount: 0,
        lastActiveAt: null,
      },
    });

    const result = await loader({
      params: { learnerSlug: fixture.learner.slug },
      request: createRequest(),
      context: createContext(),
    } as unknown as Parameters<typeof loader>[0]);

    expect(result.currentStage).toBeNull();
    expect(result.contextLine).toBe(resolveContextLine(fixture.learner.cohort, null));
    expect(resolveContextLine).toHaveBeenCalledWith(fixture.learner.cohort, null);
  });
});
