import type { ReactNode } from "react";

type SectionProps = { title: string; children: ReactNode };

export function Section({ title, children }: SectionProps) {
  return (
    <section className="mt-8">
      <h2>{title}</h2>
      <div className="rule-gold mb-4 mt-2" />
      {children}
    </section>
  );
}

type EmptyProps = { children: ReactNode };

export function Empty({ children }: EmptyProps) {
  return (
    <p className="text-muted-foreground rounded-[var(--radius)] border border-dashed p-6 text-center">
      {children}
    </p>
  );
}
