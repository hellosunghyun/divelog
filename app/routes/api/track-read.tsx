import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getOptionalUser } from "~/lib/auth/auth.middleware";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ readIds: [] });
  }

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) {
    return Response.json({ readIds: [] });
  }

  const recordIds = idsParam.split(",").filter(Boolean);
  if (recordIds.length === 0) {
    return Response.json({ readIds: [] });
  }

  const { getReadRecordIds } = await import("~/db/queries/records/recordReads.server");
  const readSet = await getReadRecordIds(context.cloudflare.env.DB, auth.user.id, recordIds);

  return Response.json({ readIds: Array.from(readSet) });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const auth = await getOptionalUser(request, context);

  if (!auth?.isAuthenticated || !auth.user) {
    return Response.json({ success: false }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const learnerId = auth.user.id;

  const { markAsRead, markAsUnread, bulkMarkAsRead, clearAllReads } = await import(
    "~/db/queries/records/recordReads.server"
  );

  if (intent === "mark_read") {
    const recordId = formData.get("recordId");
    if (typeof recordId !== "string" || !recordId) {
      return Response.json({ error: "recordId가 필요합니다" }, { status: 400 });
    }

    // Validate format === "article"
    const { db } = await import("~/db/client.server");
    const { records } = await import("~/db/schema.server");
    const { eq } = await import("drizzle-orm");

    const database = db(context.cloudflare.env.DB);
    const record = await database
      .select({ format: records.format, visibility: records.visibility })
      .from(records)
      .where(eq(records.id, recordId))
      .limit(1);

    if (!record[0]) {
      return Response.json({ error: "기록을 찾을 수 없습니다" }, { status: 404 });
    }

    if (record[0].format !== "article") {
      return Response.json({ error: "아티클 형식만 읽음 처리할 수 있습니다" }, { status: 400 });
    }

    if (record[0].visibility === "draft") {
      return Response.json({ error: "임시저장 기록은 읽음 처리할 수 없습니다" }, { status: 400 });
    }

    await markAsRead(context.cloudflare.env.DB, learnerId, recordId);
    return Response.json({ success: true });
  }

  if (intent === "unmark_read") {
    const recordId = formData.get("recordId");
    if (typeof recordId !== "string" || !recordId) {
      return Response.json({ error: "recordId가 필요합니다" }, { status: 400 });
    }

    await markAsUnread(context.cloudflare.env.DB, learnerId, recordId);
    return Response.json({ success: true });
  }

  if (intent === "sync_reads") {
    const entriesRaw = formData.get("entries");
    if (typeof entriesRaw !== "string") {
      return Response.json({ error: "entries가 필요합니다" }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(entriesRaw);
    } catch {
      return Response.json({ error: "entries 파싱 실패" }, { status: 400 });
    }

    if (!Array.isArray(parsed)) {
      return Response.json({ error: "entries는 배열이어야 합니다" }, { status: 400 });
    }

    if (parsed.length > 1000) {
      return Response.json({ error: "entries가 너무 많습니다 (최대 1000개)" }, { status: 400 });
    }

    const entries: { recordId: string; readAt: number }[] = [];
    for (const entry of parsed) {
      if (
        typeof entry !== "object" || entry === null ||
        typeof entry.recordId !== "string" || !entry.recordId ||
        typeof entry.readAt !== "number" || !Number.isFinite(entry.readAt)
      ) {
        return Response.json({ error: "유효하지 않은 entries 형식입니다" }, { status: 400 });
      }
      entries.push({ recordId: entry.recordId, readAt: entry.readAt });
    }

    await bulkMarkAsRead(context.cloudflare.env.DB, learnerId, entries);
    return Response.json({ success: true });
  }

  if (intent === "clear_all_reads") {
    await clearAllReads(context.cloudflare.env.DB, learnerId);
    return Response.json({ success: true });
  }

  return Response.json({ error: "알 수 없는 intent입니다" }, { status: 400 });
}
