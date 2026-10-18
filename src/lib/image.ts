/**
 * Re-encode a picked image file into a data URL that is safe to upload.
 *
 * iOS (iPhone) camera photos store rotation in an EXIF orientation tag
 * instead of rotating the pixels. Uploading the raw file bytes keeps that
 * tag, and any consumer that ignores EXIF — thumbnail pipelines, some
 * browsers and clients — renders the image rotated. Drawing the image
 * through a canvas bakes the orientation into the pixels (Safari 13.1+
 * honors EXIF orientation in drawImage) and canvas re-encoding strips the
 * EXIF block entirely, so the upload displays identically everywhere.
 *
 * The image is also downscaled to `maxSize` on its longest edge, which
 * keeps avatar uploads small (iPhone photos are 12+ MP).
 */
export async function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode failed'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.drawImage(img, 0, 0, width, height);

    // Keep lossless input lossless (transparent PNGs); otherwise JPEG.
    const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return canvas.toDataURL(outputMime, 0.9);
  } catch {
    // Decode/canvas unavailable — keep the previous raw-pick behavior.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
