import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";

import { db } from "~/db/client.server";
import { records } from "~/db/schema.server";
import { trackRecordView } from "~/db/queries/records/recordViews.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const recordId = formData.get("recordId");
  const viewerKey = formData.get("viewerKey");

  if (typeof recordId !== "string" || !recordId) {
    return Response.json({ error: "recordId가 필요합니다." }, { status: 400 });
  }

  if (typeof viewerKey !== "string" || viewerKey.length < 8 || viewerKey.length > 128) {
    return Response.json({ error: "viewerKey가 올바르지 않습니다." }, { status: 400 });
  }

  const database = db(context.cloudflare.env.DB);
  const record = await database
    .select({ id: records.id, visibility: records.visibility })
    .from(records)
    .where(eq(records.id, recordId))
    .limit(1);

  if (!record[0]) {
    return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!["public", "cohort"].includes(record[0].visibility)) {
    return Response.json({ error: "조회수를 기록할 수 없는 상태입니다." }, { status: 400 });
  }

  const inserted = await trackRecordView(context.cloudflare.env.DB, recordId, viewerKey);

  return Response.json({ success: true, counted: inserted });
}
