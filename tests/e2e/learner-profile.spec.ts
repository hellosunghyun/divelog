import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const evidenceDir = path.join(repoRoot, ".sisyphus/evidence");

function prepareEvidenceDirectory() {
  mkdirSync(evidenceDir, { recursive: true });
}

function trackRuntimeErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

async function disableStylesheets(page: Page) {
  await page.route("https://cdn.jsdelivr.net/**", async (route) => {
    const url = route.request().url();

    if (url.endsWith(".css") || url.includes(".css?")) {
      await route.fulfill({
        status: 200,
        contentType: "text/css",
        body: "",
      });
      return;
    }

    await route.fulfill({
      status: 204,
      body: "",
    });
  });
}

async function expectNoBrokenAnchors(page: Page) {
  const brokenAnchors = await page.locator('a[href=""], a[href="#"]').evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.textContent?.trim() ?? "",
      href: element.getAttribute("href") ?? "",
    }))
  );

  expect(brokenAnchors).toEqual([]);
}

async function expectNoRuntimeErrors(errors: ReturnType<typeof trackRuntimeErrors>) {
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
}

test.beforeAll(() => {
  prepareEvidenceDirectory();
});

test.describe("러너 프로필 여정", () => {
  test("populated learner profile shows intro and discovery blocks", async ({ page }) => {
    await disableStylesheets(page);
    const errors = trackRuntimeErrors(page);

    await page.goto("/learners/learner-hana");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("learner-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "이하나" })).toBeVisible();
    await expect(page.getByTestId("profile-intro-block")).toBeVisible();
    await expect(page.getByTestId("interest-tags").getByRole("link").first()).toBeVisible();
    await expect(page.getByTestId("current-stage-block")).toBeVisible();
    await expect(page.getByTestId("self-answer-section")).toHaveCount(1);

    await page.screenshot({
      path: path.join(evidenceDir, "task-11-populated-profile.png"),
      fullPage: true,
    });

    await expectNoRuntimeErrors(errors);
  });

  test("sparse learner profile hides unavailable sections safely", async ({ page }) => {
    await disableStylesheets(page);
    const errors = trackRuntimeErrors(page);

    await page.goto("/learners/learner-jaemin");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("learner-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "오재민" })).toBeVisible();
    await expect(page.getByTestId("self-answer-section")).toBeVisible();
    await expect(page.getByTestId("self-answer-section").getByTestId("self-answer-card")).toHaveCount(0);
    await expect(page.getByTestId("interest-tags")).toHaveCount(0);
    await expectNoBrokenAnchors(page);

    await page.screenshot({
      path: path.join(evidenceDir, "task-11-sparse-profile.png"),
      fullPage: true,
    });

    await expectNoRuntimeErrors(errors);
  });
});
