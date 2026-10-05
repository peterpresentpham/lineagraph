import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { Monogram } from "@/components/Monogram";
import { historicityLabels, lifeSpan } from "@/lib/labels";
import type { PersonSummary } from "@/lib/types";

type Props = { person: PersonSummary; note?: string };

export function PersonCard({ person, note }: Props) {
  return (
    <Link
      href={`/person/${person.slug}`}
      className="surface-interactive flex items-center gap-3.5 p-4"
    >
      <Monogram name={person.name} seed={person.slug} />
      <div className="min-w-0">
        <div className="text-foreground truncate font-semibold">{person.name}</div>
        <div className="text-muted-foreground truncate text-sm">
          {lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất"}
        </div>
        {(note || person.historicity !== "historical") && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {note && <Badge variant="info">{note}</Badge>}
            {person.historicity !== "historical" && (
              <Badge variant="warning">{historicityLabels[person.historicity]}</Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
