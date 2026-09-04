import { centroid, spanOf, type FaceGeometry, type Pt } from "./faceLandmarks";

/**
 * Caricature by feature exaggeration.
 *
 * A real caricaturist finds what is distinctive about a face and pushes it
 * further. We approximate that with radial "bulge" handles anchored to the
 * detected landmarks: enlarge the eyes, widen the grin, shrink or extend the
 * chin. Each handle warps pixels through an inverse map, so no pixels are
 * invented — the geometry is redrawn.
 */

export type CaricatureProfile = {
  /** Whole-head swell. Keep modest; large values distort the neck. */
  head: number;
  eyes: number;
  brows: number;
  nose: number;
  smile: number;
  /** Below 1 shrinks the jaw (cute), above 1 extends it (classic caricature). */
  chin: number;
};

type Handle = {
  cx: number;
  cy: number;
  r: number;
  scale: number;
  /** Cached bounds so the per-pixel loop can reject far handles without a sqrt. */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function buildHandles(face: FaceGeometry, profile: CaricatureProfile): Handle[] {
  const handles: Handle[] = [];
  const unit = face.eyeSpan;

  const push = (center: Pt, r: number, scale: number) => {
    if (Math.abs(scale - 1) < 0.01 || r <= 1) return;
    handles.push({
      cx: center.x,
      cy: center.y,
      r,
      scale,
      minX: center.x - r,
      maxX: center.x + r,
      minY: center.y - r,
      maxY: center.y + r,
    });
  };

  push(face.center, Math.max(face.width, face.height) * 0.8, profile.head);

  const leftEye = centroid(face.leftEye);
  const rightEye = centroid(face.rightEye);
  push(leftEye, unit * 0.5, profile.eyes);
  push(rightEye, unit * 0.5, profile.eyes);

  push(centroid(face.leftBrow), unit * 0.42, profile.brows);
  push(centroid(face.rightBrow), unit * 0.42, profile.brows);

  const mouth = centroid(face.lips);
  push(mouth, Math.max(spanOf(face.lips) * 0.8, unit * 0.5), profile.smile);

  const eyeMid = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const nose = { x: (eyeMid.x + mouth.x) / 2, y: (eyeMid.y + mouth.y) / 2 };
  push(nose, unit * 0.45, profile.nose);

  const chin = lowestPoint(face.faceOval);
  push({ x: face.center.x, y: (chin.y + mouth.y) / 2 }, face.width * 0.5, profile.chin);

  return handles;
}

/**
 * Inverse-maps every destination pixel back through the handles and samples
 * the source bilinearly, so the result stays smooth instead of blocky.
 */
export function warpFaces(
  src: ImageData,
  faces: FaceGeometry[],
  profile: CaricatureProfile,
): ImageData {
  const handles = faces.flatMap((face) => buildHandles(face, profile));
  if (!handles.length) return src;

  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const dst = out.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = x;
      let sy = y;

      for (const handle of handles) {
        if (x < handle.minX || x > handle.maxX || y < handle.minY || y > handle.maxY) continue;

        const dx = x - handle.cx;
        const dy = y - handle.cy;
        const dist = Math.hypot(dx, dy);
        if (dist >= handle.r) continue;

        // Flat plateau near the centre so the feature scales close to its
        // requested amount, then a fast decay so the surrounding face is
        // barely disturbed. A plain (1-t^2)^2 bell loses most of the effect
        // before it reaches the edge of the eye or mouth.
        const t = dist / handle.r;
        const falloff = (1 - t ** 4) ** 2;
        const factor = 1 / (1 + (handle.scale - 1) * falloff);
        sx += dx * (factor - 1);
        sy += dy * (factor - 1);
      }

      sampleBilinear(data, w, h, sx, sy, dst, (y * w + x) * 4);
    }
  }

  return out;
}

function sampleBilinear(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  dst: Uint8ClampedArray,
  out: number,
) {
  const cx = x < 0 ? 0 : x > w - 1 ? w - 1 : x;
  const cy = y < 0 ? 0 : y > h - 1 ? h - 1 : y;
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;

  const p00 = (y0 * w + x0) * 4;
  const p10 = (y0 * w + x1) * 4;
  const p01 = (y1 * w + x0) * 4;
  const p11 = (y1 * w + x1) * 4;

  for (let c = 0; c < 4; c++) {
    const top = src[p00 + c] * (1 - fx) + src[p10 + c] * fx;
    const bottom = src[p01 + c] * (1 - fx) + src[p11 + c] * fx;
    dst[out + c] = top * (1 - fy) + bottom * fy;
  }
}

function lowestPoint(points: Pt[]): Pt {
  return points.reduce((best, p) => (p.y > best.y ? p : best), points[0] ?? { x: 0, y: 0 });
}

export type HeadCutout = {
  canvas: HTMLCanvasElement;
  /** Where the eye line sits inside the cutout, 0..1 from the top. */
  eyeLine: number;
};

/**
 * Cuts the head out of the stylized art along the face oval, expanded outward
 * (and further upward) so hair and ears come along. The mask edge is blurred
 * so the head sits on a drawn body without a hard sticker seam.
 */
export function cutOutHead(
  source: HTMLCanvasElement,
  face: FaceGeometry,
  opts: { expand?: number; hairLift?: number; feather?: number } = {},
): HeadCutout | null {
  const expand = opts.expand ?? 1.22;
  const hairLift = opts.hairLift ?? 1.55;
  const feather = opts.feather ?? 5;

  const polygon = face.faceOval.map((p) => {
    const vx = p.x - face.center.x;
    const vy = p.y - face.center.y;
    const stretch = vy < 0 ? expand * hairLift : expand;
    return { x: face.center.x + vx * expand, y: face.center.y + vy * stretch };
  });
  if (polygon.length < 3) return null;

  const pad = feather * 2;
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p.x)) - pad));
  const maxX = Math.min(source.width, Math.ceil(Math.max(...polygon.map((p) => p.x)) + pad));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p.y)) - pad));
  const maxY = Math.min(source.height, Math.ceil(Math.max(...polygon.map((p) => p.y)) + pad));

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 8 || h < 8) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(source, minX, minY, w, h, 0, 0, w, h);

  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return null;

  maskCtx.filter = `blur(${feather}px)`;
  maskCtx.fillStyle = "#fff";
  maskCtx.beginPath();
  polygon.forEach((p, i) => {
    const x = p.x - minX;
    const y = p.y - minY;
    if (i === 0) maskCtx.moveTo(x, y);
    else maskCtx.lineTo(x, y);
  });
  maskCtx.closePath();
  maskCtx.fill();

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  const eyes = centroid([...face.leftEye, ...face.rightEye]);
  return { canvas, eyeLine: clamp01((eyes.y - minY) / h) };
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
