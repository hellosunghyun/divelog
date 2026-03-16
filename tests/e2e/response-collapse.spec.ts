import { test, expect } from "@playwright/test";

test.describe("Response Form Collapse", () => {
  test("response form hidden by default", async ({ page }) => {
    await page.goto("/logs/test-record-with-timeline");

    const form = page.getByTestId("response-form");
    await expect(form).toHaveCount(0);
  });
});
