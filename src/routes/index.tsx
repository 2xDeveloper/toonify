import { useEffect } from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { FaqSection } from "~/components/FaqSection";
import { Hero } from "~/components/Hero";
import { SiteFooter } from "~/components/SiteFooter";
import { Studio } from "~/components/Studio";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const hash = useRouterState({ select: (s) => s.location.hash.replace(/^#/, "") });

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <Studio />
      <FaqSection />
      <SiteFooter />
    </main>
  );
}
