import { test, expect } from "@playwright/test";

import { loginAsVerifiedUser } from "./helpers/auth";

test.describe("Autosave", () => {
  test.skip(!process.env.TEST_VERIFIED_SESSION, "TEST_VERIFIED_SESSION not set");

  test("autosave indicator exists on write page", async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto("/write/note");

    await page.fill('[name="content"], textarea', "테스트 내용입니다");

    const indicator = page.getByTestId("autosave-indicator");
    await expect(indicator).toBeAttached();
  });

  test("draft recovery prompt shown when local draft exists", async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto("/write/note");

    await page.evaluate(() => {
      localStorage.setItem(
        "divelog-draft-note",
        JSON.stringify({
          content: "이전에 작성하던 내용",
          savedAt: Date.now() - 60_000,
        }),
      );
    });
    await page.reload();

    const prompt = page.getByTestId("draft-recovery-prompt");
    await expect(prompt).toBeVisible();
  });
});
