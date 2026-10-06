import { apiGet } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/ogImage";
import type { EventDetail } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Sự kiện trên Sử Phả";

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const event = await apiGet<EventDetail>(`/events/${(await params).slug}`);
  const when = event.start ? `${event.start.label}${event.end ? ` – ${event.end.label}` : ""}` : "";
  return renderOgImage({
    title: event.name,
    kind: "Sự kiện",
    subtitle: [event.eventTypeLabel, when, event.place?.name].filter(Boolean).join(" · "),
  });
}
