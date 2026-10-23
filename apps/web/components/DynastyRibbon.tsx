import Link from "next/link";
import { cn } from "@lineagraph/ui";
import type { PolitySummary } from "@/lib/types";

type Props = { polities: PolitySummary[] };

// Bars share one colour family but differ in hue, so neighbouring dynasties are told apart.
const tones = [
  "from-brand-800 to-brand-600",
  "from-indigo-800 to-indigo-600",
  "from-gold-900 to-gold-700",
  "from-brand-700 to-brand-500",
  "from-indigo-700 to-indigo-500",
  "from-gold-800 to-gold-600",
] as const;

// "Dải triều đại": every polity that has a start and an end year, drawn as a bar on one shared
// time axis, so a visitor sees at a glance who came before whom and who overlapped.
export function DynastyRibbon({ polities }: Props) {
  const spans = polities
    .filter((p) => p.started?.year != null)
    .map((p) => ({
      polity: p,
      from: p.started!.year!,
      to: p.ended?.year ?? p.started!.year! + 1,
    }))
    .sort((a, b) => a.from - b.from);
  if (spans.length < 2) return null;

  const min = Math.min(...spans.map((s) => s.from));
  const max = Math.max(...spans.map((s) => s.to));
  const range = Math.max(max - min, 1);
  const pct = (year: number) => ((year - min) / range) * 100;
  // Rows: a polity goes on the first row where it does not overlap the previous bar.
  const rowEnds: number[] = [];
  const placed = spans.map((s) => {
    let row = rowEnds.findIndex((end) => end <= s.from);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = s.to;
    return { ...s, row };
  });

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(min + (range * i) / 4));
  const label = (y: number) => (y < 0 ? `${-y} TCN` : String(y));

  return (
    <div className="surface overflow-x-auto p-5 sm:p-6">
      <div className="min-w-[36rem]">
        <div className="relative" style={{ height: `${rowEnds.length * 3.25 + 0.5}rem` }}>
          {placed.map(({ polity, from, to, row }, i) => (
            <Link
              key={polity.id}
              href={`/polity/${polity.slug}`}
              title={`${polity.name} (${polity.started?.label} – ${polity.ended?.label ?? "?"})`}
              className={cn(
                "absolute flex h-11 items-center overflow-hidden rounded-xl bg-gradient-to-r px-3.5 text-sm font-semibold text-white no-underline shadow-sm transition-transform hover:-translate-y-0.5 hover:no-underline",
                tones[i % tones.length],
              )}
              style={{
                left: `${pct(from)}%`,
                width: `max(${pct(to) - pct(from)}%, 5.5rem)`,
                top: `${row * 3.25}rem`,
              }}
            >
              <span className="truncate">{polity.name}</span>
            </Link>
          ))}
        </div>
        <div className="border-border text-muted-foreground relative mt-3 flex justify-between border-t pt-2 text-xs">
          {ticks.map((t) => (
            <span key={t}>{label(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
