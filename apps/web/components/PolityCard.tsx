import Link from "next/link";
import { Landmark } from "lucide-react";
import { Badge, cn } from "@lineagraph/ui";
import type { PolitySummary } from "@/lib/types";

type Props = { polity: PolitySummary; typeLabel: string };

const tones = ["tone-brand", "tone-indigo", "tone-gold"] as const;

// A deterministic tone per slug, so a polity keeps its colour wherever it is listed.
export function toneFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length]!;
}

/** "361 năm" between two years, or null when either end is unknown. */
export function spanLabel(from?: number | null, to?: number | null) {
  if (from == null || to == null) return null;
  const years = to - from;
  return years > 0 ? `${years} năm` : null;
}

export function PolityCard({ polity, typeLabel }: Props) {
  const span = spanLabel(polity.started?.year, polity.ended?.year);
  return (
    <Link
      href={`/polity/${polity.slug}`}
      className={cn(
        "surface-interactive tone-panel group relative flex min-h-48 flex-col overflow-hidden p-6",
        toneFor(polity.slug),
      )}
    >
      <Landmark
        aria-hidden
        className="text-tone absolute -bottom-6 -right-5 size-36 opacity-[0.09] transition-all duration-500 group-hover:scale-110 group-hover:opacity-[0.16]"
      />
      <Badge variant="neutral" className="self-start">
        {typeLabel}
      </Badge>
      <h3 className="text-foreground mt-5 font-serif text-2xl font-semibold leading-tight">
        {polity.name}
      </h3>
      <div className="mt-auto flex items-baseline gap-2 pt-6">
        <span className="text-tone font-serif text-lg font-semibold">
          {polity.started || polity.ended
            ? `${polity.started?.label ?? "?"} – ${polity.ended?.label ?? "?"}`
            : "Chưa rõ thời gian"}
        </span>
        {span && <span className="text-muted-foreground text-sm">· {span}</span>}
      </div>
    </Link>
  );
}
