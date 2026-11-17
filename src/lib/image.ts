import { nearestColour } from "./colours";

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("We couldn't read this photo. Try a JPEG or PNG.");
  }
}

/** Resize to max 1200px and re-encode as WebP (~150-300 KB). Strips EXIF/GPS as a side effect. */
export async function compress(file: Blob, max = 1200): Promise<Blob> {
  const bmp = await decode(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process this photo."))), "image/webp", 0.85));
}

/** Top palette colours of the item, ignoring the backdrop (estimated from the border pixels). */
export async function dominantColours(file: Blob): Promise<string[]> {
  const bmp = await decode(file);
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const at = (x: number, y: number) => { const i = (y * S + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };

  const border: number[][] = [];
  for (let i = 0; i < S; i++) border.push(at(i, 0), at(i, S - 1), at(0, i), at(S - 1, i));
  const bg = [0, 1, 2].map((k) => border.reduce((s, p) => s + p[k], 0) / border.length);

  const counts = new Map<string, number>();
  let total = 0;
  for (let y = 2; y < S - 2; y++) for (let x = 2; x < S - 2; x++) {
    const [r, g, b] = at(x, y);
    if (Math.hypot(r - bg[0], g - bg[1], b - bg[2]) < 38) continue; // backdrop
    const id = nearestColour(r, g, b);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    total++;
  }
  if (!total) return [nearestColour(bg[0], bg[1], bg[2])];
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, n], i) => i === 0 || n / total > 0.15).slice(0, 2).map(([id]) => id);
}

/**
 * Lightness of the garment itself, measured from the photo (0 dark … 1 light).
 * Uses the centre of the frame (where the item usually is), skips pixels that match the backdrop,
 * and takes the median so buttons, logos and shadows don't skew it.
 */
export async function measureLightness(file: Blob): Promise<number> {
  const bmp = await decode(file);
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const lum = (i: number) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
  const border: number[] = [];
  for (let k = 0; k < S; k++) for (const [x, y] of [[k, 0], [k, S - 1], [0, k], [S - 1, k]]) border.push((y * S + x) * 4);
  const bg = [0, 1, 2].map((c) => border.reduce((s, i) => s + px[i + c], 0) / border.length);
  const centre: number[] = [], garment: number[] = [];
  for (let y = S / 4; y < (3 * S) / 4; y++) for (let x = S / 4; x < (3 * S) / 4; x++) {
    const i = (y * S + x) * 4;
    centre.push(lum(i));
    if (Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]) >= 38) garment.push(lum(i));
  }
  // If the item blends into the backdrop (dark shirt on a dark wall), fall back to the whole centre.
  const pool = (garment.length > centre.length * 0.2 ? garment : centre).sort((a, b) => a - b);
  return Math.round(pool[Math.floor(pool.length / 2)] * 100) / 100;
}
