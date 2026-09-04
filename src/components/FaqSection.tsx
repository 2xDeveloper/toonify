import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "~/lib/faq";
import { cn } from "~/lib/utils";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-6 px-6 py-20">
      <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
        Questions
      </p>
      <h2 className="font-display mt-3 text-center text-4xl text-foreground sm:text-5xl">
        Before you upload
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-muted">
        Short answers about the free cartoon, your photo, and what you can do with the result.
      </p>

      <div className="mt-10 space-y-3">
        {FAQS.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.q} className="card-pop overflow-hidden">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground sm:text-[15px]">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
