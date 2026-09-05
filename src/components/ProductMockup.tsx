import { useRef, useState, type PointerEvent } from "react";
import { cn } from "~/lib/utils";

export type ProductId = "shirt" | "mug" | "case";
export type NamePos = { x: number; y: number };

type Props = {
  product: ProductId;
  color: string;
  art?: string | null;
  blurred?: boolean;
  className?: string;
  name?: string;
  namePos?: NamePos;
  onNamePosChange?: (pos: NamePos) => void;
};

export const DEFAULT_NAME_POS: Record<ProductId, NamePos> = {
  shirt: { x: 50, y: 70 },
  mug: { x: 45.5, y: 74 },
  case: { x: 50, y: 80 },
};

/** Where the artwork sits on each mockup, as a share of the SVG box. */
const PRINT_AREA: Record<ProductId, { left: string; top: string; width: string; height: string }> = {
  shirt: { left: "35%", top: "34%", width: "30%", height: "32%" },
  mug: { left: "29%", top: "35%", width: "33%", height: "34%" },
  case: { left: "36%", top: "36%", width: "28%", height: "42%" },
};

export function ProductMockup({
  product,
  color,
  art,
  blurred = false,
  className,
  name,
  namePos,
  onNamePosChange,
}: Props) {
  const area = PRINT_AREA[product];
  const pos = namePos ?? DEFAULT_NAME_POS[product];

  return (
    <div className={cn("relative isolate mx-auto w-full max-w-[420px] [container-type:inline-size]", className)}>
      <svg viewBox="0 0 400 440" className="w-full drop-shadow-[0_18px_28px_rgba(30,41,59,0.14)]">
        <defs>
          <linearGradient id="mockup-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {product === "shirt" && <Shirt color={color} />}
        {product === "mug" && <Mug color={color} />}
        {product === "case" && <PhoneCase color={color} />}
      </svg>

      {art && (
        <div
          className="pointer-events-none absolute flex items-center justify-center rounded-md bg-white p-[4%] shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
          style={area}
        >
          <img
            src={art}
            alt="Your cartoon printed on the product"
            className={cn(
              "max-h-full max-w-full object-contain mix-blend-normal transition-[filter,opacity] duration-500",
              blurred ? "scale-[0.98] opacity-80 blur-md" : "blur-0 opacity-100",
            )}
          />
        </div>
      )}

      {!art && (
        <div
          className="pointer-events-none absolute flex items-center justify-center rounded-lg border border-dashed border-slate-300/80"
          style={area}
        >
          <span className="text-xs text-slate-400">your art here</span>
        </div>
      )}

      {name?.trim() && (
        <PrintName
          text={name.trim()}
          pos={pos}
          productColor={color}
          onMove={onNamePosChange}
        />
      )}
    </div>
  );
}

function luminance(hex: string) {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const r = Number.parseInt(n.slice(0, 2), 16) / 255;
  const g = Number.parseInt(n.slice(2, 4), 16) / 255;
  const b = Number.parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function PrintName({
  text,
  pos,
  productColor,
  onMove,
}: {
  text: string;
  pos: NamePos;
  productColor: string;
  onMove?: (pos: NamePos) => void;
}) {
  const nodeRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const light = luminance(productColor) > 0.55;
  const ink = light ? "#0f172a" : "#ffffff";
  const halo = light ? "#ffffff" : "#0f172a";

  function pointToPercent(clientX: number, clientY: number): NamePos | null {
    const box = nodeRef.current?.offsetParent;
    if (!(box instanceof HTMLElement)) return null;
    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100)),
    };
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!onMove) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!onMove || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = pointToPercent(event.clientX, event.clientY);
    if (next) onMove(next);
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  return (
    <button
      ref={nodeRef}
      type="button"
      aria-label={`Move the name ${text} on the product`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "absolute z-10 max-w-[70%] cursor-grab touch-none px-1.5 py-0.5 text-center font-display leading-none select-none",
        dragging && "z-20 cursor-grabbing scale-[1.04]",
      )}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: "translate(-50%, -50%)",
        color: ink,
        fontSize: "7cqi",
        textShadow: `-1px -1px 0 ${halo}, 1px -1px 0 ${halo}, -1px 1px 0 ${halo}, 1px 1px 0 ${halo}, 0 2px 10px rgba(15,23,42,0.2)`,
      }}
    >
      {text}
    </button>
  );
}

function Shirt({ color }: { color: string }) {
  const body =
    "M152 38 L112 52 L34 96 L78 172 L118 150 L118 404 Q118 418 132 418 L268 418 Q282 418 282 404 L282 150 L322 172 L366 96 L288 52 L248 38 Q200 84 152 38 Z";

  return (
    <g>
      <path d={body} fill={color} stroke="#0f172a" strokeOpacity="0.16" strokeWidth="2" />
      <path d={body} fill="url(#mockup-shade)" />
      <path
        d="M152 38 Q200 84 248 38"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.22"
        strokeWidth="3"
      />
      <path
        d="M140 46 Q200 98 260 46"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.1"
        strokeWidth="2"
      />
    </g>
  );
}

function Mug({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M272 168 q64 0 64 56 q0 56 -64 56"
        fill="none"
        stroke={color}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M272 168 q64 0 64 56 q0 56 -64 56"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.14"
        strokeWidth="23"
        strokeLinecap="round"
      />
      <rect x="88" y="112" width="188" height="228" rx="20" fill={color} />
      <rect
        x="88"
        y="112"
        width="188"
        height="228"
        rx="20"
        fill="url(#mockup-shade)"
        stroke="#0f172a"
        strokeOpacity="0.16"
        strokeWidth="2"
      />
      <ellipse cx="182" cy="118" rx="94" ry="17" fill="#0f172a" fillOpacity="0.1" />
      <ellipse cx="182" cy="116" rx="86" ry="13" fill="#ffffff" fillOpacity="0.7" />
    </g>
  );
}

function PhoneCase({ color }: { color: string }) {
  return (
    <g>
      <rect x="128" y="34" width="144" height="374" rx="34" fill={color} />
      <rect
        x="128"
        y="34"
        width="144"
        height="374"
        rx="34"
        fill="url(#mockup-shade)"
        stroke="#0f172a"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      <rect
        x="150"
        y="58"
        width="72"
        height="72"
        rx="20"
        fill="#0f172a"
        fillOpacity="0.14"
        stroke="#0f172a"
        strokeOpacity="0.2"
        strokeWidth="2"
      />
      <circle cx="172" cy="80" r="12" fill="#0f172a" fillOpacity="0.55" />
      <circle cx="200" cy="80" r="12" fill="#0f172a" fillOpacity="0.55" />
      <circle cx="172" cy="108" r="12" fill="#0f172a" fillOpacity="0.55" />
      <circle cx="202" cy="110" r="6" fill="#0f172a" fillOpacity="0.35" />
      <rect x="120" y="120" width="8" height="34" rx="4" fill="#0f172a" fillOpacity="0.2" />
      <rect x="120" y="168" width="8" height="52" rx="4" fill="#0f172a" fillOpacity="0.2" />
      <rect x="272" y="150" width="8" height="52" rx="4" fill="#0f172a" fillOpacity="0.2" />
    </g>
  );
}

export default ProductMockup;
