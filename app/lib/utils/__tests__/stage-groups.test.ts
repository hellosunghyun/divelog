import { describe, expect, it } from "vitest";

import { groupRecordsByStage, type RecordListItem, type StageListItem } from "../stage-groups";

type TestRecord = RecordListItem & {
  id: string;
  title: string;
};

function createStage(overrides: Partial<StageListItem> = {}): StageListItem {
  return {
    id: "stage-1",
    name: "Prelude",
    type: "prelude",
    order: 1,
    ...overrides,
  };
}

function createRecord(overrides: Partial<TestRecord> = {}): TestRecord {
  return {
    id: "record-1",
    title: "기록",
    stageId: "stage-1",
    format: "note",
    createdAt: 100,
    ...overrides,
  };
}

describe("groupRecordsByStage", () => {
  it("여러 Stage 그룹을 order 오름차순으로 정렬한다", () => {
    const stages = [
      createStage({ id: "stage-3", name: "Challenge", type: "challenge", order: 3 }),
      createStage({ id: "stage-1", name: "Prelude", type: "prelude", order: 1 }),
      createStage({ id: "stage-2", name: "Bridge", type: "bridge", order: 2 }),
    ];

    const records = [
      createRecord({ id: "record-1", stageId: "stage-3", createdAt: 120 }),
      createRecord({ id: "record-2", stageId: "stage-1", createdAt: 100 }),
      createRecord({ id: "record-3", stageId: "stage-2", createdAt: 110 }),
    ];

    const result = groupRecordsByStage(records, stages);

    expect(result.map((group) => group.stageId)).toEqual(["stage-1", "stage-2", "stage-3"]);
  });

  it("레코드가 없는 Stage는 결과에서 제외한다", () => {
    const stages = [
      createStage({ id: "stage-1", name: "Prelude", order: 1 }),
      createStage({ id: "stage-2", name: "Bridge", type: "bridge", order: 2 }),
    ];

    const records = [createRecord({ id: "record-1", stageId: "stage-1" })];

    const result = groupRecordsByStage(records, stages);

    expect(result).toHaveLength(1);
    expect(result[0]?.stageId).toBe("stage-1");
  });

  it("stageId가 null인 레코드를 미분류 그룹으로 마지막에 배치한다", () => {
    const stages = [
      createStage({ id: "stage-1", name: "Prelude", order: 1 }),
      createStage({ id: "stage-2", name: "Bridge", type: "bridge", order: 2 }),
    ];

    const records = [
      createRecord({ id: "record-1", stageId: null, createdAt: 130 }),
      createRecord({ id: "record-2", stageId: "stage-1", createdAt: 120 }),
      createRecord({ id: "record-3", stageId: "stage-2", createdAt: 110 }),
    ];

    const result = groupRecordsByStage(records, stages);
    const unassignedGroup = result.at(-1);

    expect(unassignedGroup).toMatchObject({
      stageId: null,
      stageName: "미분류",
      stageType: "unassigned",
    });
    expect(unassignedGroup?.allRecords.map((record) => record.id)).toEqual(["record-1"]);
  });

  it("단일 Stage만 있어도 올바른 그룹을 반환한다", () => {
    const stages = [createStage({ id: "stage-1", name: "Prelude", order: 1 })];
    const records = [
      createRecord({ id: "record-2", stageId: "stage-1", createdAt: 220 }),
      createRecord({ id: "record-1", stageId: "stage-1", createdAt: 210 }),
    ];

    const result = groupRecordsByStage(records, stages);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      stageId: "stage-1",
      stageName: "Prelude",
      stageType: "prelude",
      stageOrder: 1,
    });
  });

  it("각 그룹 안에서 notes와 articles를 정확히 분리한다", () => {
    const stages = [createStage({ id: "stage-1", name: "Prelude", order: 1 })];
    const records = [
      createRecord({ id: "note-1", stageId: "stage-1", format: "note", createdAt: 140 }),
      createRecord({ id: "article-1", stageId: "stage-1", format: "article", createdAt: 150 }),
      createRecord({ id: "note-2", stageId: "stage-1", format: "note", createdAt: 130 }),
    ];

    const [group] = groupRecordsByStage(records, stages);

    expect(group?.notes.map((record) => record.id)).toEqual(["note-1", "note-2"]);
    expect(group?.articles.map((record) => record.id)).toEqual(["article-1"]);
    expect(group?.allRecords.map((record) => record.id)).toEqual(["article-1", "note-1", "note-2"]);
  });

  it("빈 records 배열이면 빈 결과를 반환한다", () => {
    const stages = [createStage({ id: "stage-1", name: "Prelude", order: 1 })];

    expect(groupRecordsByStage([], stages)).toEqual([]);
  });

  it("각 Stage 그룹 내부 레코드를 createdAt 최신순으로 정렬한다", () => {
    const stages = [createStage({ id: "stage-1", name: "Prelude", order: 1 })];
    const records = [
      createRecord({ id: "record-1", stageId: "stage-1", createdAt: 100 }),
      createRecord({ id: "record-2", stageId: "stage-1", createdAt: 300 }),
      createRecord({ id: "record-3", stageId: "stage-1", createdAt: 200 }),
    ];

    const [group] = groupRecordsByStage(records, stages);

    expect(group?.allRecords.map((record) => record.id)).toEqual(["record-2", "record-3", "record-1"]);
  });
});
