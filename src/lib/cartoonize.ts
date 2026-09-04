import { createServerFn } from "@tanstack/react-start";

/**
 * Photo → cartoon via OpenAI Images (edits).
 * The secret key is read inside the handler so it never lands in the client bundle.
 */

const OPENAI_EDITS = "https://api.openai.com/v1/images/edits";
const TIMEOUT_MS = 90_000;
const MAX_BYTES = 12 * 1024 * 1024;

export const TOON_STYLES = [
  {
    id: "caricature",
    label: "Cute Caricature",
    blurb: "Big-head ink caricature. Hand-drawn lines, bright paint, white background.",
  },
  {
    id: "3d",
    label: "3D Cartoon",
    blurb: "Pixar-style cute characters. Big eyes, smooth faces — not photoreal.",
  },
] as const;

export type StyleId = (typeof TOON_STYLES)[number]["id"];

export type ToonResult = {
  /** PNG data URL, ready to drop straight into an <img src>. */
  art: string;
  faces: number;
  remaining: number;
};

const STYLE_IDS: ReadonlySet<string> = new Set(TOON_STYLES.map((s) => s.id));

const PROMPTS: Record<StyleId, string> = {
  caricature: [
    "Create a brand-new professional merch caricature from this photo. This is a full redraw by a skilled caricature illustrator, not a filter, not a 3D render, and not a traced photo.",
    "Genre: modern digital caricature sold as custom couple/family art. Big-head, small-body cartoon. Fun, flattering, and cute — never mean, never creepy.",
    "Proportions: heads about 2 to 3 times too big, compact simplified bodies and hands. If the photo is a close portrait, still invent a small torso and shoulders so it reads as a caricature, not a floating face. Keep the real pose if it is clear; do not invent a new gimmick pose.",
    "Line art: confident varied black ink outlines, thicker on the silhouette, thinner inside. Light cross-hatching and short tick marks for shadow under chins, in hair, and in clothing folds. It must look hand-inked.",
    "Paint: rich marker and digital-watercolor fills, warm skin with a soft blush, bright clothing colors, glossy white highlights on eyes, lips, nose, and hair. Smooth painted skin — no pores, no camera grain.",
    "Faces: large lively cartoon eyes with clear irises and sparkle, a joyful open smile, simplified cute noses. Exaggerate the most recognizable traits a little (hair volume, glasses, smile) while staying kind.",
    "Identity: same people and same count, same ages, hair color and hairstyle, skin tone, glasses, facial hair as graphic marks (not photoreal stubble), and clothing colors.",
    "Background: clean plain white. No ground texture needed beyond a tiny hatch shadow under the feet if full bodies are shown.",
    "Hard avoid: photorealism, uncanny valley, horror, grimaces, extra people, text, captions, logos, badges, watermarks, inset photos, frames, signatures.",
  ].join(" "),
  "3d": [
    "Turn this photo into a cute Pixar / Disney 3D animated character portrait, like a modern family film still.",
    "Style: fully stylized 3D cartoon. Big glossy eyes with bright catchlights, tiny button nose, round soft cheeks with blush, chunky sculpted hair.",
    "Skin must look like smooth painted animation, not a real person. No pores, no peach fuzz, no photoreal teeth or gums.",
    "Mood: warm, friendly, wholesome. Soft studio lighting, gentle shadows, simple clean background.",
    "Keep recognizable: the same people and count, ages, hair color, skin tone, glasses, and clothing colors.",
    "Do not preserve photographic facial structure. Stylize hard so it cannot look like a filtered photo.",
    "Avoid: uncanny valley, realistic human faces, horror, extra people, text, watermarks, logos.",
  ].join(" "),
};

async function resolveOpenAIKey(): Promise<string> {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    for (const name of [".env.local", ".env"]) {
      try {
        const text = readFileSync(resolve(process.cwd(), name), "utf8");
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eq = trimmed.indexOf("=");
          if (eq === -1) continue;
          if (trimmed.slice(0, eq).trim() !== "OPENAI_API_KEY") continue;
          let value = trimmed.slice(eq + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (value) return value;
        }
      } catch {
        /* missing file */
      }
    }
  } catch {
    /* fs unavailable in this runtime */
  }

  return "";
}

type OpenAIErrorBody = {
  error?: { message?: string };
};

type OpenAIImageBody = {
  data?: Array<{ b64_json?: string }>;
};

export const cartoonize = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }): Promise<ToonResult> => {
    const apiKey = await resolveOpenAIKey();
    if (!apiKey) {
      throw new Error(
        "The cartoon service isn't set up yet. Try again in a bit.",
      );
    }

    const photo = data.get("photo");
    const style = String(data.get("style") ?? "caricature") as StyleId;

    if (!(photo instanceof File)) throw new Error("No photo was uploaded.");
    if (!photo.type.startsWith("image/")) throw new Error("That file isn't an image.");
    if (photo.size > MAX_BYTES) throw new Error("That image is over 12 MB. Try a smaller one.");
    if (!STYLE_IDS.has(style)) throw new Error("Unknown style.");

    const { assertCanGenerate, recordGenerate } = await import("./rate-limit.server");
    await assertCanGenerate();

    const body = new FormData();
    body.set("model", "gpt-image-1-mini");
    body.set("prompt", PROMPTS[style]);
    body.set("quality", "medium");
    body.set("size", "1024x1024");
    body.set("input_fidelity", "low");
    body.set("image", photo, photo.name || "photo.jpg");

    let response: Response;
    try {
      response = await fetch(OPENAI_EDITS, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new Error("The cartoon service did not respond. Check your connection and try again.", {
        cause,
      });
    }

    const raw = await response.text();
    if (!response.ok) {
      let detail = raw.slice(0, 240);
      try {
        const parsed = JSON.parse(raw) as OpenAIErrorBody;
        if (parsed.error?.message) {
          detail = parsed.error.message.replace(/OpenAI'?s?/gi, "the cartoon service");
        }
      } catch {
        /* keep raw snippet */
      }
      throw new Error(detail || "The cartoon service could not finish that image.");
    }

    const parsed = JSON.parse(raw) as OpenAIImageBody;
    const b64 = parsed.data?.[0]?.b64_json;
    if (!b64) throw new Error("We didn't get an image back. Try again.");

    const quota = await recordGenerate();

    return {
      art: `data:image/png;base64,${b64}`,
      faces: 1,
      remaining: quota.remaining,
    };
  });
