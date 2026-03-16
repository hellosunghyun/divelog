import type { Route } from "./+types/upload";

import { getAuth } from "~/lib/auth.server";
import { createLogger } from "~/lib/logger.server";
import { nanoid } from "~/lib/utils.server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "api.upload" });
  logger.info("action_start");

  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (!auth.isAuthenticated) {
    logger.warn("upload_auth_failed");
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    logger.warn("upload_validation_failed", { reason: "invalid_content_type" });
    return Response.json({ error: "multipart/form-data 요청만 허용됩니다" }, { status: 400 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    logger.warn("upload_validation_failed", { reason: "no_file" });
    return Response.json({ error: "이미지 파일을 선택해주세요" }, { status: 400 });
  }

  if (!(fileEntry.type in MIME_TO_EXT)) {
    logger.warn("upload_validation_failed", { reason: "invalid_mime_type", mimeType: fileEntry.type });
    return Response.json({ error: "jpeg, png, webp, gif 파일만 업로드할 수 있습니다" }, { status: 400 });
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    logger.warn("upload_validation_failed", { reason: "file_too_large", fileSize: fileEntry.size });
    return Response.json({ error: "이미지 압축 후에도 5MB를 초과합니다. 더 작은 이미지를 사용해주세요." }, { status: 400 });
  }

  const extension = MIME_TO_EXT[fileEntry.type];
  const key = `records/${nanoid(12)}.${extension}`;

  await context.cloudflare.env.R2.put(key, await fileEntry.arrayBuffer(), {
    httpMetadata: { contentType: fileEntry.type },
  });

  logger.info("file_upload", { fileType: fileEntry.type, fileSize: fileEntry.size, r2Key: key });

  return Response.json({ url: `/api/images/${key}`, key });
}
