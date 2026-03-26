import type { AuthContext } from "@adakrpos/auth";
import type { AppLoadContext } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loader } from "../record-content";
import { db } from "~/db/client.server";
import { extractMentionUserIdsFromContent } from "~/db/queries/dialogue/mentions.server";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";
import { renderContentToHtml } from "~/lib/content/content.server";

vi.mock("~/db/client.server", () => ({
  db: vi.fn(),
}));

vi.mock("~/lib/auth/auth.middleware.server", () => ({
  getOptionalUser: vi.fn(),
}));

vi.mock("~/db/queries/dialogue/mentions.server", () => ({
  extractMentionUserIdsFromContent: vi.fn(() => []),
}));

vi.mock("~/lib/content/content.server", () => ({
  renderContentToHtml: vi.fn(() => "<p>깨끗한 본문</p>"),
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

function createRequest(query: string) {
  return new Request(`http://localhost/api/record-content?${query}`);
}

function createAuthenticatedAuth(): AuthenticatedContext {
  return {
    isAuthenticated: true,
    user: {
      id: "usr-viewer",
      email: "viewer@example.com",
      verifiedEmail: "viewer@example.com",
      nickname: "viewer",
      name: "Viewer",
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
      userId: "usr-viewer",
      expiresAt: 1700003600,
      createdAt: 1700000000,
    },
  };
}

function createDatabaseMock(options: {
  record: {
    id: string;
    slug: string;
    content: string;
    format: string;
    visibility: string;
    cohort: string | null;
    authorId: string;
  } | null;
  viewerCohort?: string | null;
}) {
  let selectCallCount = 0;

  const recordLimit = vi.fn(async () => (options.record ? [options.record] : []));
  const recordWhere = vi.fn(() => ({ limit: recordLimit }));
  const recordFrom = vi.fn(() => ({ where: recordWhere }));

  const cohortLimit = vi.fn(async () => (
    options.viewerCohort ? [{ cohort: options.viewerCohort }] : []
  ));
  const cohortWhere = vi.fn(() => ({ limit: cohortLimit }));
  const cohortFrom = vi.fn(() => ({ where: cohortWhere }));

  const select = vi.fn(() => {
    selectCallCount += 1;
    return selectCallCount === 1
      ? { from: recordFrom }
      : { from: cohortFrom };
  });

  return { select };
}

describe("GET /api/record-content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractMentionUserIdsFromContent).mockReturnValue([]);
    vi.mocked(renderContentToHtml).mockReturnValue("<p>깨끗한 본문</p>");
  });

  it("접근 가능한 기록이면 깨끗한 본문 payload를 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);
    vi.mocked(db).mockReturnValue(createDatabaseMock({
      record: {
        id: "rec-1",
        slug: "record-1",
        content: '{"type":"doc"}',
        format: "article",
        visibility: "public",
        cohort: null,
        authorId: "usr-author",
      },
    }) as never);

    const response = await loader({
      request: createRequest("id=rec-1"),
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = await response.json() as {
      id: string;
      slug: string;
      content: string;
      contentHtml: string;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "rec-1",
      slug: "record-1",
      content: '{"type":"doc"}',
      contentHtml: "<p>깨끗한 본문</p>",
    });
  });

  it("권한이 없으면 not found를 반환한다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);
    vi.mocked(db).mockReturnValue(createDatabaseMock({
      record: {
        id: "rec-2",
        slug: "record-2",
        content: '{"type":"doc"}',
        format: "article",
        visibility: "cohort",
        cohort: "2026",
        authorId: "usr-author",
      },
    }) as never);

    const response = await loader({
      request: createRequest("id=rec-2"),
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "not found" });
  });

  it("같은 코호트 뷰어는 cohort 기록에 접근할 수 있다", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(createAuthenticatedAuth());
    vi.mocked(db).mockReturnValue(createDatabaseMock({
      record: {
        id: "rec-3",
        slug: "record-3",
        content: '{"type":"doc"}',
        format: "article",
        visibility: "cohort",
        cohort: "2026",
        authorId: "usr-author",
      },
      viewerCohort: "2026",
    }) as never);

    const response = await loader({
      request: createRequest("slug=record-3"),
      context: createContext(),
      params: {},
      unstable_pattern: "",
    });

    expect(response.status).toBe(200);
  });
});
