export async function toWebpAndResize(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.max(1, Math.round(bitmap.width * ratio));
  const targetH = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/webp', quality);
  });

  const safeName = file.name.replace(/\.[^.]+$/, '.webp');
  return new File([blob], safeName, { type: 'image/webp' });
}


