import type { ReactNode } from "react";
import { cn } from "@lineagraph/ui";
import { LineageMotif } from "@/components/LineageMotif";

type Props = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Avatar / icon shown left of the title. */
  leading?: ReactNode;
  /** Badges or buttons shown under the description. */
  meta?: ReactNode;
  /** Larger aurora hero panel instead of a plain heading (detail pages). */
  hero?: boolean;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, leading, meta, hero, className }: Props) {
  return (
    <header
      className={cn(
        "animate-fade-up relative flex items-start gap-5",
        // The dark panel carries the dark token values for its badges and avatar.
        hero && "bg-ink scheme-dark overflow-hidden rounded-3xl p-6 shadow-lg sm:p-10",
        className,
      )}
    >
      {hero && (
        <LineageMotif className="text-gold-400 pointer-events-none absolute -right-16 top-1/2 hidden w-[26rem] max-w-none -translate-y-1/2 opacity-25 sm:block" />
      )}
      {leading && <div className="relative">{leading}</div>}
      <div className="relative min-w-0">
        {eyebrow && <p className={cn("eyebrow mb-1.5", hero && "!text-gold-300")}>{eyebrow}</p>}
        <h1 className={cn(hero && "text-display text-white")}>{title}</h1>
        {description && (
          <div
            className={cn(
              "mt-2 max-w-2xl text-pretty",
              hero ? "text-night-200" : "text-muted-foreground",
            )}
          >
            {description}
          </div>
        )}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
    </header>
  );
}
