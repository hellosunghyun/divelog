import { describe, expect, it } from "vitest";
import {
  formatMonthLabel,
  getCalendarDays,
  getRecordsForMonth,
  type RecordItem,
} from "../calendar";

function getExpectedCellCount(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return firstDay + daysInMonth <= 35 ? 35 : 42;
}

function createRecord(id: string, date: Date): RecordItem {
  return {
    id,
    slug: `record-${id}`,
    title: `기록 ${id}`,
    createdAt: Math.floor(date.getTime() / 1000),
  };
}

describe("getCalendarDays", () => {
  it("31일인 달의 현재 월 날짜를 정확히 반환한다", () => {
    const days = getCalendarDays(2026, 2);
    const currentMonthDays = days.filter((day) => day.isCurrentMonth);

    expect(currentMonthDays).toHaveLength(31);
    expect(days).toHaveLength(getExpectedCellCount(2026, 2));
  });

  it("평년 2월 28일을 정확히 반환한다", () => {
    const days = getCalendarDays(2025, 1);
    const currentMonthDays = days.filter((day) => day.isCurrentMonth);

    expect(currentMonthDays).toHaveLength(28);
    expect(days).toHaveLength(getExpectedCellCount(2025, 1));
  });

  it("윤년 2월 29일을 정확히 반환한다", () => {
    const days = getCalendarDays(2024, 1);
    const currentMonthDays = days.filter((day) => day.isCurrentMonth);

    expect(currentMonthDays).toHaveLength(29);
    expect(days).toHaveLength(getExpectedCellCount(2024, 1));
  });

  it("첫 번째 셀은 항상 일요일부터 시작한다", () => {
    const year = 2026;
    const month = 0;
    const leadingDays = new Date(year, month, 1).getDay();
    const days = getCalendarDays(year, month);

    expect(leadingDays).toBeGreaterThan(0);
    expect(days[0]?.date.getDay()).toBe(0);
    expect(days[leadingDays]?.day).toBe(1);
    expect(days[leadingDays]?.isCurrentMonth).toBe(true);
    expect(days[leadingDays - 1]?.isCurrentMonth).toBe(false);
  });

  it("records 필드를 빈 배열로 초기화한다", () => {
    const days = getCalendarDays(2026, 2);

    expect(days.every((day) => Array.isArray(day.records) && day.records.length === 0)).toBe(true);
  });
});

describe("getRecordsForMonth", () => {
  it("해당 월의 레코드만 날짜별로 묶는다", () => {
    const records = [
      createRecord("1", new Date(2026, 2, 1, 12)),
      createRecord("2", new Date(2026, 2, 15, 9)),
      createRecord("3", new Date(2026, 2, 15, 18)),
      createRecord("4", new Date(2026, 1, 28, 12)),
      createRecord("5", new Date(2026, 3, 1, 12)),
    ];

    const result = getRecordsForMonth(records, 2026, 2);

    expect(result.size).toBe(2);
    expect(result.get(1)?.map((record) => record.id)).toEqual(["1"]);
    expect(result.get(15)?.map((record) => record.id)).toEqual(["2", "3"]);
    expect(result.has(28)).toBe(false);
  });

  it("빈 배열이면 빈 Map을 반환한다", () => {
    const result = getRecordsForMonth([], 2026, 2);

    expect(result.size).toBe(0);
  });
});

describe("formatMonthLabel", () => {
  it('"2026년 3월" 형식으로 반환한다', () => {
    expect(formatMonthLabel(2026, 2)).toBe("2026년 3월");
  });
});
