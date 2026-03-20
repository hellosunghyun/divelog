const MAX_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 2048;

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_SIZE && !file.type.includes("png")) {
    return file;
  }

  if (file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = 0.85;
    let blob = await canvas.convertToBlob({ type: "image/webp", quality });

    while (blob.size > MAX_SIZE && quality > 0.3) {
      quality -= 0.1;
      blob = await canvas.convertToBlob({ type: "image/webp", quality });
    }

    if (blob.size > MAX_SIZE) {
      const smallerRatio = 0.7;
      const sw = Math.max(1, Math.round(width * smallerRatio));
      const sh = Math.max(1, Math.round(height * smallerRatio));
      const smallCanvas = new OffscreenCanvas(sw, sh);
      const sCtx = smallCanvas.getContext("2d");
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, sw, sh);
        blob = await smallCanvas.convertToBlob({ type: "image/webp", quality: 0.7 });
      }
    }

    const name = file.name.replace(/\.[^.]+$/, ".webp");
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}
