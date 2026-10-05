import type { ReactNode } from "react";

type SectionProps = { title: string; action?: ReactNode; children: ReactNode };

export function Section({ title, action, children }: SectionProps) {
  return (
    <section className="mt-section">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="flex items-center gap-2.5">
          <span className="bg-brand-gradient h-5 w-1 rounded-full" aria-hidden />
          {title}
        </h2>
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
