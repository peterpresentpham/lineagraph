import type { ReactNode, SelectHTMLAttributes } from "react";
import { Label, cn } from "@lineagraph/ui";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] px-3 text-[15px] text-foreground outline-none focus-visible:border-[var(--primary)] disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
