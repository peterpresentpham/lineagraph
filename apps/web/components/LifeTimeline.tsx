import Link from "next/link";
import type { DateValue } from "@/lib/types";

export type TimelineItem = {
  date: DateValue | null;
  title: string;
  detail?: string;
  href?: string;
};

type Props = { items: TimelineItem[] };

// A vertical life line: dated entries in order, each with its date on the left.
export function LifeTimeline({ items }: Props) {
  return (
    <ol className="border-border relative ml-2 border-l">
      {items.map((item, i) => (
        <li key={i} className="relative pb-5 pl-6 last:pb-0">
          <span
            className="bg-primary ring-background absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4"
            aria-hidden
          />
          <div className="text-muted-foreground text-xs tabular-nums">{item.date?.label}</div>
          <div className="text-foreground font-semibold">
            {item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
          </div>
          {item.detail && <div className="text-muted-foreground text-sm">{item.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
