import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { historicityLabels, lifeSpan } from "@/lib/labels";
import type { PersonSummary } from "@/lib/types";

export function PersonCard({ person, note }: { person: PersonSummary; note?: string }) {
  return (
    <Link
      href={`/person/${person.slug}`}
      className="block rounded-[var(--radius)] border bg-card p-4 no-underline transition-shadow hover:no-underline hover:shadow-md"
    >
      <div className="font-semibold text-foreground">{person.name}</div>
      <div className="mt-0.5 text-sm text-muted-foreground">{lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất"}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {note && <Badge variant="info">{note}</Badge>}
        {person.historicity !== "historical" && <Badge variant="warning">{historicityLabels[person.historicity]}</Badge>}
      </div>
    </Link>
  );
}
