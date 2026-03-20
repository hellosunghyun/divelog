import { describe, it, expect } from "vitest";
import type { EnrichedLearnerProfile } from "../types";

function buildPopulatedLearnerProfile(): EnrichedLearnerProfile {
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
    interestTags: [
      { slug: "reflection", name: "성찰" },
      { slug: "learning", name: "학습" },
      { slug: "design", name: "디자인" },
    ],
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

function buildEmptyLearnerProfile(): EnrichedLearnerProfile {
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
    interestTags: [],
    currentStage: null,
    recentActivity: null,
    selfAnswers: [],
  };
}

describe("Profile Enrichment Contracts", () => {
  describe("buildPopulatedLearnerProfile", () => {
    it("builds populated learner profile fixture", () => {
      const profile = buildPopulatedLearnerProfile();

      // Base learner fields
      expect(profile.learner).toBeDefined();
      expect(profile.learner.userId).toBeDefined();
      expect(profile.learner.displayName).toBeDefined();
      expect(profile.learner.slug).toBeDefined();
      expect(profile.learner.cohort).toBeDefined();
      expect(profile.learner.bio).toBeDefined();
      expect(profile.learner.profilePhotoUrl).toBeDefined();
      expect(profile.learner.currentQuestion).toBeDefined();

      // Enriched fields
      expect(profile.profileIntro).toBeDefined();
      expect(typeof profile.profileIntro).toBe("string");

      expect(profile.contextLine).toBeDefined();
      expect(typeof profile.contextLine).toBe("string");

      expect(profile.interestTags).toBeDefined();
      expect(Array.isArray(profile.interestTags)).toBe(true);
      expect(profile.interestTags.length).toBeGreaterThan(0);
      profile.interestTags.forEach((tag) => {
        expect(tag.slug).toBeDefined();
        expect(tag.name).toBeDefined();
      });

      expect(profile.currentStage).toBeDefined();
      expect(profile.currentStage).not.toBeNull();
      expect(profile.currentStage?.id).toBeDefined();
      expect(profile.currentStage?.name).toBeDefined();
      expect(profile.currentStage?.slug).toBeDefined();

      expect(profile.recentActivity).toBeDefined();
      expect(profile.recentActivity).not.toBeNull();
      expect(profile.recentActivity?.recordCount).toBeGreaterThanOrEqual(0);
      expect(profile.recentActivity?.questionCount).toBeGreaterThanOrEqual(0);
      expect(profile.recentActivity?.lastActiveAt).toBeDefined();

      expect(profile.selfAnswers).toBeDefined();
      expect(Array.isArray(profile.selfAnswers)).toBe(true);
      profile.selfAnswers.forEach((answer) => {
        expect(answer.id).toBeDefined();
        expect(answer.questionTitle).toBeDefined();
        expect(answer.snippet).toBeDefined();
        expect(answer.recordSlug).toBeDefined();
      });
    });
  });

  describe("buildEmptyLearnerProfile", () => {
    it("builds empty learner profile fixture", () => {
      const profile = buildEmptyLearnerProfile();

      // Base learner fields
      expect(profile.learner).toBeDefined();
      expect(profile.learner.userId).toBeDefined();
      expect(profile.learner.displayName).toBeDefined();
      expect(profile.learner.slug).toBeDefined();

      // Enriched fields should be null or empty
      expect(profile.profileIntro).toBeNull();
      expect(profile.contextLine).toBeNull();
      expect(profile.interestTags).toEqual([]);
      expect(profile.currentStage).toBeNull();
      expect(profile.recentActivity).toBeNull();
      expect(profile.selfAnswers).toEqual([]);
    });
  });
});
