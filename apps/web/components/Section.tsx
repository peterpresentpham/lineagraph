import type { ReactNode } from "react";
import { cn } from "@lineagraph/ui";

type SectionProps = {
  title: string;
  /** Small uppercase label above the title (home page sections). */
  eyebrow?: string;
  /** One line under the title. */
  description?: string;
  /** Larger heading, for the main sections of a page. */
  large?: boolean;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({ title, eyebrow, description, large, action, children }: SectionProps) {
  return (
    <section className={large ? "mt-20" : "mt-section"}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h2
            className={cn(
              "flex items-center gap-2.5",
              large && "text-headline text-[length:var(--text-headline)] leading-tight",
            )}
          >
            {!large && <span className="bg-brand-gradient h-5 w-1 rounded-full" aria-hidden />}
            {title}
          </h2>
          {description && <p className="text-muted-foreground mt-2 max-w-xl">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type EmptyProps = { children: ReactNode };

export function Empty({ children }: EmptyProps) {
  return (
    <p className="bg-dots text-muted-foreground rounded-2xl border border-dashed p-8 text-center">
      {children}
    </p>
  );
}
