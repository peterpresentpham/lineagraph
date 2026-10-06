import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { getLabels } from "@/lib/api";
import { searchKindLabels } from "@/lib/labels";
import type { TimelineEntry } from "@/lib/types";

type Props = { entries: TimelineEntry[] };

// Dated entries (people, polities, events) as a vertical list, shared by the timeline and the
// "year" results of the search page.
export async function TimelineList({ entries }: Props) {
  const [polityLabels, eventLabels] = await Promise.all([
    getLabels("polity_type"),
    getLabels("event_type"),
  ]);
  const detailLabel = (e: TimelineEntry) =>
    e.kind === "polity"
      ? (polityLabels[e.detail ?? ""] ?? searchKindLabels.polity)
      : e.kind === "event"
        ? (eventLabels[e.detail ?? ""] ?? searchKindLabels.event)
        : searchKindLabels.person;

  return (
    <ul className="border-border ml-1 flex flex-col gap-3 border-l-2 pl-5">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.slug}`}>
          <Link
            href={`/${e.kind}/${e.slug}`}
            className="surface-interactive flex items-center justify-between gap-3 p-3.5"
          >
            <span>
              <span className="text-foreground font-semibold">{e.name}</span>
              <span className="text-muted-foreground ml-3 text-sm">
                {e.start?.label}
                {e.end ? ` – ${e.end.label}` : e.kind === "event" ? "" : " – ?"}
              </span>
            </span>
            <Badge
              variant={e.kind === "polity" ? "success" : e.kind === "event" ? "warning" : "info"}
            >
              {detailLabel(e)}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
