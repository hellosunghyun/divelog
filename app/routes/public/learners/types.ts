export interface EnrichedLearnerProfile {
  learner: {
    userId: string;
    displayName: string;
    slug: string;
    cohort: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    currentQuestion: string | null;
  };
  profileIntro: string | null;
  contextLine: string | null;
  currentStage: {
    id: string;
    name: string;
    slug: string;
  } | null;
  recentActivity: {
    recordCount: number;
    questionCount: number;
    lastActiveAt: string | null;
  } | null;
  selfAnswers: Array<{
    id: string;
    questionTitle: string;
    snippet: string;
    recordSlug: string;
  }>;
}
