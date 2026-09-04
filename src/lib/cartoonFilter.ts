export type RenderPreset = {
  /** Number of discrete lighting bands (cel shades). */
  levels: number;
  /** Kuwahara quadrant radius. */
  smooth: number;
  /** Adaptive-ink offset: higher = fewer, cleaner lines. */
  edge: number;
  /** How opaque the ink lines are. */
  lineStrength: number;
  saturation: number;
  contrast: number;
  /** Neighborhood used by the adaptive ink pass. */
  inkBlock: number;
  /** Morphological thicken on ink, in pixels. */
  lineWidth: number;
  /** How many hue buckets to keep. Fewer = flatter, more graphic. */
  hueBuckets: number;
};

/**
 * The pixel half of the cartoon: flatten texture, band the lighting into cel
 * shades, and lay ink over the result. Tuned for people — skin is flattened
 * extra hard and weak facial responses are suppressed so pores and laugh lines
 * don't turn into scribbles.
 *
 * Geometry (the caricature exaggeration) happens before this, in caricature.ts.
 */
export function stylize(
  src: ImageData,
  preset: RenderPreset,
  opts: { knockoutBackdrop?: boolean } = {},
): ImageData {
  const working = cloneImage(src);
  autoContrast(working, preset.contrast);

  const smoothed = kuwahara(working, preset.smooth);
  flattenSkin(smoothed, Math.max(6, preset.smooth + 2));

  const flattened = celShade(smoothed, preset);

  const ink = adaptiveInk(smoothed, preset);
  thickenInk(ink, src.width, src.height, preset.lineWidth);
  compositeEdges(flattened, ink, preset.lineStrength);

  if (opts.knockoutBackdrop !== false) knockoutBackdrop(flattened);
  return flattened;
}

