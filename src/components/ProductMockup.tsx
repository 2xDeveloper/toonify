import { cn } from "~/lib/utils";

export type ProductId = "shirt" | "mug" | "case";

type Props = {
  product: ProductId;
  color: string;
  art?: string | null;
  blurred?: boolean;
  className?: string;
};

/** Where the artwork sits on each mockup, as a share of the SVG box. */
const PRINT_AREA: Record<ProductId, { left: string; top: string; width: string; height: string }> = {
  shirt: { left: "35%", top: "34%", width: "30%", height: "32%" },
  mug: { left: "29%", top: "35%", width: "33%", height: "34%" },
  case: { left: "36%", top: "36%", width: "28%", height: "42%" },
};

export function ProductMockup({ product, color, art, blurred = false, className }: Props) {
  const area = PRINT_AREA[product];

  return (
    <div className={cn("relative mx-auto w-full max-w-[420px]", className)}>
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
          className="pointer-events-none absolute flex items-center justify-center"
          style={{ ...area, mixBlendMode: "multiply" }}
        >
          <img
            src={art}
            alt="Your cartoon printed on the product"
            className={cn(
              "max-h-full max-w-full object-contain transition-[filter,opacity] duration-500",
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
    </div>
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
