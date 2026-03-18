import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { useRouteLoaderData } from "react-router";
import { render } from "~/lib/test-utils";

import LearnerDetailPage from "../$learnerSlug";
import { buildEmptyLearnerProfile, buildPopulatedLearnerProfile } from "./fixtures";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useRouteLoaderData: vi.fn(),
  };
});

type LoaderData = Awaited<ReturnType<typeof import("../$learnerSlug.server").loader>>;

const LearnerDetailPageComponent = LearnerDetailPage as unknown as (props: {
  loaderData: LoaderData;
}) => ReturnType<typeof LearnerDetailPage>;

function buildLoaderData(overrides?: Partial<LoaderData>): LoaderData {
  const fixture = buildPopulatedLearnerProfile();
  const now = Math.floor(Date.now() / 1000);

  const base = {
    learner: {
      ...fixture.learner,
      email: null,
      currentStageId: null,
      notificationEmailEnabled: true,
      defaultVisibility: "public",
      createdAt: now,
      updatedAt: now,
    },
    learnerRecords: [
      {
        record: {
          id: "record-001",
          slug: "first-record",
          authorId: fixture.learner.userId,
          challengeId: null,
          collaborationUnitId: null,
          linkedRecordId: null,
          originalUrl: null,
          originalTitle: null,
          originalDescription: null,
          title: "첫 번째 기록",
          content: "첫 번째 기록 내용",
          contentText: "첫 번째 기록 내용",
          format: "note",
          type: "personal",
          rhythm: "weekly",
          visibility: "public",
          responsePreference: "open",
          isFeatured: false,
          moderationStatus: "clean",
          moderationNote: null,
          cohort: fixture.learner.cohort,
          recordedAt: now,
          recordedEndAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        record: {
          id: "record-002",
          slug: "second-record",
          authorId: fixture.learner.userId,
          challengeId: null,
          collaborationUnitId: null,
          linkedRecordId: null,
          originalUrl: null,
          originalTitle: null,
          originalDescription: null,
          title: "두 번째 기록",
          content: "두 번째 기록 내용",
          contentText: "두 번째 기록 내용",
          format: "note",
          type: "personal",
          rhythm: "weekly",
          visibility: "public",
          responsePreference: "open",
          isFeatured: false,
          moderationStatus: "clean",
          moderationNote: null,
          cohort: fixture.learner.cohort,
          recordedAt: now,
          recordedEndAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        record: {
          id: "record-003",
          slug: "third-record",
          authorId: fixture.learner.userId,
          challengeId: null,
          collaborationUnitId: null,
          linkedRecordId: null,
          originalUrl: null,
          originalTitle: null,
          originalDescription: null,
          title: "세 번째 기록",
          content: "세 번째 기록 내용",
          contentText: "세 번째 기록 내용",
          format: "note",
          type: "personal",
          rhythm: "weekly",
          visibility: "public",
          responsePreference: "open",
          isFeatured: false,
          moderationStatus: "clean",
          moderationNote: null,
          cohort: fixture.learner.cohort,
          recordedAt: now,
          recordedEndAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    ],
    learnerQuestions: [],
    learnerSentences: [
      {
        sentence: {
          id: "sentence-001",
          recordId: "record-001",
          savedById: fixture.learner.userId,
          content: "남겨둔 문장",
          reason: null,
          paragraphIndex: null,
          createdAt: now,
        },
      },
    ],
    collaborationUnits: [],
    participatedRecords: [],
    mentionedRecords: [],
    participantsByRecordId: {},
    profileIntro: fixture.profileIntro,
    contextLine: fixture.contextLine,
    interestTags: fixture.interestTags,
    currentStage: fixture.currentStage,
    recentActivity: {
      recordCount: fixture.recentActivity?.recordCount ?? 0,
      questionCount: fixture.recentActivity?.questionCount ?? 0,
      lastActiveAt: fixture.recentActivity?.lastActiveAt ?? null,
    },
    selfAnswers: fixture.selfAnswers,
  } as unknown as LoaderData;

  return {
    ...base,
    ...overrides,
  };
}

function renderPage(loaderData: LoaderData) {
  return render(<LearnerDetailPageComponent loaderData={loaderData} />);
}

describe("learner slug route integration", () => {
  beforeEach(() => {
    vi.mocked(useRouteLoaderData).mockReturnValue({ user: { id: "another-user" } } as never);
  });

  it("renders ProfileIntroBlock with enriched data", () => {
    const loaderData = buildLoaderData();

    renderPage(loaderData);

    expect(screen.getByTestId("learner-profile-page")).toBeInTheDocument();
    expect(screen.getByTestId("profile-intro-block")).toBeInTheDocument();
    expect(screen.getByText(loaderData.profileIntro ?? "")).toBeInTheDocument();
    expect(screen.getByText(loaderData.contextLine ?? "")).toBeInTheDocument();
    expect(screen.getByText(`"${loaderData.learner.currentQuestion}"`)).toBeInTheDocument();
    expect(screen.queryByText("지금 탐구 중인 질문")).not.toBeInTheDocument();
  });

  it("renders DiscoveryHelperBlocks", () => {
    const loaderData = buildLoaderData();

    renderPage(loaderData);

    expect(screen.getByTestId("current-stage-block")).toBeInTheDocument();
    expect(screen.getByTestId("recent-activity-block")).toBeInTheDocument();
    const starterLinks = screen.getByTestId("starter-links");
    expect(starterLinks).toBeInTheDocument();
    expect(within(starterLinks).getByRole("link", { name: "첫 번째 기록" })).toHaveAttribute(
      "href",
      "/logs/first-record"
    );
    expect(within(starterLinks).getByRole("link", { name: "두 번째 기록" })).toHaveAttribute(
      "href",
      "/logs/second-record"
    );
    expect(within(starterLinks).queryByRole("link", { name: "세 번째 기록" })).not.toBeInTheDocument();
  });

  it("renders SelfAnswerSection", () => {
    const loaderData = buildLoaderData();

    renderPage(loaderData);

    expect(screen.getByTestId("self-answer-section")).toBeInTheDocument();
    expect(screen.getAllByTestId("self-answer-card")).toHaveLength(loaderData.selfAnswers.length);
    expect(screen.getByText(loaderData.selfAnswers[0].questionTitle)).toBeInTheDocument();
  });

  it("hides sections gracefully when data is empty", () => {
    const emptyFixture = buildEmptyLearnerProfile();
    const loaderData = buildLoaderData({
      learner: {
        ...emptyFixture.learner,
        email: null,
        currentStageId: null,
        notificationEmailEnabled: true,
        defaultVisibility: "public",
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      } as unknown as LoaderData["learner"],
      learnerRecords: [],
      learnerQuestions: [],
      learnerSentences: [],
      profileIntro: emptyFixture.profileIntro,
      contextLine: emptyFixture.contextLine,
      interestTags: emptyFixture.interestTags,
      currentStage: emptyFixture.currentStage,
      selfAnswers: emptyFixture.selfAnswers,
    });

    loaderData.recentActivity = {
      recordCount: 0,
      questionCount: 0,
      lastActiveAt: null,
    };

    renderPage(loaderData);

    expect(screen.queryByTestId("profile-intro-block")).not.toBeInTheDocument();
    expect(screen.queryByTestId("current-stage-block")).not.toBeInTheDocument();
    expect(screen.queryByTestId("recent-activity-block")).not.toBeInTheDocument();
    expect(screen.queryByTestId("starter-links")).not.toBeInTheDocument();
    expect(screen.getByTestId("self-answer-section")).toBeInTheDocument();
    expect(screen.getByText("아직 자기답변이 없습니다")).toBeInTheDocument();
  });
});
