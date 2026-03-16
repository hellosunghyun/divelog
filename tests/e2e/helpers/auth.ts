import type { Page } from "@playwright/test";

const SESSION_COOKIE_NAME = "adakrpos_session";

export async function loginAsVerifiedUser(page: Page) {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: process.env.TEST_VERIFIED_SESSION || "test-session-placeholder",
      domain: "localhost",
      path: "/",
    },
  ]);
}

export async function loginAsAdmin(page: Page) {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: process.env.TEST_ADMIN_SESSION || "test-admin-placeholder",
      domain: "localhost",
      path: "/",
    },
  ]);
}
