/**
 * Hand-drawn cartoon bodies.
 *
 * These are original flat-vector drawings authored for this project, so there
 * is no third-party licence attached to the output. The caricatured head is
 * composited over the `head` anchor, which is deliberately oversized relative
 * to the torso — that big-head-small-body ratio is what reads as "caricature"
 * rather than "photo with a filter".
 */

export type PoseId =
  | "stand"
  | "hips"
  | "hero"
  | "wave"
  | "thumbs"
  | "dance";

export type BodyPalette = {
  /** Follows the selected product colour so the print feels co-ordinated. */
  shirt: string;
  pants: string;
  shoes: string;
  skin: string;
};

export type BodyPose = {
  id: PoseId;
  label: string;
  width: number;
  height: number;
  /** Where the head cutout is centred, and how wide it should be drawn. */
  head: { cx: number; cy: number; r: number };
  render: (c: BodyPalette) => string;
};

const W = 420;
const H = 620;
const HEAD = { cx: 210, cy: 158, r: 132 };

/** Shared torso so every pose keeps the same build. */
function torso(c: BodyPalette) {
  return `
    <path d="M196 268 h28 v44 h-28 z" fill="${c.skin}" />
    <path d="M150 316 Q210 292 270 316 L286 452 Q210 472 134 452 Z"
          fill="${c.shirt}" stroke="#1f2937" stroke-opacity=".5" stroke-width="4" stroke-linejoin="round" />
    <path d="M196 296 Q210 314 224 296" fill="none" stroke="#1f2937" stroke-opacity=".35" stroke-width="4" />
  `;
}

/** Arms and legs are strokes — far cleaner than outlining every limb. */
function limb(d: string, color: string, width: number) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"
            stroke-linecap="round" stroke-linejoin="round" />`;
}

function hand(cx: number, cy: number, c: BodyPalette) {
  return `<circle cx="${cx}" cy="${cy}" r="19" fill="${c.skin}" stroke="#1f2937" stroke-opacity=".4" stroke-width="3" />`;
}

function legsAndShoes(c: BodyPalette, spread = 0) {
  const lx = 176 - spread;
  const rx = 244 + spread;
  return `
    ${limb(`M182 448 L${lx} 556`, c.pants, 40)}
    ${limb(`M238 448 L${rx} 556`, c.pants, 40)}
    <ellipse cx="${lx - 6}" cy="572" rx="34" ry="17" fill="${c.shoes}" />
    <ellipse cx="${rx + 6}" cy="572" rx="34" ry="17" fill="${c.shoes}" />
  `;
}

function sleeve(d: string, c: BodyPalette) {
  return limb(d, c.shirt, 40);
}

export const BODY_POSES: BodyPose[] = [
  {
    id: "stand",
    label: "Classic",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      ${limb("M158 326 C132 372 124 410 122 448", c.skin, 26)}
      ${limb("M262 326 C288 372 296 410 298 448", c.skin, 26)}
      ${sleeve("M158 326 C144 350 138 366 134 384", c)}
      ${sleeve("M262 326 C276 350 282 366 286 384", c)}
      ${torso(c)}
      ${hand(122, 452, c)}
      ${hand(298, 452, c)}
      ${legsAndShoes(c)}
    `,
  },
  {
    id: "hips",
    label: "Confident",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      ${limb("M158 328 C112 356 104 400 148 418", c.skin, 26)}
      ${limb("M262 328 C308 356 316 400 272 418", c.skin, 26)}
      ${sleeve("M158 328 C132 344 120 362 116 382", c)}
      ${sleeve("M262 328 C288 344 300 362 304 382", c)}
      ${torso(c)}
      ${hand(150, 420, c)}
      ${hand(270, 420, c)}
      ${legsAndShoes(c, 6)}
    `,
  },
  {
    id: "hero",
    label: "Superhero",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      <path d="M158 306 Q210 286 262 306 L316 520 Q210 470 104 520 Z"
            fill="#b3261e" stroke="#7f1d1d" stroke-width="4" stroke-linejoin="round" opacity=".92" />
      ${limb("M158 328 C112 356 104 400 148 418", c.skin, 26)}
      ${limb("M262 328 C308 356 316 400 272 418", c.skin, 26)}
      ${sleeve("M158 328 C132 344 120 362 116 382", c)}
      ${sleeve("M262 328 C288 344 300 362 304 382", c)}
      ${torso(c)}
      <path d="M210 340 l26 44 -26 14 -26 -14 z" fill="#fbbf24" stroke="#92400e" stroke-width="3" stroke-linejoin="round" />
      ${hand(150, 420, c)}
      ${hand(270, 420, c)}
      ${legsAndShoes(c, 10)}
    `,
  },
  {
    id: "wave",
    label: "Waving",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      ${limb("M262 326 C312 292 330 246 330 208", c.skin, 26)}
      ${limb("M158 326 C132 372 124 410 122 448", c.skin, 26)}
      ${sleeve("M262 326 C288 310 300 296 306 280", c)}
      ${sleeve("M158 326 C144 350 138 366 134 384", c)}
      ${torso(c)}
      ${hand(330, 200, c)}
      ${hand(122, 452, c)}
      ${legsAndShoes(c)}
    `,
  },
  {
    id: "thumbs",
    label: "Thumbs up",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      ${limb("M158 326 C132 372 124 410 122 448", c.skin, 26)}
      ${limb("M262 330 C296 348 292 384 254 392", c.skin, 26)}
      ${sleeve("M158 326 C144 350 138 366 134 384", c)}
      ${sleeve("M262 330 C282 340 288 354 288 366", c)}
      ${torso(c)}
      ${hand(122, 452, c)}
      <g>
        ${hand(250, 392, c)}
        <path d="M250 372 v-20" stroke="${c.skin}" stroke-width="15" stroke-linecap="round" />
        <path d="M250 372 v-20" stroke="#1f2937" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>
      ${legsAndShoes(c)}
    `,
  },
  {
    id: "dance",
    label: "Dancing",
    width: W,
    height: H,
    head: HEAD,
    render: (c) => `
      ${limb("M262 322 C316 288 338 240 336 196", c.skin, 26)}
      ${limb("M158 330 C112 356 100 398 120 430", c.skin, 26)}
      ${sleeve("M262 322 C290 304 304 286 310 268", c)}
      ${sleeve("M158 330 C136 344 126 362 122 380", c)}
      ${torso(c)}
      ${hand(336, 188, c)}
      ${hand(122, 434, c)}
      ${limb("M186 450 L156 560", c.pants, 40)}
      ${limb("M240 446 C288 452 320 470 342 500", c.pants, 40)}
      <ellipse cx="148" cy="574" rx="34" ry="17" fill="${c.shoes}" />
      <ellipse cx="352" cy="512" rx="32" ry="16" fill="${c.shoes}" transform="rotate(28 352 512)" />
      <path d="M96 300 q-16 14 -4 30 M92 350 q-18 12 -8 28" stroke="#1f2937" stroke-opacity=".3"
            stroke-width="4" fill="none" stroke-linecap="round" />
    `,
  },
];

export function getPose(id: PoseId): BodyPose {
  return BODY_POSES.find((p) => p.id === id) ?? BODY_POSES[0];
}

/** Full standalone SVG document for a pose, ready to rasterize. */
export function poseToSvg(pose: BodyPose, palette: BodyPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pose.width} ${pose.height}" width="${pose.width}" height="${pose.height}">${pose.render(palette)}</svg>`;
}
