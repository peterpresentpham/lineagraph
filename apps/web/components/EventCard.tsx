import Link from "next/link";
import { Swords } from "lucide-react";
import { Badge, cn } from "@lineagraph/ui";
import { toneFor } from "@/components/PolityCard";
import type { EventSummary } from "@/lib/types";

type Props = { event: EventSummary };

export function EventCard({ event }: Props) {
  const when =
    event.start || event.end
      ? `${event.start?.label ?? "?"}${event.end ? ` – ${event.end.label}` : ""}`
      : "Chưa rõ thời gian";
  return (
    <Link
      href={`/event/${event.slug}`}
      className={cn(
        "surface-interactive group relative flex min-h-44 flex-col overflow-hidden p-6",
        toneFor(event.slug),
      )}
    >
      <Swords
        aria-hidden
        className="text-tone absolute -bottom-5 -right-4 size-32 opacity-[0.08] transition-all duration-500 group-hover:rotate-6 group-hover:opacity-[0.15]"
      />
      <div className="text-tone font-serif text-3xl font-semibold leading-none">{when}</div>
      <h3 className="text-foreground mt-4 font-serif text-xl font-semibold leading-snug">
        {event.name}
      </h3>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Badge variant="neutral">{event.eventTypeLabel}</Badge>
        {event.place && <span className="text-muted-foreground text-sm">{event.place.name}</span>}
      </div>
    </Link>
  );
}
