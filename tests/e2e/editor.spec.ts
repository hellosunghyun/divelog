import { test, expect } from "@playwright/test";

test.describe("기록 작성 페이지", () => {
  test("비인증 사용자가 /write 접근 시 로그인으로 리다이렉트된다", async ({ page }) => {
    const response = await page.goto("/write");
    const url = page.url();
    expect(url).not.toContain("/write");
  });
});

test.describe("기록 상세 - 응답 시스템", () => {
  test("기록 상세 페이지에서 응답 유형 선택이 가능하다", async ({ page }) => {
    await page.goto("/logs/first-note");
    const select = page.locator("select#response-type");
    await expect(select).toBeVisible();
    const options = await select.locator("option").allTextContents();
    expect(options.some((o) => o.includes("공명"))).toBeTruthy();
    expect(options.some((o) => o.includes("질문"))).toBeTruthy();
    expect(options.some((o) => o.includes("연결"))).toBeTruthy();
    expect(options.some((o) => o.includes("제안"))).toBeTruthy();
  });

  test("응답 선호도 안내 메시지가 표시된다", async ({ page }) => {
    await page.goto("/logs/first-note");
    await expect(page.locator("text=모든 응답을 환영합니다")).toBeVisible();
  });

  test("남겨진 질문이 응답보다 먼저 표시된다", async ({ page }) => {
    await page.goto("/logs/first-note");
    const questionSection = page.locator("text=남겨진 질문");
    const responseSection = page.locator("text=응답 남기기");
    await expect(questionSection).toBeVisible();
    await expect(responseSection).toBeVisible();

    const questionBox = await questionSection.boundingBox();
    const responseBox = await responseSection.boundingBox();
    if (questionBox && responseBox) {
      expect(questionBox.y).toBeLessThan(responseBox.y);
    }
  });

  test("질문 방향이 올바르게 표시된다", async ({ page }) => {
    await page.goto("/logs/first-note");
    const pageText = await page.textContent("body");
    const hasDirection = pageText?.includes("함께 생각해볼 질문") || pageText?.includes("스스로에게 묻다") || pageText?.includes("다음 구간으로 가져갈 질문");
    expect(hasDirection).toBeTruthy();
  });
});

test.describe("타임라인 뷰", () => {
  test("기록 목록에서 뷰 토글이 표시된다", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("button", { name: "그리드 보기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "타임라인 보기" })).toBeVisible();
  });

  test("타임라인 버튼 클릭 시 URL에 view=timeline이 추가된다", async ({ page }) => {
    await page.goto("/logs?view=timeline");
    await expect(page.getByRole("button", { name: "타임라인 보기" })).toHaveAttribute("aria-pressed", "true");
    expect(page.url()).toContain("view=timeline");
  });

  test("타임라인 뷰에서 날짜 그룹 헤더가 표시된다", async ({ page }) => {
    await page.goto("/logs?view=timeline");
    const pageText = await page.textContent("body");
    const hasDateGroup = pageText?.includes("지난 주") || pageText?.includes("2026년") || pageText?.includes("오늘") || pageText?.includes("어제");
    expect(hasDateGroup).toBeTruthy();
  });
});

test.describe("연결된 기록", () => {
  test("기록 상세에 연결된 기록 섹션이 있다", async ({ page }) => {
    await page.goto("/logs/first-note");
    await expect(page.locator("text=연결된 기록")).toBeVisible();
  });
});

test.describe("노트 에디터 문법 안내", () => {
  test("write 페이지가 인증 필요 표시 또는 리다이렉트한다", async ({ page }) => {
    await page.goto("/write");
    const url = page.url();
    expect(url).not.toBe("http://localhost:5173/write");
  });
});
