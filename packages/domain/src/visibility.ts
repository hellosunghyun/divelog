export const VISIBILITY_LABELS: Record<string, string> = {
  draft: "임시저장",
  private: "나만 보기",
  cohort: "코호트 공개",
  public: "전체 공개",
};

export const VISIBILITY_OPTIONS = ["draft", "private", "cohort", "public"] as const;

export type Visibility = (typeof VISIBILITY_OPTIONS)[number];
