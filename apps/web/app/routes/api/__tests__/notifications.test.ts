import type { AuthContext } from "@adakrpos/auth";
import type { AppLoadContext } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loader, action } from "../notifications";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";
import { db } from "~/db/client.server";
import {
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "~/db/queries/social/notifications.server";

vi.mock("~/lib/auth/auth.middleware.server", () => ({
  getOptionalUser: vi.fn(),
}));

vi.mock("~/db/client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/db/queries/social/notifications.server", () => ({
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

type AuthenticatedContext = Extract<AuthContext, { isAuthenticated: true }>;

function createContext(): AppLoadContext {
  return {
    cloudflare: {
      env: {
        DB: {} as D1Database,
      },
    },
  } as unknown as AppLoadContext;
}

function createAuthenticatedAuth(): AuthenticatedContext {
  return {
    isAuthenticated: true,
    user: {
      id: "usr-test-123",
      email: "test@example.com",
      verifiedEmail: "test@example.com",
      nickname: "testuser",
      name: "Test User",
      profilePhotoUrl: null,
      bio: "",
      contact: null,
      snsLinks: {},
      cohort: "2026",
      isVerified: true,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    },
    session: {
      id: "session-1",
      userId: "usr-test-123",
      expiresAt: 1700003600,
      createdAt: 1700000000,
    },
  };
}

function createDatabaseMock(notifications: unknown[] = []) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => notifications),
            })),
          })),
        })),
      })),
    })),
  };
}

const writeResult = {} as Awaited<ReturnType<typeof markAsRead>>;

function createRequest(method: string = "GET") {
  return new Request("http://localhost/api/notifications", { method });
}

function createFormRequest(formData: FormData) {
  return new Request("http://localhost/api/notifications", {
    method: "POST",
    body: formData,
  });
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db).mockReturnValue(createDatabaseMock() as never);
    vi.mocked(getUnreadCount).mockResolvedValue(0);
    vi.mocked(markAsRead).mockResolvedValue(writeResult);
    vi.mocked(markAllAsRead).mockResolvedValue(writeResult);
  });

  it("미인증 사용자는 빈 알림 배열과 0 unreadCount를 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);

    const request = createRequest("GET");
    const response = await loader({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as { notifications: unknown[]; unreadCount: number };

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual([]);
    expect(body.unreadCount).toBe(0);
  });

  it("인증된 사용자는 unreadCount (숫자)를 포함한 응답을 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(createAuthenticatedAuth());

    const request = createRequest("GET");
    const response = await loader({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as { notifications: unknown[]; unreadCount: number };

    expect(response.status).toBe(200);
    expect(typeof body.unreadCount).toBe("number");
    expect(body.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it("각 알림 항목은 destinationUrl 또는 recordSlug를 포함해야 한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(createAuthenticatedAuth());
    vi.mocked(db).mockReturnValue(
      createDatabaseMock([{ id: "notif-1", recordSlug: "first-record" }]) as never,
    );

    const request = createRequest("GET");
    const response = await loader({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as {
      notifications: Array<{ recordSlug?: string; destinationUrl?: string }>;
    };

    expect(response.status).toBe(200);
    if (body.notifications.length > 0) {
      body.notifications.forEach((notif) => {
        expect(notif.recordSlug || notif.destinationUrl).toBeDefined();
      });
    }
  });
});

describe("POST /api/notifications (mark_read action)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("미인증 사용자는 401을 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("intent", "mark_read");
    formData.set("id", "notif-1");

    const request = createFormRequest(formData);
    const response = await action({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("mark_read 액션 후 성공 응답을 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(createAuthenticatedAuth());

    const formData = new FormData();
    formData.set("intent", "mark_read");
    formData.set("id", "notif-1");

    const request = createFormRequest(formData);
    const response = await action({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("mark_all_read 액션을 처리한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(createAuthenticatedAuth());

    const formData = new FormData();
    formData.set("intent", "mark_all_read");

    const request = createFormRequest(formData);
    const response = await action({
      request,
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
