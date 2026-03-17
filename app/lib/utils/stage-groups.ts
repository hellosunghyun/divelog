export type StageType = "prelude" | "bridge" | "challenge" | "epilogue";
export type StageGroupType = StageType | "unassigned";

export type RecordListItem = {
  stageId: string | null;
  format: "note" | "article";
  createdAt: number;
  [key: string]: unknown;
};

export type StageListItem = {
  id: string;
  name: string;
  type: StageType;
  order: number;
};

export type StageGroup<TRecord extends RecordListItem = RecordListItem> = {
  stageId: string | null;
  stageName: string;
  stageType: StageGroupType;
  stageOrder: number;
  notes: TRecord[];
  articles: TRecord[];
  allRecords: TRecord[];
};

const UNASSIGNED_STAGE_KEY = "__unassigned__";
const UNASSIGNED_STAGE_NAME = "미분류";
const UNASSIGNED_STAGE_ORDER = Number.MAX_SAFE_INTEGER;

function sortRecordsByCreatedAt<TRecord extends RecordListItem>(records: TRecord[]): TRecord[] {
  return [...records].sort((a, b) => b.createdAt - a.createdAt);
}

export function groupRecordsByStage<TRecord extends RecordListItem>(
  records: TRecord[],
  stages: StageListItem[],
): StageGroup<TRecord>[] {
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  const groupedRecords = new Map<string, Omit<StageGroup<TRecord>, "notes" | "articles" | "allRecords"> & { records: TRecord[] }>();

  for (const record of records) {
    const matchedStage = record.stageId ? stageMap.get(record.stageId) : undefined;
    const groupKey = matchedStage?.id ?? UNASSIGNED_STAGE_KEY;
    const existingGroup = groupedRecords.get(groupKey);

    if (existingGroup) {
      existingGroup.records.push(record);
      continue;
    }

    groupedRecords.set(groupKey, {
      stageId: matchedStage?.id ?? null,
      stageName: matchedStage?.name ?? UNASSIGNED_STAGE_NAME,
      stageType: matchedStage?.type ?? "unassigned",
      stageOrder: matchedStage?.order ?? UNASSIGNED_STAGE_ORDER,
      records: [record],
    });
  }

  return Array.from(groupedRecords.values())
    .map(({ records: stageRecords, ...group }) => {
      const allRecords = sortRecordsByCreatedAt(stageRecords);

      return {
        ...group,
        notes: allRecords.filter((record) => record.format === "note"),
        articles: allRecords.filter((record) => record.format === "article"),
        allRecords,
      };
    })
    .sort((a, b) => {
      if (a.stageOrder !== b.stageOrder) {
        return a.stageOrder - b.stageOrder;
      }

      if (a.stageId === null) {
        return 1;
      }

      if (b.stageId === null) {
        return -1;
      }

      return a.stageName.localeCompare(b.stageName, "ko");
    });
}
