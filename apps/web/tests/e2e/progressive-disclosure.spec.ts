import { test, expect } from "@playwright/test";

import { loginAsVerifiedUser } from "./helpers/auth";

test.describe("Progressive Disclosure", () => {
  test.skip(!process.env.TEST_VERIFIED_SESSION, "TEST_VERIFIED_SESSION not set");

  test("note editor: settings hidden initially", async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto("/write/note");

    const panel = page.getByTestId("write-settings-panel");
    await expect(panel).not.toBeVisible();

    const prompt = page.getByTestId("warm-up-prompt");
    await expect(prompt).toBeVisible();
  });

  test("settings toggle button opens panel", async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto("/write/note");

    const toggle = page.getByTestId("write-settings-toggle");
    await toggle.click();

    const panel = page.getByTestId("write-settings-panel");
    await expect(panel).toBeVisible();
  });
});
