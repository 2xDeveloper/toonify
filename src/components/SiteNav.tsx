import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

const LINKS = [
  { to: "/", hash: undefined, label: "Home" },
  { to: "/", hash: "studio", label: "Studio" },
  { to: "/", hash: "faq", label: "FAQ" },
  { to: "/terms", hash: undefined, label: "Terms" },
  { to: "/privacy", hash: undefined, label: "Privacy" },
] as const;

export function SiteNav() {
  const { pathname, hash } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      hash: s.location.hash.replace(/^#/, ""),
    }),
  });

  return (
    <div>
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-[1.65rem] leading-none tracking-tight">Toonify</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/15 md:flex">
          {LINKS.map((item) => {
            const active =
              item.to === pathname &&
              (item.hash ? hash === item.hash : pathname !== "/" || !hash || hash === "top");

            return (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
                hashScrollIntoView={{ behavior: "smooth", block: "start" }}
                activeOptions={{ exact: true, includeHash: true }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium text-white/90 transition-colors",
                  active && "bg-white/90 text-sky-deep shadow-sm",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/"
          hash="studio"
          hashScrollIntoView={{ behavior: "smooth", block: "start" }}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-deep shadow-sm transition hover:bg-white/90"
        >
          Make a cartoon
        </Link>
      </header>

      <nav className="relative z-20 mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-2 md:hidden">
        {LINKS.map((item) => (
          <Link
            key={`m-${item.label}`}
            to={item.to}
            hash={item.hash}
            hashScrollIntoView={{ behavior: "smooth", block: "start" }}
            activeOptions={{ exact: true, includeHash: true }}
            className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-white/90"
            activeProps={{ className: "bg-white/90 text-sky-deep" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
