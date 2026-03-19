import type { EnrichedLearnerProfile } from "../types";

export function buildPopulatedLearnerProfile(): EnrichedLearnerProfile {
  return {
    learner: {
      userId: "user-001",
      displayName: "김성현",
      slug: "kim-sunghyun",
      cohort: "2026-1",
      bio: "기록과 질문을 통해 성장하는 러너입니다.",
      profilePhotoUrl: "https://example.com/photo.jpg",
      currentQuestion: "좋은 기록이란 무엇인가?",
    },
    profileIntro:
      "기록과 질문을 통해 성장하는 러너입니다.",
    contextLine: "2026-1 코호트 · 현재 Bridge 단계",
    currentStage: {
      id: "stage-002",
      name: "Bridge",
      slug: "bridge",
    },
    recentActivity: {
      recordCount: 12,
      questionCount: 5,
      lastActiveAt: new Date().toISOString(),
    },
    selfAnswers: [
      {
        id: "answer-001",
        questionTitle: "좋은 기록이란 무엇인가?",
        snippet: "좋은 기록은 자신의 생각을 명확히 하는 과정입니다.",
        recordSlug: "my-first-reflection",
      },
      {
        id: "answer-002",
        questionTitle: "어떻게 성장할 수 있을까?",
        snippet: "작은 실천의 반복이 큰 변화를 만듭니다.",
        recordSlug: "growth-journey",
      },
    ],
  };
}

export function buildEmptyLearnerProfile(): EnrichedLearnerProfile {
  return {
    learner: {
      userId: "user-002",
      displayName: "이순신",
      slug: "lee-sunsin",
      cohort: "2026-2",
      bio: null,
      profilePhotoUrl: null,
      currentQuestion: null,
    },
    profileIntro: null,
    contextLine: null,
    currentStage: null,
    recentActivity: null,
    selfAnswers: [],
  };
}
