import Link from "next/link";
import { Cake, Flame, Swords } from "lucide-react";
import type { TodayEntry } from "@/lib/types";

type Props = {
  entries: TodayEntry[];
  /** Year the "n years ago" is counted from. */
  currentYear: number;
};

const typeInfo = {
  birth: { label: "Sinh ngày này", icon: Cake },
  death: { label: "Mất ngày này", icon: Flame },
  event: { label: "Sự kiện ngày này", icon: Swords },
} as const;

/** How many years before `currentYear`; there is no year 0, so a BCE year counts one more. */
export const yearsAgo = (year: number, currentYear: number) =>
  currentYear - year - (year < 0 ? 1 : 0);

/** One row: the year big on the left, then the name and how long ago it was. */
export function TodayRow({ entry, currentYear }: { entry: TodayEntry; currentYear: number }) {
  const { icon: Icon, label } = typeInfo[entry.type];
  const ago = yearsAgo(entry.date.year, currentYear);
  const href = `/${entry.kind}/${entry.slug}`;
  return (
    <li>
      <Link href={href} className="surface-interactive flex items-center gap-4 p-4 no-underline">
        <span className="text-primary w-24 shrink-0 font-serif text-2xl font-semibold leading-none">
          {entry.date.year < 0 ? `${-entry.date.year} TCN` : entry.date.year}
        </span>
        <span className="min-w-0">
          <span className="text-foreground block font-serif text-lg font-semibold leading-snug">
            {entry.name}
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Icon className="size-3.5" aria-hidden />
            {label}
            {ago > 0 && ` · cách đây ${ago} năm`}
            {entry.date.calendar === "julian" && " · lịch Julius"}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Entries grouped as births, deaths and events, each group under its own heading. */
export function TodayList({ entries, currentYear }: Props) {
  const groups = (["event", "birth", "death"] as const)
    .map((type) => ({ type, rows: entries.filter((e) => e.type === type) }))
    .filter((g) => g.rows.length > 0);
  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ type, rows }) => (
        <section key={type}>
          <h2 className="mb-3 text-xl">{typeInfo[type].label}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((e) => (
              <TodayRow key={`${e.kind}-${e.slug}-${e.type}`} entry={e} currentYear={currentYear} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
