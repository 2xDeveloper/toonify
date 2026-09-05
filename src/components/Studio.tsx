import { useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import {
  DEFAULT_NAME_POS,
  ProductMockup,
  type NamePos,
  type ProductId,
} from "~/components/ProductMockup";
import { TOON_STYLES, cartoonize, type StyleId } from "~/lib/cartoonize";
import { captureError } from "~/lib/error-capture";
import { preparePhoto } from "~/lib/prepare-photo";
import { WEEKLY_LIMIT, type QuotaView } from "~/lib/quota";
import { getCartoonQuota } from "~/lib/quota-fn";
import { cn } from "~/lib/utils";

type Product = {
  id: ProductId;
  label: string;
  price: number;
  sizes: string[];
};

const PRODUCTS: Product[] = [
  { id: "shirt", label: "T-Shirt", price: 29, sizes: ["XS", "S", "M", "L", "XL", "2XL"] },
  { id: "mug", label: "Mug", price: 19, sizes: ["11 oz", "15 oz"] },
  { id: "case", label: "Phone Case", price: 24, sizes: ["iPhone", "Pixel", "Galaxy"] },
];

const COLORS = [
  { hex: "#ffffff", name: "White" },
  { hex: "#f1e7d3", name: "Cream" },
  { hex: "#f7d774", name: "Sunflower" },
  { hex: "#ef8f7d", name: "Coral" },
  { hex: "#a9c7e8", name: "Sky" },
  { hex: "#9fd3b8", name: "Mint" },
  { hex: "#5b6472", name: "Slate" },
];

export function Studio() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<StyleId>("caricature");
  const [art, setArt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaView>({
    remaining: WEEKLY_LIMIT,
    used: 0,
    limit: WEEKLY_LIMIT,
  });

  const [product, setProduct] = useState<ProductId>("shirt");
  const [color, setColor] = useState(COLORS[1].hex);
  const [size, setSize] = useState("M");
  const [printName, setPrintName] = useState("");
  const [namePos, setNamePos] = useState<Record<ProductId, NamePos>>({ ...DEFAULT_NAME_POS });

  const fileInput = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const photoRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    void getCartoonQuota()
      .then(setQuota)
      .catch(() => {
        /* keep the default until the first generate */
      });
  }, []);

  useEffect(() => {
    return () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);

    return () => window.clearInterval(tick);
  }, [loading]);

  const activeProduct = PRODUCTS.find((p) => p.id === product) ?? PRODUCTS[0];

  function pickProduct(next: ProductId) {
    setProduct(next);
    const nextProduct = PRODUCTS.find((p) => p.id === next);
    if (nextProduct && !nextProduct.sizes.includes(size)) {
      setSize(nextProduct.sizes[Math.min(2, nextProduct.sizes.length - 1)]);
    }
  }

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Pick a JPG or PNG image.");
      return;
    }

    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(selected));
    setFile(selected);
    fileRef.current = selected;
    setArt(null);
    setError(null);
  }

  async function runCartoon(overrides: { source?: File; style?: StyleId } = {}) {
    const source = overrides.source ?? fileRef.current ?? file;
    if (!source) return;

    const id = ++runId.current;
    setLoading(true);
    setError(null);
    setNotice(null);

    const body = new FormData();
    body.set("photo", await preparePhoto(source));
    body.set("style", overrides.style ?? style);

    try {
      const result = await cartoonize({ data: body });

      if (id !== runId.current) return;
      setQuota({
        remaining: result.remaining,
        used: WEEKLY_LIMIT - result.remaining,
        limit: WEEKLY_LIMIT,
      });
      setArt(result.art);
      if (!result.faces) {
        setNotice(
          "No face found, so only the backdrop was restyled. A clear, front-facing photo works best.",
        );
      }
    } catch (err) {
      if (id !== runId.current) return;
      setError(captureError(err, "Cartoon"));
      setArt(null);
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }

  function pickStyle(next: StyleId) {
    setStyle(next);
  }

  const outOfQuota = quota.remaining <= 0;

  function generate() {
    const source = fileRef.current ?? file;
    if (!source || loading || outOfQuota) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    void runCartoon({ source });
  }

  function download() {
    if (!art) return;
    const link = document.createElement("a");
    link.href = art;
    link.download = `toonify-${style}.png`;
    link.click();
  }

  function clearAll() {
    runId.current += 1;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setFile(null);
    fileRef.current = null;
    setArt(null);
    setPrintName("");
    setNamePos({ ...DEFAULT_NAME_POS });
    setLoading(false);
    setError(null);
    setNotice(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const phase =
    elapsed < 10
      ? "Sending your photo…"
      : elapsed < 35
        ? "Sketching the cartoon…"
        : elapsed < 70
          ? "Still drawing — this part is slow."
          : "Taking longer than usual. Hang tight.";

  const status = loading
    ? `${phase} ${elapsed}s`
    : art
      ? "Nice. Download the art or pick a style and generate again."
      : "Upload a photo, pick a style, then tap Make my cartoon.";

  return (
    <section id="studio" className="relative z-10 scroll-mt-6 bg-white px-6 pt-4 pb-8">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Studio
        </p>
        <h2 className="font-display mt-3 text-4xl text-foreground sm:text-5xl">
          Upload a photo. Pick a style.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Upload a picture, choose cute caricature or 3D cartoon, then tap Make my cartoon. You
          get {WEEKLY_LIMIT} free cartoons a week. Each generate can take up to two minutes.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="card-pop space-y-8 p-6">
          <Step index={1} title="Upload a photo" active>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-background p-3 text-left transition-colors hover:border-accent"
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary">
                {photo ? (
                  <img src={photo} alt="Your upload" className="size-full object-cover" />
                ) : (
                  <Upload className="size-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {file ? file.name : "Choose a photo"}
                </span>
                <span className="block text-xs text-muted">
                  {file ? "Tap to swap it out" : "JPG or PNG — a clear, front-facing photo works best"}
                </span>
              </span>
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {TOON_STYLES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.blurb}
                  onClick={() => pickStyle(preset.id)}
                  className={cn("chip w-full", style === preset.id && "chip-active")}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="mt-2 text-xs text-muted">
              {TOON_STYLES.find((s) => s.id === style)?.blurb}
            </p>

            <button
              type="button"
              onClick={generate}
              disabled={!file || outOfQuota}
              aria-busy={loading}
              className={cn("btn-pop mt-4 w-full px-5 py-3 text-sm", loading && "pointer-events-none")}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {loading
                ? "Drawing your cartoon…"
                : outOfQuota
                  ? "Weekly limit reached"
                  : "Make my cartoon"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              {outOfQuota
                ? "You've used this week's 3 free cartoons. Come back next week."
                : `${quota.remaining} of ${quota.limit} free cartoons left this week.`}
            </p>

            {loading && (
              <div
                className="mt-3 rounded-xl bg-primary-soft px-3.5 py-3"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-semibold text-primary">{phase}</p>
                <p className="mt-1 text-xs text-muted">
                  {elapsed}s elapsed · usually 20–45 seconds. Leave this tab open.
                </p>
                <div className="progress-indeterminate mt-2.5 h-1.5 rounded-full" />
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            {notice && !error && <p className="mt-3 text-xs text-muted">{notice}</p>}
          </Step>

          <Step index={2} title="Pick your product" active={Boolean(art)}>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickProduct(item.id)}
                  className={cn("chip", product === item.id && "chip-active")}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.hex}
                  onClick={() => setColor(swatch.hex)}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform",
                    color === swatch.hex
                      ? "border-primary scale-110"
                      : "border-line hover:scale-105",
                  )}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase">
                Name on the product
              </span>
              <input
                type="text"
                value={printName}
                maxLength={22}
                placeholder="e.g. Maya"
                autoComplete="given-name"
                onChange={(event) => setPrintName(event.target.value)}
                className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-accent"
              />
              <span className="mt-2 block text-xs text-muted">
                Type a name, then drag it on the shirt, mug, or case.
              </span>
            </label>

            <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {activeProduct.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={cn("chip px-3 py-1.5", size === option && "chip-active")}
                >
                  {option}
                </button>
              ))}
            </div>
          </Step>

          <Step index={3} title="Checkout" active={false}>
            <div className="flex items-center justify-between rounded-xl bg-background p-4">
              <div>
                <p className="font-display text-2xl">${activeProduct.price}</p>
                <p className="text-xs text-muted">
                  {activeProduct.label} · {size}
                </p>
              </div>
              <button type="button" disabled className="btn-pop px-5 py-2.5 text-sm">
                <ShoppingBag className="size-4" />
                Add to cart
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Cart and checkout aren&apos;t wired up yet — download your art in the meantime.
            </p>
          </Step>
        </div>

        <div className="card-pop flex flex-col justify-between gap-6 p-6">
          <div
            ref={previewRef}
            className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-background p-6"
          >
            <ProductMockup
              product={product}
              color={color}
              art={art}
              blurred={loading}
              name={printName}
              namePos={namePos[product]}
              onNamePosChange={(pos) =>
                setNamePos((current) => ({ ...current, [product]: pos }))
              }
            />

            {loading && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/78 px-6 text-center backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
              >
                {photo && (
                  <img
                    src={photo}
                    alt=""
                    className="mb-4 size-20 rounded-2xl object-cover opacity-80 shadow-sm"
                  />
                )}
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-3 text-base font-semibold text-foreground">Drawing your cartoon</p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  {phase} {elapsed}s so far. This usually takes 20–45 seconds.
                </p>
                <div className="progress-indeterminate mt-4 h-1.5 w-48 max-w-full rounded-full" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Sparkles className="size-4 text-primary" />
              )}
              {status}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={download}
                disabled={!art || loading}
                className="chip disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" />
                Download
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={!photo && !art}
                className="chip disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="size-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  index,
  title,
  active,
  children,
}: {
  index: number;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs font-bold",
            active ? "bg-primary text-white" : "bg-primary-soft text-muted",
          )}
        >
          {index}
        </span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
