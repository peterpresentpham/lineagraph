import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@lineagraph/ui";

export type OutlineItem = { id: string; label: string; count?: number; warn?: boolean };

type Props = {
  outline: OutlineItem[];
  children: ReactNode;
};

// A record's page: sections stacked in one column, with an outline that follows the scroll
// (a sticky list on wide screens, a scrolling strip on narrow ones).
export function DetailLayout({ outline, children }: Props) {
  const [active, setActive] = useState(outline[0]?.id);
  const ids = outline.map((o) => o.id).join(",");

  useEffect(() => {
    const els = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0]!.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  // A link such as /persons/ID#tenures opens the page at that section, once it has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ block: "start" }),
      400,
    );
    return () => clearTimeout(t);
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  const label = (o: OutlineItem) => (
    <>
      {o.label}
      {o.count !== undefined && (
        <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{o.count}</span>
      )}
      {o.warn && (
        <span
          className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500"
          aria-label="Cần xem"
        />
      )}
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="Các phần của trang" className="hidden lg:block">
        <ul className="sticky top-[120px] flex flex-col gap-0.5 text-sm">
          {outline.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => go(o.id)}
                aria-current={active === o.id ? "true" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground w-full rounded-lg px-3 py-1.5 text-left transition-colors",
                  active === o.id && "bg-accent text-foreground font-medium",
                )}
              >
                {label(o)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Các phần của trang" className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden">
        <ul className="flex gap-1.5 text-sm">
          {outline.map((o) => (
            <li key={o.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(o.id)}
                className="bg-muted hover:bg-accent rounded-full px-3 py-1"
              >
                {label(o)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </div>
  );
}
