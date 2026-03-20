import { describe, expect, it } from "vitest";

function formatBadgeText(unreadCount: number): string {
  if (unreadCount === 0) {
    return "";
  }
  if (unreadCount > 9) {
    return "9+";
  }
  return String(unreadCount);
}

function shouldShowBadge(unreadCount: number): boolean {
  return unreadCount > 0;
}

describe("GlobalNav badge rendering logic", () => {
  describe("badge visibility", () => {
    it("unreadCount = 0일 때 배지를 숨긴다", () => {
      const unreadCount = 0;
      expect(shouldShowBadge(unreadCount)).toBe(false);
    });

    it("unreadCount = 1일 때 배지를 표시한다", () => {
      const unreadCount = 1;
      expect(shouldShowBadge(unreadCount)).toBe(true);
    });

    it("unreadCount = 5일 때 배지를 표시한다", () => {
      const unreadCount = 5;
      expect(shouldShowBadge(unreadCount)).toBe(true);
    });

    it("unreadCount = 9일 때 배지를 표시한다", () => {
      const unreadCount = 9;
      expect(shouldShowBadge(unreadCount)).toBe(true);
    });

    it("unreadCount = 10일 때 배지를 표시한다", () => {
      const unreadCount = 10;
      expect(shouldShowBadge(unreadCount)).toBe(true);
    });

    it("unreadCount = 99일 때 배지를 표시한다", () => {
      const unreadCount = 99;
      expect(shouldShowBadge(unreadCount)).toBe(true);
    });
  });

  describe("badge text content", () => {
    it("unreadCount = 0일 때 빈 문자열을 반환한다", () => {
      const unreadCount = 0;
      expect(formatBadgeText(unreadCount)).toBe("");
    });

    it("unreadCount = 1일 때 '1'을 표시한다", () => {
      const unreadCount = 1;
      expect(formatBadgeText(unreadCount)).toBe("1");
    });

    it("unreadCount = 5일 때 '5'를 표시한다", () => {
      const unreadCount = 5;
      expect(formatBadgeText(unreadCount)).toBe("5");
    });

    it("unreadCount = 9일 때 '9'를 표시한다", () => {
      const unreadCount = 9;
      expect(formatBadgeText(unreadCount)).toBe("9");
    });

    it("unreadCount = 10일 때 '9+'를 표시한다", () => {
      const unreadCount = 10;
      expect(formatBadgeText(unreadCount)).toBe("9+");
    });

    it("unreadCount = 99일 때 '9+'를 표시한다", () => {
      const unreadCount = 99;
      expect(formatBadgeText(unreadCount)).toBe("9+");
    });

    it("unreadCount = 100일 때 '9+'를 표시한다", () => {
      const unreadCount = 100;
      expect(formatBadgeText(unreadCount)).toBe("9+");
    });
  });

  describe("badge truncation at 10+", () => {
    it("10 이상의 모든 값은 '9+'로 표시된다", () => {
      const testCases = [10, 11, 20, 50, 99, 100, 999];
      testCases.forEach((count) => {
        expect(formatBadgeText(count)).toBe("9+");
      });
    });

    it("9 이하의 값은 정확한 숫자를 표시한다", () => {
      const testCases = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      testCases.forEach((count) => {
        expect(formatBadgeText(count)).toBe(String(count));
      });
    });
  });
});