/** Decodes a file, honours EXIF rotation, and fits it inside `maxPx`. */
export async function drawDownscaled(file: File, maxPx: number) {
  const { width: srcW, height: srcH, paint } = await loadPaintSource(file);
  const scale = Math.min(1, maxPx / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser blocked canvas access.");

  paint(ctx, width, height);
  return { canvas, ctx, width, height };
}

type PaintSource = {
  width: number;
  height: number;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
};

async function loadPaintSource(file: File): Promise<PaintSource> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      width: bitmap.width,
      height: bitmap.height,
      paint: (ctx, w, h) => {
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
      },
    };
  } catch {
    const image = await loadImage(file);
    return {
      width: image.width,
      height: image.height,
      paint: (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h),
    };
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Stretch tones so a dim phone snapshot still has cartoon contrast. */
function autoContrast(src: ImageData, extra: number) {
  const { data } = src;
  const hist = new Uint32Array(256);
  for (let p = 0; p < data.length; p += 4) {
    hist[Math.round(luminance(data[p], data[p + 1], data[p + 2]))]++;
  }

  const total = data.length / 4;
  const loCount = total * 0.02;
  const hiCount = total * 0.98;
  let running = 0;
  let lo = 0;
  let hi = 255;
  for (let i = 0; i < 256; i++) {
    running += hist[i];
    if (running <= loCount) lo = i;
    if (running <= hiCount) hi = i;
  }

  const span = Math.max(8, hi - lo);
  for (let p = 0; p < data.length; p += 4) {
    let r = ((data[p] - lo) / span) * 255;
    let g = ((data[p + 1] - lo) / span) * 255;
    let b = ((data[p + 2] - lo) / span) * 255;
    r = (r - 128) * extra + 128;
    g = (g - 128) * extra + 128;
    b = (b - 128) * extra + 128;
    data[p] = clamp(r);
    data[p + 1] = clamp(g);
    data[p + 2] = clamp(b);
  }
}

/**
 * Edge-preserving smoothing. Each pixel takes the mean color of whichever of
 * its four corner quadrants has the least luminance variance, so texture melts
 * away while boundaries stay crisp. Summed-area tables keep it O(1) per
 * quadrant regardless of radius.
 */
function kuwahara(src: ImageData, radius: number): ImageData {
  const { width: w, height: h, data } = src;
  if (radius < 1) return cloneImage(src);

  const tables = buildIntegral(src);
  const out = new ImageData(w, h);
  const dst = out.data;

  for (let y = 0; y < h; y++) {
    const yLo = Math.max(0, y - radius);
    const yHi = Math.min(h - 1, y + radius);

    for (let x = 0; x < w; x++) {
      const xLo = Math.max(0, x - radius);
      const xHi = Math.min(w - 1, x + radius);

      let bestVar = Infinity;
      let bestR = 0;
      let bestG = 0;
      let bestB = 0;

      for (let q = 0; q < 4; q++) {
        const x0 = q & 1 ? x : xLo;
        const x1 = q & 1 ? xHi : x;
        const y0 = q & 2 ? y : yLo;
        const y1 = q & 2 ? yHi : y;

        const n = (x1 - x0 + 1) * (y1 - y0 + 1);
        const l = tables.area(tables.sumL, x0, y0, x1, y1);
        const l2 = tables.area(tables.sumL2, x0, y0, x1, y1);
        const variance = l2 / n - (l / n) * (l / n);

        if (variance < bestVar) {
          bestVar = variance;
          bestR = tables.area(tables.sumR, x0, y0, x1, y1) / n;
          bestG = tables.area(tables.sumG, x0, y0, x1, y1) / n;
          bestB = tables.area(tables.sumB, x0, y0, x1, y1) / n;
        }
      }

      const p = (y * w + x) * 4;
      dst[p] = bestR;
      dst[p + 1] = bestG;
      dst[p + 2] = bestB;
      dst[p + 3] = data[p + 3];
    }
  }

  return out;
}

/**
 * People photos still have pores / beard stubble after Kuwahara. Blend those
 * pixels toward a wide box blur so skin reads as a flat cel, while hair and
 * clothes (not skin) keep the sharper Kuwahara result.
 */
function flattenSkin(src: ImageData, radius: number) {
  const { width: w, height: h, data } = src;
  const tables = buildIntegral(src);
  const r = Math.max(2, radius);

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const amount = skinAmount(data[p], data[p + 1], data[p + 2]);
      if (amount <= 0.02) continue;

      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      const n = (x1 - x0 + 1) * (y1 - y0 + 1);
      const mix = amount * 0.72;
      data[p] = data[p] * (1 - mix) + (tables.area(tables.sumR, x0, y0, x1, y1) / n) * mix;
      data[p + 1] = data[p + 1] * (1 - mix) + (tables.area(tables.sumG, x0, y0, x1, y1) / n) * mix;
      data[p + 2] = data[p + 2] * (1 - mix) + (tables.area(tables.sumB, x0, y0, x1, y1) / n) * mix;
    }
  }
}

/**
 * Quantize lighting, not RGB channels. Independent R/G/B posterize turns
 * skin muddy; keeping hue and banding value gives actual cel shading.
 */
function celShade(src: ImageData, preset: RenderPreset): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const dst = out.data;
  const levels = Math.max(2, preset.levels);
  const valueStep = 1 / (levels - 1);
  const satLevels = Math.max(3, Math.round(levels * 0.8));
  const satStep = 1 / (satLevels - 1);
  const hueStep = 360 / Math.max(6, preset.hueBuckets);

  for (let p = 0; p < data.length; p += 4) {
    let r = data[p];
    let g = data[p + 1];
    let b = data[p + 2];
    const skin = skinAmount(r, g, b);

    const hsv = rgbToHsv(r, g, b);
    hsv[0] = Math.round(hsv[0] / hueStep) * hueStep;
    hsv[1] = Math.round(clamp01(hsv[1] * preset.saturation) / satStep) * satStep;
    hsv[2] = Math.round(clamp01(hsv[2]) / valueStep) * valueStep;

    const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);

    // Warm, slightly lifted skin so faces don't go gray after banding.
    if (skin > 0.15) {
      rgb[0] = rgb[0] + 14 * skin;
      rgb[1] = rgb[1] + 4 * skin;
      rgb[2] = rgb[2] - 8 * skin;
    }

    dst[p] = clamp(rgb[0]);
    dst[p + 1] = clamp(rgb[1]);
    dst[p + 2] = clamp(rgb[2]);
    dst[p + 3] = data[p + 3];
  }

  return out;
}

