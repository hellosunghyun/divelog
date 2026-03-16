import { test, expect } from "@playwright/test";

test.describe("Floating Write CTA", () => {
  test("hidden on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 300));

    const cta = page.getByTestId("floating-write-cta");
    if (await cta.count()) {
      await expect(cta).toHaveClass(/lg:hidden/);
      await expect(cta).not.toBeVisible();
      return;
    }

    await expect(cta).toHaveCount(0);
  });

  test("visible on mobile after scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    const cta = page.getByTestId("floating-write-cta");
    await expect(cta).toBeVisible();
  });

  test("hidden on write pages", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/write");

    const cta = page.getByTestId("floating-write-cta");
    await expect(cta).toHaveCount(0);
  });
});
