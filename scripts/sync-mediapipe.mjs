/**
 * Copies the MediaPipe WASM runtime out of node_modules and downloads the face
 * landmarker weights into public/mediapipe so production serves both from our
 * own origin. Nothing here runs at request time.
 *
 * MediaPipe and its models are Apache-2.0, which permits commercial use.
 */
import { access, copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "mediapipe");

const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const MODEL = {
  name: "face_landmarker.task",
  url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  minBytes: 1_000_000,
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const wasmDir = join(root, "node_modules", "@mediapipe", "tasks-vision");
  for (const file of WASM_FILES) {
    const from = join(wasmDir, "wasm", file);
    const fallback = join(wasmDir, file);
    const src = (await exists(from)) ? from : fallback;
    if (!(await exists(src))) {
      console.warn(`[mediapipe] missing ${file} in the npm package, skipping`);
      continue;
    }
    await copyFile(src, join(outDir, file));
  }

  const modelPath = join(outDir, MODEL.name);
  if (await exists(modelPath)) {
    const info = await stat(modelPath);
    if (info.size >= MODEL.minBytes) {
      console.log("[mediapipe] model already present");
      return;
    }
  }

  console.log("[mediapipe] downloading face landmarker weights…");
  try {
    const res = await fetch(MODEL.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log("[mediapipe] model saved to public/mediapipe");
  } catch (err) {
    // Not fatal: the app falls back to the official CDN at runtime.
    console.warn(`[mediapipe] download failed (${err.message}); runtime will use the CDN`);
  }
}

await main();