/**
 * Classic cheap cartoon ink: a pixel is a line when it is darker than the
 * local mean. Combined with Sobel so hair / glasses / eyes still draw even
 * when the neighborhood is already dark. Weak interior-skin responses are
 * suppressed so pores and laugh lines don't become scribbles.
 */
function adaptiveInk(src: ImageData, preset: RenderPreset): Float32Array {
  const { width: w, height: h, data } = src;
  const tables = buildIntegral(src);
  const block = Math.max(3, preset.inkBlock | 1);
  const radius = (block - 1) >> 1;
  const offset = preset.edge;
  const ink = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);

    for (let x = 1; x < w - 1; x++) {
      const p = (y * w + x) * 4;
      const gray = luminance(data[p], data[p + 1], data[p + 2]);

      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const n = (x1 - x0 + 1) * (y1 - y0 + 1);
      const mean = tables.area(tables.sumL, x0, y0, x1, y1) / n;

      const adaptive = clamp01((mean - gray - offset) / 18);

      const tl = luminance(data[p - w * 4 - 4], data[p - w * 4 - 3], data[p - w * 4 - 2]);
      const t = luminance(data[p - w * 4], data[p - w * 4 + 1], data[p - w * 4 + 2]);
      const tr = luminance(data[p - w * 4 + 4], data[p - w * 4 + 5], data[p - w * 4 + 6]);
      const l = luminance(data[p - 4], data[p - 3], data[p - 2]);
      const r = luminance(data[p + 4], data[p + 5], data[p + 6]);
      const bl = luminance(data[p + w * 4 - 4], data[p + w * 4 - 3], data[p + w * 4 - 2]);
      const btm = luminance(data[p + w * 4], data[p + w * 4 + 1], data[p + w * 4 + 2]);
      const br = luminance(data[p + w * 4 + 4], data[p + w * 4 + 5], data[p + w * 4 + 6]);
      const gx = tl + 2 * l + bl - (tr + 2 * r + br);
      const gy = tl + 2 * t + tr - (bl + 2 * btm + br);
      const sobel = clamp01((Math.hypot(gx, gy) - 42) / 70);

      let mark = Math.max(adaptive, sobel * 0.85);
      const skin = skinAmount(data[p], data[p + 1], data[p + 2]);
      if (skin > 0.35 && mark < 0.55) mark *= 1 - skin * 0.72;

      ink[y * w + x] = mark;
    }
  }

  return ink;
}

function thickenInk(ink: Float32Array, w: number, h: number, radius: number) {
  if (radius < 1) return;
  const src = ink.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = src[yy * w + xx];
          if (v > best) best = v;
        }
      }
      ink[y * w + x] = best;
    }
  }
}

function compositeEdges(src: ImageData, mask: Float32Array, strength: number) {
  const data = src.data;
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const ink = mask[i] * strength;
    if (ink <= 0) continue;
    const keep = 1 - ink;
    data[p] *= keep;
    data[p + 1] *= keep;
    data[p + 2] *= keep;
  }
}

/**
 * If the four corners agree the backdrop is a studio wall / sky, punch those
 * pixels toward transparent so multiply-blend on a shirt shows fabric, not a
 * gray rectangle around the person.
 */
