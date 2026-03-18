/**
 * Record diff utility functions for tracking changes between record states.
 * Pure functions - no database or external dependencies.
 */

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TagDiff {
  added: string[];
  removed: string[];
}

export interface FormattedChange {
  label: string;
  summary: string;
}

interface Tag {
  id: string;
  name: string;
}

interface RecordState {
  title?: string;
  content?: string;
  contentText?: string;
  format?: string;
  type?: string;
  rhythm?: string;
  visibility?: string;
  responsePreference?: string;
  stageId?: string | null;
  challengeId?: string | null;
  collaborationUnitId?: string | null;
}

const TRACKED_FIELDS = [
  "title",
  "content",
  "contentText",
  "format",
  "type",
  "rhythm",
  "visibility",
  "responsePreference",
  "stageId",
  "challengeId",
  "collaborationUnitId",
] as const;

const FIELD_LABELS: Record<string, string> = {
  title: "제목",
  content: "내용",
  contentText: "내용 텍스트",
  format: "형식",
  type: "유형",
  rhythm: "리듬",
  visibility: "공개 범위",
  responsePreference: "응답 선호도",
  stageId: "스테이지",
  challengeId: "챌린지",
  collaborationUnitId: "협업 유닛",
  tags: "태그",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  format: {
    note: "노트",
    article: "글",
  },
  type: {
    personal: "개인",
    challenge: "챌린지",
    collaboration: "협업",
  },
  rhythm: {
    moment: "순간",
    sprint: "스프린트",
    weekly: "주간",
    monthly: "월간",
    stage: "스테이지",
    reflection: "성찰",
    free: "자유",
  },
   visibility: {
     draft: "임시저장",
     private: "나만 보기",
     cohort: "코호트 공개",
     public: "전체 공개",
   },
  responsePreference: {
    open: "열린 응답",
    question_only: "질문만",
    closed: "닫힘",
  },
};

/**
 * Compare two record states and return array of field changes.
 * Only compares tracked fields using deep equality.
 */
export function compareRecordStates(
  oldState: RecordState,
  newState: RecordState,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldValue = oldState[field as keyof RecordState];
    const newValue = newState[field as keyof RecordState];

    // Deep equality check using JSON.stringify
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

/**
 * Compare two tag arrays and return added/removed tag names.
 * Comparison is by tag ID.
 */
export function computeTagDiff(
  oldTags: Tag[],
  newTags: Tag[],
): TagDiff {
  const oldIds = new Set(oldTags.map((t) => t.id));
  const newIds = new Set(newTags.map((t) => t.id));

  const added: string[] = [];
  const removed: string[] = [];

  // Find added tags
  for (const tag of newTags) {
    if (!oldIds.has(tag.id)) {
      added.push(tag.name);
    }
  }

  // Find removed tags
  for (const tag of oldTags) {
    if (!newIds.has(tag.id)) {
      removed.push(tag.name);
    }
  }

  return { added, removed };
}

/**
 * Format a field change into human-readable label and summary.
 * Special handling for "content" field (character count delta).
 */
export function formatFieldChange(
  field: string,
  oldValue: unknown,
  newValue: unknown,
): FormattedChange {
  const label = FIELD_LABELS[field] || field;

  // Special case: content field shows character count delta
  if (field === "content") {
    const oldCount = typeof oldValue === "string" ? oldValue.length : 0;
    const newCount = typeof newValue === "string" ? newValue.length : 0;
    const delta = newCount - oldCount;
    const sign = delta >= 0 ? "+" : "";
    const summary = `내용이 수정되었습니다 (${sign}${delta}자)`;
    return { label, summary };
  }

  // Standard case: format old → new
  const oldFormatted = formatValue(field, oldValue);
  const newFormatted = formatValue(field, newValue);
  const summary = `${oldFormatted} → ${newFormatted}`;

  return { label, summary };
}

/**
 * Check if there are any actual changes between two record states.
 */
export function hasActualChanges(
  oldState: RecordState,
  newState: RecordState,
): boolean {
  return compareRecordStates(oldState, newState).length > 0;
}

/**
 * Helper: Format a value for display based on field type.
 */
function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "없음";
  }

  const fieldLabels = VALUE_LABELS[field];
  if (fieldLabels && typeof value === "string" && value in fieldLabels) {
    return fieldLabels[value];
  }

  return String(value);
}
