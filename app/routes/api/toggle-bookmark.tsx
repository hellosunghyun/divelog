import type { ActionFunctionArgs } from "react-router";
import { getOptionalUser } from "~/lib/auth/auth.middleware";
import { isRecordSaved, saveRecord, unsaveRecord } from "~/db/queries/records/savedRecords.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const formData = await request.formData();
  const recordId = formData.get("recordId");

  if (typeof recordId !== "string" || !recordId) {
    return Response.json({ error: "recordId가 필요합니다" }, { status: 400 });
  }

  const { db } = await import("~/db/client.server");
  const { records } = await import("~/db/schema.server");
  const { eq } = await import("drizzle-orm");

  const database = db(context.cloudflare.env.DB);
  const record = await database
    .select({ id: records.id, visibility: records.visibility, authorId: records.authorId })
    .from(records)
    .where(eq(records.id, recordId))
    .limit(1);

  if (!record[0]) {
    return Response.json({ error: "기록을 찾을 수 없습니다" }, { status: 404 });
  }

  if (record[0].visibility === "draft" && record[0].authorId !== auth.user.id) {
    return Response.json({ error: "이 기록은 저장할 수 없습니다" }, { status: 403 });
  }

  const learnerId = auth.user.id;
  const alreadySaved = await isRecordSaved(context.cloudflare.env.DB, learnerId, recordId);

  if (alreadySaved) {
    await unsaveRecord(context.cloudflare.env.DB, learnerId, recordId);
    return Response.json({ saved: false });
  }

  await saveRecord(context.cloudflare.env.DB, learnerId, recordId);
  return Response.json({ saved: true });
}
