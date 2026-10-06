import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { CitationList } from "@/components/CitationList";
import { EventCard } from "@/components/EventCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbData, isoDate } from "@/lib/structuredData";
import { PageHeader } from "@/components/PageHeader";
import { CiteButton } from "@/components/CiteButton";
import { ReportLink } from "@/components/ReportLink";
import { Section } from "@/components/Section";
import { SITE_URL } from "@/lib/site";
import { apiGet } from "@/lib/api";
import { recordOpenGraph } from "@/lib/seo";
import type { Citation, EventDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await apiGet<EventDetail>(`/events/${(await params).slug}`);
  const description =
    event.summary ?? `${event.name} (${event.eventTypeLabel}) trong lịch sử thế giới.`;
  return {
    title: event.name,
    description,
    alternates: { canonical: `/event/${event.slug}` },
    openGraph: {
      ...recordOpenGraph({ title: event.name, description, path: `/event/${event.slug}` }),
      type: "website",
    },
    twitter: { title: event.name, description },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await apiGet<EventDetail>(`/events/${slug}`);
  const citations = await apiGet<Citation[]>(`/citations?subjectTable=event&subjectId=${event.id}`);

  // The sides of a war or treaty, in order; participants without a side come last.
  const sides = new Map<number | null, EventDetail["participants"]>();
  for (const p of event.participants) sides.set(p.side, [...(sides.get(p.side) ?? []), p]);
  const orderedSides = [...sides.entries()].sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity));
  const hasSides = orderedSides.some(([side]) => side !== null);

  const when =
    event.start || event.end
      ? `${event.start?.label ?? "?"}${event.end ? ` – ${event.end.label}` : ""}`
      : "Chưa rõ thời gian";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.name,
          description: event.summary ?? undefined,
          startDate: isoDate(event.start) ?? undefined,
          endDate: isoDate(event.end) ?? undefined,
          location: event.place ? { "@type": "Place", name: event.place.name } : undefined,
        }}
      />
      <JsonLd
        data={breadcrumbData(SITE_URL, [
          { name: "Sự kiện", path: "/events" },
          { name: event.name, path: `/event/${event.slug}` },
        ])}
      />
      <PageHeader
        hero
        eyebrow={event.eventTypeLabel}
        title={event.name}
        description={[when, event.place?.name].filter(Boolean).join(" · ")}
        meta={
          event.parent ? (
            <Badge variant="neutral">
              Thuộc <Link href={`/event/${event.parent.slug}`}>{event.parent.name}</Link>
            </Badge>
          ) : undefined
        }
      />

      {event.summary && (
        <Section title="Giới thiệu">
          <p className="max-w-prose-page whitespace-pre-line text-lg leading-relaxed">
            {event.summary}
          </p>
        </Section>
      )}

      {event.outcome && (
        <Section title="Kết quả">
          <p className="max-w-prose-page leading-relaxed">{event.outcome}</p>
        </Section>
      )}

      {event.participants.length > 0 && (
        <Section title={hasSides ? "Các phe tham gia" : "Người tham gia"}>
          <div
            className={
              hasSides && orderedSides.length > 1 ? "grid gap-5 sm:grid-cols-2" : "grid gap-5"
            }
          >
            {orderedSides.map(([side, list]) => (
              <div key={side ?? "none"}>
                {hasSides && (
                  <h3 className="eyebrow !text-muted-foreground mb-3">
                    {side === null ? "Khác" : `Phe ${side}`}
                  </h3>
                )}
                <ul className="flex flex-col gap-2">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/${p.node.kind}/${p.node.slug}`}
                        className="surface-interactive flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="text-foreground font-semibold">{p.node.name}</span>
                        <Badge variant="info">{p.roleLabel}</Badge>
                      </Link>
                      {p.note && (
                        <p className="text-muted-foreground mt-1 px-1 text-sm">{p.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {event.body && (
        <Section title="Diễn biến">
          <p className="max-w-prose-page whitespace-pre-line leading-relaxed">{event.body}</p>
        </Section>
      )}

      {event.children.length > 0 && (
        <Section title="Các sự kiện nhỏ hơn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {event.children.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </Section>
      )}

      {citations.length > 0 && (
        <Section title="Nguồn tư liệu">
          <CitationList citations={citations} />
        </Section>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 print:hidden">
        <CiteButton title={event.name} url={`${SITE_URL}/event/${event.slug}`} />
        <ReportLink path={`/event/${event.slug}`} />
      </div>
    </>
  );
}
