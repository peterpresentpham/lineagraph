import Link from "next/link";
import { Swords } from "lucide-react";
import { Badge } from "@lineagraph/ui";
import type { EventSummary } from "@/lib/types";

type Props = { event: EventSummary };

export function EventCard({ event }: Props) {
  const when =
    event.start || event.end
      ? `${event.start?.label ?? "?"}${event.end ? ` – ${event.end.label}` : ""}`
      : "Chưa rõ thời gian";
  return (
    <Link href={`/event/${event.slug}`} className="surface-interactive group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-xl">
          <Swords className="size-5" />
        </span>
        <Badge variant="neutral">{event.eventTypeLabel}</Badge>
      </div>
      <div className="text-foreground mt-4 font-serif text-xl font-semibold">{event.name}</div>
      <div className="text-muted-foreground mt-0.5 text-sm">
        {when}
        {event.place ? ` · ${event.place.name}` : ""}
      </div>
    </Link>
  );
}
