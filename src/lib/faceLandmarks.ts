import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision";

/**
 * Face geometry detection via MediaPipe Face Landmarker.
 *
 * This is a *measurement* step, not a generative one: it reports where the
 * eyes, mouth and jaw sit so the caricature warp knows what to exaggerate.
 * It runs fully on-device (WASM), needs no API key, and MediaPipe ships under
 * Apache-2.0, so it is safe to use in a product you sell.
 */

export type Pt = { x: number; y: number };

export type FaceGeometry = {
  /** All 478 landmarks in pixel coordinates. */
  points: Pt[];
  faceOval: Pt[];
  leftEye: Pt[];
  rightEye: Pt[];
  leftBrow: Pt[];
  rightBrow: Pt[];
  lips: Pt[];
  /** Centre of the face oval. */
  center: Pt;
  /** Distance between eye centres — the natural unit for scaling features. */
  eyeSpan: number;
  width: number;
  height: number;
};

const LOCAL_BASE = "/mediapipe";
const CDN_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const CDN_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarkerType | null> | null = null;

/** Loads the detector once and reuses it. Returns null if it can't load. */
export function loadFaceLandmarker(): Promise<FaceLandmarkerType | null> {
  landmarkerPromise ??= createLandmarker();
  return landmarkerPromise;
}

async function createLandmarker(): Promise<FaceLandmarkerType | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

    const local = await hasLocalAssets();
    const fileset = await FilesetResolver.forVisionTasks(local ? LOCAL_BASE : CDN_WASM);
    const modelAssetPath = local ? `${LOCAL_BASE}/face_landmarker.task` : CDN_MODEL;

    const create = (delegate: "GPU" | "CPU") =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: "IMAGE",
        numFaces: 6,
        outputFaceBlendshapes: false,
      });

    try {
      return await create("GPU");
    } catch {
      // Locked-down or software-rendered browsers reject the WebGL delegate.
      return await create("CPU");
    }
  } catch (err) {
    console.warn("Face landmarker unavailable, falling back to filter-only mode.", err);
    return null;
  }
}

async function hasLocalAssets() {
  try {
    const res = await fetch(`${LOCAL_BASE}/face_landmarker.task`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Detects every face in the canvas and converts to pixel-space geometry. */
export async function detectFaces(
  canvas: HTMLCanvasElement,
): Promise<FaceGeometry[]> {
  const landmarker = await loadFaceLandmarker();
  if (!landmarker) return [];

  let result;
  try {
    result = landmarker.detect(canvas);
  } catch (err) {
    console.warn("Face detection failed.", err);
    return [];
  }

  const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const w = canvas.width;
  const h = canvas.height;

  return (result.faceLandmarks ?? []).map((landmarks) => {
    const points: Pt[] = landmarks.map((p) => ({ x: p.x * w, y: p.y * h }));

    const pick = (connections: { start: number; end: number }[]) =>
      uniqueIndices(connections)
        .map((i) => points[i])
        .filter(Boolean);

    const faceOval = orderOval(pick(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL));
    const leftEye = pick(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
    const rightEye = pick(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
    const leftBrow = pick(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW);
    const rightBrow = pick(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW);
    const lips = pick(FaceLandmarker.FACE_LANDMARKS_LIPS);

    const center = centroid(faceOval);
    const leftCenter = centroid(leftEye);
    const rightCenter = centroid(rightEye);
    const eyeSpan = Math.hypot(leftCenter.x - rightCenter.x, leftCenter.y - rightCenter.y);

    const xs = faceOval.map((p) => p.x);
    const ys = faceOval.map((p) => p.y);

    return {
      points,
      faceOval,
      leftEye,
      rightEye,
      leftBrow,
      rightBrow,
      lips,
      center,
      eyeSpan: eyeSpan || 1,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  });
}

function uniqueIndices(connections: { start: number; end: number }[]) {
  const set = new Set<number>();
  for (const c of connections) {
    set.add(c.start);
    set.add(c.end);
  }
  return [...set];
}

export function centroid(points: Pt[]): Pt {
  if (!points.length) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** The oval indices come back unordered; sort by angle so it forms a polygon. */
function orderOval(points: Pt[]): Pt[] {
  const c = centroid(points);
  return [...points].sort(
    (a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x),
  );
}

export function spanOf(points: Pt[]) {
  if (!points.length) return 0;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}
