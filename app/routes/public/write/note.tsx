import { eq } from "drizzle-orm";
import { useState } from "react";
import { Link } from "~/components/SmartLink";
import { redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/note";

import { NoteEditor } from "~/components/editor/NoteEditor";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/client.server";
import { records, stages } from "~/db/schema.server";
import { useUnsavedWarning } from "~/hooks/useUnsavedWarning";
import { requireVerified } from "~/lib/auth.middleware";
import { getPlainText } from "~/lib/content.server";
import { generateNoteTitle } from "~/lib/title.server";
import { nanoid } from "~/lib/utils.server";
import { createNoteSchema } from "~/lib/validation";

const NO_STAGE_VALUE = "__none__";

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
  const [stageValue, setStageValue] = useState(currentStage?.id ?? NO_STAGE_VALUE);
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
            <Label
              htmlFor="visibility"
              className="mb-1.5 block text-meta font-medium text-text-secondary"
            >
              공개 범위
            </Label>
            <Select name="visibility" defaultValue="cohort">
              <SelectTrigger id="visibility" className="w-auto min-w-36 bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cohort">코호트 공개</SelectItem>
                <SelectItem value="public">전체 공개</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              htmlFor="stageId"
              className="mb-1.5 block text-meta font-medium text-text-secondary"
            >
              구간
            </Label>
            <input type="hidden" name="stageId" value={stageValue === NO_STAGE_VALUE ? "" : stageValue} />
            <Select value={stageValue} onValueChange={setStageValue}>
              <SelectTrigger id="stageId" className="w-auto min-w-40 bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STAGE_VALUE}>구간 미지정</SelectItem>
                {availableStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                    {stage.isCurrent ? " (현재)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md px-6 py-3 text-base font-medium"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </Button>
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
