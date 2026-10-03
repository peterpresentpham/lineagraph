import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { historicityLabels, lifeSpan } from "@/lib/labels";
import type { PersonSummary } from "@/lib/types";

type Props = { person: PersonSummary; note?: string };

export function PersonCard({ person, note }: Props) {
  return (
    <Link
      href={`/person/${person.slug}`}
      className="bg-card block rounded-[var(--radius)] border p-4 no-underline transition-shadow hover:no-underline hover:shadow-md"
    >
      <div className="text-foreground font-semibold">{person.name}</div>
      <div className="text-muted-foreground mt-0.5 text-sm">
        {lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất"}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {note && <Badge variant="info">{note}</Badge>}
        {person.historicity !== "historical" && (
          <Badge variant="warning">{historicityLabels[person.historicity]}</Badge>
        )}
      </div>
    </Link>
  );
}
