import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
        <p>Toonify · cartoons for shirts, mugs, and cases.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/" hash="studio" hashScrollIntoView={{ behavior: "smooth", block: "start" }} className="hover:text-foreground">
            Studio
          </Link>
          <Link to="/" hash="faq" hashScrollIntoView={{ behavior: "smooth", block: "start" }} className="hover:text-foreground">
            FAQ
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
