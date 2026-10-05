import type { ReactNode } from "react";
import { cn } from "@lineagraph/ui";

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
        "animate-fade-up flex items-start gap-5",
        hero && "bg-aurora border-border shadow-card rounded-3xl border p-6 sm:p-8",
        className,
      )}
    >
      {leading}
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className={cn(hero && "text-display")}>{title}</h1>
        {description && (
          <div className="text-muted-foreground mt-2 max-w-2xl text-pretty">{description}</div>
        )}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
    </header>
  );
}
