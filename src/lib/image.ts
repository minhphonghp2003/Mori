/**
 * Canvas re-encode helpers for user-picked images.
 *
 * iOS (iPhone) camera photos store rotation in an EXIF orientation tag
 * instead of rotating the pixels. Uploading the raw file bytes keeps that
 * tag, and any consumer that ignores EXIF — server thumbnail pipelines, some
 * browsers and clients — renders the image rotated. Drawing the image through
 * a canvas bakes the orientation into the pixels (Safari 13.1+ honors EXIF
 * orientation in drawImage) and canvas re-encoding strips the EXIF block
 * entirely, so the upload displays identically everywhere.
 *
 * Both helpers also downscale to `maxSize` on the longest edge, which keeps
 * uploads small (iPhone photos are 12+ MP).
 */

const JPEG_QUALITY = 0.9;

/**
 * Decode a picked image and draw it upright onto a canvas at most `maxSize`
 * on its longest edge. Throws when the image cannot be decoded (the callers
 * decide the fallback).
 */
async function decodeToCanvas(
  file: Blob,
  maxSize: number,
): Promise<{ canvas: HTMLCanvasElement; outputMime: string }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    // Keep lossless input lossless (transparent PNGs); otherwise JPEG.
    const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
    return { canvas, outputMime };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Avatar-sized data URL that is safe to upload (see module header). */
export async function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  try {
    const { canvas, outputMime } = await decodeToCanvas(file, maxSize);
    return canvas.toDataURL(outputMime, JPEG_QUALITY);
  } catch {
    // Decode/canvas unavailable — keep the previous raw-pick behavior.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Upload-ready File with EXIF orientation baked into the pixels (used for
 * chat media). Higher default cap than avatars since these render fullscreen.
 * Returns the original file unchanged if decoding/encoding fails — a send
 * must never fail because of image processing.
 */
export async function fileToOrientedFile(file: File, maxSize = 2048): Promise<File> {
  try {
    const { canvas, outputMime } = await decodeToCanvas(file, maxSize);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputMime, JPEG_QUALITY),
    );
    if (!blob) throw new Error("Canvas encode failed");

    const ext = outputMime === "image/png" ? "png" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: outputMime });
  } catch {
    return file;
  }
}
