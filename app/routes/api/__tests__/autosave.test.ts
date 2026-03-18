import type { AppLoadContext } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { action } from "../autosave";
import { upsertDraft } from "~/db/queries/records/drafts.server";
import { getAuth } from "~/lib/auth/auth.server";

vi.mock("~/lib/auth/auth.server", () => ({
  getAuth: vi.fn(),
}));

vi.mock("~/db/queries/records/drafts.server", () => ({
  upsertDraft: vi.fn(),
}));

function createContext(): AppLoadContext {
  return {
    cloudflare: {
      env: {
        ADAKRPOS_API_KEY: "test-api-key",
        DB: {} as D1Database,
      },
    },
  } as unknown as AppLoadContext;
}

function createVerifiedAuth() {
  return {
    isAuthenticated: true,
    user: {
      id: "usr-1",
      isVerified: true,
    },
    session: null,
  };
}

function createFormRequest(formData: FormData) {
  return new Request("http://localhost/api/autosave", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/autosave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증이 없으면 401을 반환한다", async () => {
    vi.mocked(getAuth).mockResolvedValue({
      isAuthenticated: false,
      user: null,
      session: null,
    });

    const request = createFormRequest(new FormData());
    const response = await action({ request, context: createContext() });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "인증이 필요합니다" });
  });

  it("format이 잘못되면 Zod 에러를 반환한다", async () => {
    vi.mocked(getAuth).mockResolvedValue(createVerifiedAuth());

    const formData = new FormData();
    formData.set("format", "memo");
    formData.set("content", "테스트");

    const request = createFormRequest(formData);
    const response = await action({ request, context: createContext() });
    const body = (await response.json()) as {
      error: string;
      issues: { format?: string[] };
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("유효하지 않은 입력입니다");
    expect(body.issues.format).toBeDefined();
  });

  it("유효한 note 요청을 임시저장한다", async () => {
    vi.mocked(getAuth).mockResolvedValue(createVerifiedAuth());
    vi.mocked(upsertDraft).mockResolvedValue({
      id: "draft-1",
      updatedAt: 1700000000,
    } as Awaited<ReturnType<typeof upsertDraft>>);

    const formData = new FormData();
    formData.set("format", "note");
    formData.set("content", "오늘 배운 점");
    formData.set("visibility", "public");

    const request = createFormRequest(formData);
    const response = await action({ request, context: createContext() });
    const body = (await response.json()) as { draftId: string; updatedAt: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ draftId: "draft-1", updatedAt: 1700000000 });
    expect(upsertDraft).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authorId: "usr-1",
        format: "note",
        content: "오늘 배운 점",
        visibility: "public",
      }),
    );
  });

  it("같은 author+format 재요청 시 upsert로 덮어쓴다", async () => {
    vi.mocked(getAuth).mockResolvedValue(createVerifiedAuth());
    vi.mocked(upsertDraft)
      .mockResolvedValueOnce({ id: "draft-1", updatedAt: 1700000001 } as Awaited<ReturnType<typeof upsertDraft>>)
      .mockResolvedValueOnce({ id: "draft-1", updatedAt: 1700000002 } as Awaited<ReturnType<typeof upsertDraft>>);

    const first = new FormData();
    first.set("format", "note");
    first.set("content", "초안 1");

    const second = new FormData();
    second.set("format", "note");
    second.set("content", "초안 2");

    const firstResponse = await action({ request: createFormRequest(first), context: createContext() });
    const secondResponse = await action({ request: createFormRequest(second), context: createContext() });

    const firstBody = (await firstResponse.json()) as { draftId: string };
    const secondBody = (await secondResponse.json()) as { draftId: string };

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.draftId).toBe("draft-1");
    expect(secondBody.draftId).toBe("draft-1");
    expect(upsertDraft).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ authorId: "usr-1", format: "note", content: "초안 1" }),
    );
    expect(upsertDraft).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ authorId: "usr-1", format: "note", content: "초안 2" }),
    );
  });
});
