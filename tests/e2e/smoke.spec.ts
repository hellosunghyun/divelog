import { test, expect } from "@playwright/test";

test.describe("홈페이지 스모크 테스트", () => {
  test("홈페이지가 로드되고 핵심 요소가 표시된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DiveLog/i);
    await expect(page.locator("text=여정 보기")).toBeVisible();
    await expect(page.locator("text=기록 남기기").first()).toBeVisible();
  });

  test("여정 페이지가 로드된다", async ({ page }) => {
    await page.goto("/journey");
    await expect(page).toHaveTitle(/여정/);
  });

  test("기록 목록 페이지가 로드된다", async ({ page }) => {
    await page.goto("/logs");
    await expect(page).toHaveTitle(/기록/);
  });

  test("가이드 페이지가 로드된다", async ({ page }) => {
    await page.goto("/guide");
    await expect(page).toHaveTitle(/가이드/);
  });

  test("검색 페이지가 로드된다", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveTitle(/검색/);
  });
});

test.describe("네비게이션", () => {
  test("글로벌 네비게이션이 올바른 메뉴를 포함한다", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header");
    await expect(nav.locator("text=여정")).toBeVisible();
    await expect(nav.getByRole("link", { name: "기록", exact: true })).toBeVisible();
    await expect(nav.locator("text=챌린지")).toBeVisible();
    await expect(nav.locator("text=러너")).toBeVisible();
    await expect(nav.locator("text=가이드")).toBeVisible();
  });

  test("네비게이션에 Crew/협업이 고정 메뉴에 없다", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header");
    const navText = await nav.textContent();
    expect(navText).not.toContain("Crew");
  });
});

test.describe("철학적 정합성", () => {
  test("홈에 좋아요/인기/베스트 텍스트가 없다", async ({ page }) => {
    await page.goto("/");
    const body = await page.textContent("body");
    expect(body).not.toContain("좋아요");
    expect(body).not.toContain("인기순");
    expect(body).not.toContain("베스트");
  });

  test("기록 목록에 인기순 정렬이 없다", async ({ page }) => {
    await page.goto("/logs");
    const body = await page.textContent("body");
    expect(body).not.toContain("인기순");
    expect(body).not.toContain("추천순");
  });
});
