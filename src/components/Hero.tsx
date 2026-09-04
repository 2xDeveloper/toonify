import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { SiteNav } from "~/components/SiteNav";

export function Hero() {
  return (
    <section id="top" className="sky-canvas sky-grain relative overflow-hidden">
      <SiteNav />

      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-8 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
          <Zap className="size-3 fill-white" />
          Trusted by families who like a good shirt
        </span>

        <h1 className="font-display mt-7 text-[2.7rem] leading-[1.08] text-white sm:text-6xl lg:text-[4.35rem]">
          Turn Every Family Photo
          <br />
          Into A Cartoon You Can Wear
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">
          Upload a picture, pick a style, and drop your character on a t-shirt, mug, or phone
          case. The cartoon is free. The merch is the fun part.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            hash="studio"
            hashScrollIntoView={{ behavior: "smooth", block: "start" }}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-sky-deep shadow-[0_12px_28px_-12px_rgba(10,40,90,0.45)] transition hover:bg-white/92"
          >
            Make a cartoon
          </Link>
          <Link
            to="/"
            hash="faq"
            hashScrollIntoView={{ behavior: "smooth", block: "start" }}
            className="rounded-full border border-white/50 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Read the FAQs
          </Link>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-6 max-w-6xl px-4 pb-28 sm:px-6 sm:pb-36">
        <HeroPreview />
      </div>

      <CloudBank />
    </section>
  );
}

function HeroPreview() {
  return (
    <div
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem]"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 14%, black 58%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 14%, black 58%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <img
        src="/hero-studio.jpg"
        alt="Toonify studio — photos turned into cartoon portraits"
        className="w-full origin-center scale-[1.04]"
      />
    </div>
  );
}

function CloudBank() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[min(42vw,380px)]">
      <svg
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="cloud-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#eef6ff" stopOpacity="1" />
          </linearGradient>
          <filter id="cloud-soft" x="-8%" y="-30%" width="116%" height="170%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g filter="url(#cloud-soft)" fill="url(#cloud-shade)">
          <ellipse cx="90" cy="250" rx="180" ry="70" />
          <ellipse cx="280" cy="210" rx="210" ry="90" />
          <ellipse cx="520" cy="240" rx="190" ry="78" />
          <ellipse cx="760" cy="200" rx="230" ry="95" />
          <ellipse cx="1020" cy="230" rx="200" ry="82" />
          <ellipse cx="1260" cy="215" rx="220" ry="88" />
          <ellipse cx="1440" cy="260" rx="170" ry="72" />
        </g>

        <g fill="#ffffff">
          <ellipse cx="160" cy="300" rx="170" ry="62" />
          <ellipse cx="400" cy="318" rx="200" ry="70" />
          <ellipse cx="680" cy="292" rx="230" ry="78" />
          <ellipse cx="980" cy="310" rx="210" ry="68" />
          <ellipse cx="1280" cy="300" rx="200" ry="74" />
        </g>

        <rect x="0" y="340" width="1440" height="80" fill="#ffffff" />
      </svg>
    </div>
  );
}
