import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2>{title}</h2>
      <div className="rule-gold mt-2 mb-4" />
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[var(--radius)] border border-dashed p-6 text-center text-muted-foreground">{children}</p>;
}
