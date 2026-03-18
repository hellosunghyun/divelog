import type { AppLoadContext } from "react-router";
import * as Sentry from "@sentry/react-router/cloudflare";

import { upsertDraft } from "~/db/queries/records/drafts.server";
import { getAuth } from "~/lib/auth/auth.server";
import { autosaveDraftSchema } from "~/lib/auth/validation";

function readString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

function parseFormData(formData: FormData) {
  return {
    format: readString(formData.get("format")),
    title: readString(formData.get("title")),
    content: readString(formData.get("content")),
    contentJson: readString(formData.get("contentJson")),
    rhythm: readString(formData.get("rhythm")),
    visibility: readString(formData.get("visibility")),
    responsePreference: readString(formData.get("responsePreference")),
  };
}

export async function action({ request, context }: { request: Request; context: AppLoadContext }) {
  if (request.method !== "POST") {
    return Response.json({ error: "허용되지 않은 요청 메서드입니다" }, { status: 405 });
  }

  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (!auth.isAuthenticated) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  if (!auth.user.isVerified) {
    return Response.json({ error: "인증된 학습자만 임시저장을 사용할 수 있습니다" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  let rawInput: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "요청 본문이 올바르지 않습니다" }, { status: 400 });
    }

    rawInput = body as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    rawInput = parseFormData(formData);
  }

  const parsed = autosaveDraftSchema.safeParse(rawInput);

  if (!parsed.success) {
    return Response.json(
      {
        error: "유효하지 않은 입력입니다",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const draft = await upsertDraft(context.cloudflare.env.DB, {
      authorId: auth.user.id,
      ...parsed.data,
    });

    return Response.json({
      draftId: draft.id,
      updatedAt: draft.updatedAt,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { type: "autosave" } });
    return Response.json({ error: "임시저장 중 문제가 발생했습니다" }, { status: 500 });
  }
}
