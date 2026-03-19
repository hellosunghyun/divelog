export const RECORD_TYPES = ["exploration", "learning", "project", "retrospective", "hobby", "encounter"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  exploration: "탐구",
  learning: "학습",
  project: "프로젝트",
  retrospective: "회고",
  hobby: "취미",
  encounter: "만남",
};

export const DEFAULT_RECORD_TYPE: RecordType = "exploration";
