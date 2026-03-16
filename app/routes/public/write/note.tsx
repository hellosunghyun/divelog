import { eq } from "drizzle-orm";
import { useState } from "react";
import { Link } from "~/components/SmartLink";
import { redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/note";

import { NoteEditor } from "~/components/editor/NoteEditor";
import { db } from "~/db/client.server";
import { records, stages } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth.middleware";
import { getPlainText } from "~/lib/content.server";
import { generateNoteTitle } from "~/lib/title.server";
import { nanoid } from "~/lib/utils.server";
import { createNoteSchema } from "~/lib/validation";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "짧은 기록 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);

  const database = db(context.cloudflare.env.DB);
  const [currentStageResult, allStages] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database
      .select({ id: stages.id, name: stages.name, isCurrent: stages.isCurrent })
      .from(stages)
      .orderBy(stages.order),
  ]);

  return {
    currentStage: currentStageResult[0] ?? null,
    stages: allStages,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);

  const formData = await request.formData();
  const contentRaw = formData.get("content");
  const content = typeof contentRaw === "string" ? contentRaw : "";

  const parsed = createNoteSchema.safeParse({
    content,
    visibility: formData.get("visibility") || "cohort",
    stageId: formData.get("stageId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const title = generateNoteTitle(parsed.data.content);
  const plainText = getPlainText(content, "note");

  const database = db(context.cloudflare.env.DB);
  const id = nanoid();
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
  const slug = `${baseSlug || "note"}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId: auth.user.id,
    title,
    content,
    contentText: plainText,
    format: "note",
    type: "personal",
    rhythm: "free",
    visibility: parsed.data.visibility,
    responsePreference: "open",
    stageId: parsed.data.stageId ?? null,
    challengeId: null,
    collaborationUnitId: null,
    createdAt: now,
    updatedAt: now,
  });

  throw redirect(`/logs/${slug}`);
}

export default function WriteNotePage({ loaderData }: Route.ComponentProps) {
  const { currentStage, stages: availableStages } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [noteContent, setNoteContent] = useState("");
  const isSubmitting = navigation.state === "submitting";
  const contentError = actionData?.errors?.content?.[0];

  useUnsavedWarning(noteContent.length > 0);

  return (
    <div className="mx-auto py-12 px-4 md:py-20" style={{ maxWidth: 640 }}>
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/write"
          className="text-sm text-text-tertiary no-underline hover:text-text-secondary"
        >
          ← 돌아가기
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-text-primary">짧은 메모</h1>
      <p className="mb-8 text-base text-text-secondary">떠오르는 생각을 빠르게 남기세요.</p>

      <form method="post" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label
              htmlFor="visibility"
              className="mb-1.5 block text-meta font-medium text-text-secondary"
            >
              공개 범위
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue="cohort"
              className="rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
            >
              <option value="cohort">코호트 공개</option>
              <option value="public">전체 공개</option>
              <option value="draft">임시저장</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="stageId"
              className="mb-1.5 block text-meta font-medium text-text-secondary"
            >
              구간
            </label>
            <select
              id="stageId"
              name="stageId"
              defaultValue={currentStage?.id ?? ""}
              className="rounded-md border border-border bg-surface px-3 py-2 text-base focus:ring-2 focus:ring-ocean-blue focus:outline-none"
            >
              <option value="">구간 미지정</option>
              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                  {stage.isCurrent ? " (현재)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <NoteEditor
            name="content"
            defaultValue={noteContent}
            onChange={setNoteContent}
            placeholder="무엇이 남았는지부터 적어도 좋습니다..."
            error={contentError}
            htmlProps={{ required: true }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-ocean-blue px-6 py-3 text-base font-medium text-white transition-colors hover:bg-deep-ocean focus-visible:ring-2 focus-visible:ring-ocean-blue disabled:opacity-60"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
          <Link
            to="/write"
            className="rounded-md border border-border px-6 py-3 text-base font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