function knockoutBackdrop(src: ImageData) {
  const { width: w, height: h, data } = src;
  const sample = (x: number, y: number) => {
    const p = (y * w + x) * 4;
    return [data[p], data[p + 1], data[p + 2]] as const;
  };

  const corners = [
    sample(2, 2),
    sample(w - 3, 2),
    sample(2, h - 3),
    sample(w - 3, h - 3),
  ];
  const avg = [0, 0, 0];
  for (const c of corners) {
    avg[0] += c[0];
    avg[1] += c[1];
    avg[2] += c[2];
  }
  avg[0] /= 4;
  avg[1] /= 4;
  avg[2] /= 4;

  const cornerSpread = corners.reduce((sum, c) => sum + colorDist(c, avg), 0) / 4;
  const backdropLum = luminance(avg[0], avg[1], avg[2]);
  if (cornerSpread > 28 || backdropLum < 170) return;

  for (let p = 0; p < data.length; p += 4) {
    const pix = [data[p], data[p + 1], data[p + 2]] as const;
    if (skinAmount(pix[0], pix[1], pix[2]) > 0.25) continue;
    const dist = colorDist(pix, avg);
    if (dist > 36) continue;
    const fade = clamp01((36 - dist) / 36);
    data[p + 3] = Math.round(data[p + 3] * (1 - fade));
  }
}

function colorDist(a: readonly number[], b: readonly number[]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Cheap, inclusive skin likelihood in 0..1. Combines a relaxed RGB rule with
 * YCbCr so light and deep skin both flatten. Not a face detector — wood and
 * terracotta may match, which is fine for a cartoon flatten.
 */
function skinAmount(r: number, g: number, b: number) {
  const rgbHit =
    r > 60 &&
    g > 20 &&
    b > 10 &&
    r >= g - 8 &&
    r >= b &&
    r - Math.min(g, b) > 8 &&
    Math.abs(r - g) > 8
      ? 1
      : 0;

  const y = luminance(r, g, b);
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ycc =
    y > 50 && y < 250 && cb > 70 && cb < 140 && cr > 122 && cr < 185 ? 1 : 0;

  if (!rgbHit && !ycc) return 0;
  const chroma = Math.abs(r - g) + Math.abs(r - b);
  const score = (rgbHit * 0.45 + ycc * 0.7) * clamp01(chroma / 40);
  return clamp01(score);
}

/**
 * Average colour of the skin-like pixels in a region, so drawn hands and neck
 * match the person instead of defaulting to one generic tone.
 */
export function sampleSkinTone(src: ImageData, fallback = "#e8b58f"): string {
  const { data } = src;
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;

  for (let p = 0; p < data.length; p += 4) {
    const amount = skinAmount(data[p], data[p + 1], data[p + 2]);
    if (amount <= 0.3) continue;
    r += data[p] * amount;
    g += data[p + 1] * amount;
    b += data[p + 2] * amount;
    weight += amount;
  }

  if (weight < 40) return fallback;
  const hex = (v: number) =>
    Math.round(clamp(v / weight))
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function buildIntegral(src: ImageData) {
  const { width: w, height: h, data } = src;
  const sw = w + 1;
  const sumR = new Float64Array(sw * (h + 1));
  const sumG = new Float64Array(sw * (h + 1));
  const sumB = new Float64Array(sw * (h + 1));
  const sumL = new Float64Array(sw * (h + 1));
  const sumL2 = new Float64Array(sw * (h + 1));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const l = luminance(r, g, b);

      const i = (y + 1) * sw + (x + 1);
      const up = y * sw + (x + 1);
      const left = (y + 1) * sw + x;
      const diag = y * sw + x;

      sumR[i] = r + sumR[up] + sumR[left] - sumR[diag];
      sumG[i] = g + sumG[up] + sumG[left] - sumG[diag];
      sumB[i] = b + sumB[up] + sumB[left] - sumB[diag];
      sumL[i] = l + sumL[up] + sumL[left] - sumL[diag];
      sumL2[i] = l * l + sumL2[up] + sumL2[left] - sumL2[diag];
    }
  }

  const area = (t: Float64Array, x0: number, y0: number, x1: number, y1: number) =>
    t[(y1 + 1) * sw + (x1 + 1)] -
    t[y0 * sw + (x1 + 1)] -
    t[(y1 + 1) * sw + x0] +
    t[y0 * sw + x0];

  return { sumR, sumG, sumB, sumL, sumL2, area };
}

export function cloneImage(src: ImageData) {
  const out = new ImageData(src.width, src.height);
  out.data.set(src.data);
  return out;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
