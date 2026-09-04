import type { ReactNode } from "react";
import { Hero } from "~/components/Hero";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteNav } from "~/components/SiteNav";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="sky-canvas sky-grain relative overflow-hidden">
        <SiteNav />
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-8 pb-16 text-center">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/80 uppercase">
            Legal
          </p>
          <h1 className="font-display mt-3 text-4xl text-white sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-white/80">Last updated {updated}</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white" />
      </div>

      <article className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-foreground">
        {children}
      </article>

      <SiteFooter />
    </div>
  );
}

export function LegalBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display mb-2 text-2xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}
