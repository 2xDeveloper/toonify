import { cutOutHead, warpFaces, type CaricatureProfile } from "./caricature";
import {
  drawDownscaled,
  nextFrame,
  sampleSkinTone,
  stylize,
  type RenderPreset,
} from "./cartoonFilter";
import { detectFaces, type FaceGeometry } from "./faceLandmarks";
import { getPose, poseToSvg, type BodyPalette, type PoseId } from "./bodies";

export type StyleId = "cute" | "funny" | "caricature" | "anime";
export type ToonMode = "portrait" | "character";

export type ToonStyle = {
  id: StyleId;
  label: string;
  blurb: string;
  caricature: CaricatureProfile;
  render: RenderPreset;
};

export const TOON_STYLES: ToonStyle[] = [
  {
    id: "cute",
    label: "Cute Toon",
    blurb: "Big eyes, soft round jaw, flat storybook colour.",
    caricature: { head: 1.06, eyes: 1.5, brows: 1.1, nose: 0.78, smile: 1.2, chin: 0.84 },
    render: {
      levels: 5,
      smooth: 7,
      edge: 10,
      lineStrength: 0.88,
      saturation: 1.45,
      contrast: 1.15,
      inkBlock: 11,
      lineWidth: 1,
      hueBuckets: 14,
    },
  },
  {
    id: "funny",
    label: "Big Grin",
    blurb: "Huge smile and nose — the goofy party caricature.",
    caricature: { head: 1.12, eyes: 1.28, brows: 1.18, nose: 1.34, smile: 1.5, chin: 1.08 },
    render: {
      levels: 4,
      smooth: 6,
      edge: 7,
      lineStrength: 1,
      saturation: 1.6,
      contrast: 1.26,
      inkBlock: 9,
      lineWidth: 2,
      hueBuckets: 10,
    },
  },
  {
    id: "caricature",
    label: "Classic Caricature",
    blurb: "Strong features and painted shading, like a fair-booth artist.",
    caricature: { head: 1.14, eyes: 1.32, brows: 1.15, nose: 1.22, smile: 1.34, chin: 1.14 },
    render: {
      levels: 7,
      smooth: 7,
      edge: 9,
      lineStrength: 0.8,
      saturation: 1.38,
      contrast: 1.14,
      inkBlock: 11,
      lineWidth: 1,
      hueBuckets: 16,
    },
  },
  {
    id: "anime",
    label: "Anime",
    blurb: "Oversized eyes, small nose, clean line art.",
    caricature: { head: 1.05, eyes: 1.66, brows: 1.05, nose: 0.7, smile: 1.06, chin: 0.86 },
    render: {
      levels: 6,
      smooth: 9,
      edge: 12,
      lineStrength: 0.76,
      saturation: 1.2,
      contrast: 1.16,
      inkBlock: 13,
      lineWidth: 1,
      hueBuckets: 16,
    },
  },
];

export function getToonStyle(id: StyleId): ToonStyle {
  return TOON_STYLES.find((s) => s.id === id) ?? TOON_STYLES[0];
}

const MAX_EDGE_PX = 760;

export type ToonOptions = {
  style: StyleId;
  mode: ToonMode;
  pose: PoseId;
  shirt: string;
};

export type ToonResult = {
  art: string;
  /** How many faces the landmark pass found. */
  faces: number;
  /** False when the detector was unavailable and we only ran the filter. */
  exaggerated: boolean;
};

type ProgressFn = (dataUrl: string, isFinal: boolean) => void;

/**
 * Photo in, cartoon character out — entirely on the visitor's device.
 *
 * 1. decode + downscale (EXIF-aware)
 * 2. find facial geometry (MediaPipe, Apache-2.0, no network call at runtime)
 * 3. exaggerate features into a caricature
 * 4. stylize into flat cel shading with ink lines
 * 5. optionally cut the head out and set it on a drawn body
 */
export async function toonify(
  file: File,
  opts: ToonOptions,
  onProgress?: ProgressFn,
): Promise<ToonResult> {
  const style = getToonStyle(opts.style);
  const { canvas, ctx, width, height } = await drawDownscaled(file, MAX_EDGE_PX);

  onProgress?.(canvas.toDataURL("image/png"), false);
  await nextFrame();

  const faces = await detectFaces(canvas);
  await nextFrame();

  const original = ctx.getImageData(0, 0, width, height);
  const skin = sampleSkinTone(original);

  const warped = faces.length ? warpFaces(original, faces, style.caricature) : original;
  await nextFrame();

  // A cut-out head gets its own background removed by the mask, so the
  // backdrop knockout only helps in portrait mode.
  const art = stylize(warped, style.render, {
    knockoutBackdrop: opts.mode === "portrait",
  });
  ctx.putImageData(art, 0, 0);
  await nextFrame();

  if (opts.mode === "character" && faces.length) {
    const composed = await composeCharacter(canvas, faces, opts, skin);
    if (composed) {
      onProgress?.(composed, true);
      return { art: composed, faces: faces.length, exaggerated: true };
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  onProgress?.(dataUrl, true);
  return { art: dataUrl, faces: faces.length, exaggerated: faces.length > 0 };
}

/** Drops the biggest detected head onto a drawn body. */
async function composeCharacter(
  source: HTMLCanvasElement,
  faces: FaceGeometry[],
  opts: ToonOptions,
  skin: string,
): Promise<string | null> {
  const face = [...faces].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const cutout = cutOutHead(source, face);
  if (!cutout) return null;

  const pose = getPose(opts.pose);
  const palette: BodyPalette = {
    shirt: readableShirt(opts.shirt),
    pants: "#33415c",
    shoes: "#1f2937",
    skin,
  };

  const canvas = document.createElement("canvas");
  canvas.width = pose.width;
  canvas.height = pose.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const body = await svgToImage(poseToSvg(pose, palette));
  ctx.drawImage(body, 0, 0, pose.width, pose.height);

  const head = cutout.canvas;
  const scale = (pose.head.r * 2) / head.width;
  const drawW = head.width * scale;
  const drawH = head.height * scale;
  ctx.drawImage(head, pose.head.cx - drawW / 2, pose.head.cy - drawH / 2, drawW, drawH);

  return canvas.toDataURL("image/png");
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not draw the cartoon body."));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Keeps the drawn shirt from vanishing when the product colour is white. */
function readableShirt(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#4f6ea8";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 232 ? "#dbe2ef" : hex;
}
