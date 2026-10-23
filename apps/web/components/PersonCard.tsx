import Link from "next/link";
import { Badge, cn } from "@lineagraph/ui";
import { Monogram } from "@/components/Monogram";
import { toneFor } from "@/components/PolityCard";
import { centuryOf, historicityLabels, lifeSpan, toRoman } from "@/lib/labels";
import type { PersonSummary } from "@/lib/types";

type Props = {
  person: PersonSummary;
  note?: string;
  /** "feature" is the tall portrait card used on the home page; the default fits dense lists. */
  variant?: "compact" | "feature";
};

export function PersonCard({ person, note, variant = "compact" }: Props) {
  const span = lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất";
  const badges = (note || person.historicity !== "historical") && (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {note && <Badge variant="info">{note}</Badge>}
      {person.historicity !== "historical" && (
        <Badge variant="warning">{historicityLabels[person.historicity]}</Badge>
      )}
    </div>
  );

  if (variant === "feature") {
    // The century tells a visitor more at a glance than an initial; the initial is the fallback.
    const century = person.birth ? centuryOf(person.birth.year) : null;
    const initial =
      century !== null
        ? toRoman(century)
        : (person.name.trim().split(/\s+/).at(-1)?.charAt(0).toLocaleUpperCase("vi") ?? "?");
    return (
      <Link
        href={`/person/${person.slug}`}
        className={cn(
          "surface-interactive group flex flex-col overflow-hidden",
          toneFor(person.slug),
        )}
      >
        <div className="tone-panel relative grid h-28 place-items-center overflow-hidden">
          <span
            aria-hidden
            className="text-tone select-none font-serif text-6xl font-semibold opacity-90 transition-transform duration-500 group-hover:scale-110"
          >
            {initial}
          </span>
          {century !== null && (
            <span className="text-muted-foreground absolute bottom-2 left-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
              Thế kỷ{century < 0 ? " (TCN)" : ""}
            </span>
          )}
          <div className="bg-dots absolute inset-0 opacity-40" aria-hidden />
        </div>
        <div className="p-4">
          <div className="text-foreground font-serif text-lg font-semibold leading-snug">
            {person.name}
          </div>
          <div className="text-muted-foreground mt-0.5 text-sm">{span}</div>
          {badges}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/person/${person.slug}`}
      className="surface-interactive flex items-center gap-3.5 p-4"
    >
      <Monogram name={person.name} seed={person.slug} />
      <div className="min-w-0">
        <div className="text-foreground truncate font-semibold">{person.name}</div>
        <div className="text-muted-foreground truncate text-sm">{span}</div>
        {badges}
      </div>
    </Link>
  );
}
