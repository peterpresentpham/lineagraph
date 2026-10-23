import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { CitationList } from "@/components/CitationList";
import { EventCard } from "@/components/EventCard";
import { FamilySection } from "@/components/FamilySection";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbData, isoDate } from "@/lib/structuredData";
import { LifeTimeline, type TimelineItem } from "@/components/LifeTimeline";
import { Monogram } from "@/components/Monogram";
import { PageHeader } from "@/components/PageHeader";
import { CiteButton } from "@/components/CiteButton";
import { ReportLink } from "@/components/ReportLink";
import { EntityEgoGraph } from "@/components/EntityEgoGraph";
import { PersonCard } from "@/components/PersonCard";
import { ReadNext } from "@/components/ReadNext";
import { RelationCompare } from "@/components/RelationCompare";
import { Attributes, RelationList } from "@/components/RelationList";
import { Empty, Section } from "@/components/Section";
import { SITE_URL } from "@/lib/site";
import { apiGet, getLabels } from "@/lib/api";
import { recordOpenGraph } from "@/lib/seo";
import { dateKey, historicityLabels, lifeSpan, sexLabels } from "@/lib/labels";
import type { Citation, EventSummary, PersonDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await apiGet<PersonDetail>(`/persons/${(await params).slug}`);
  const description = person.summary ?? `${person.name} trong phả hệ lịch sử thế giới.`;
  return {
    title: person.name,
    description,
    alternates: { canonical: `/person/${person.slug}` },
    openGraph: {
      ...recordOpenGraph({ title: person.name, description, path: `/person/${person.slug}` }),
      type: "profile",
    },
    twitter: { title: person.name, description },
  };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = await apiGet<PersonDetail>(`/persons/${slug}`);
  const [citations, events, nameKinds, offices] = await Promise.all([
    apiGet<Citation[]>(`/citations?subjectTable=person&subjectId=${person.id}`),
    apiGet<{ items: EventSummary[] }>(`/events?node=${person.id}&limit=50`),
    getLabels("name_kind"),
    getLabels("office_type"),
  ]);
  const otherNames = person.names.filter((n) => !n.isPrimary);

  // The life in order: birth, offices and events that have a date, death. Undated ones stay in
  // their own sections below.
  const life: TimelineItem[] = [
    ...(person.birth
      ? [{ date: person.birth, title: "Sinh", detail: person.birthPlace?.name }]
      : []),
    ...person.tenures
      .filter((t) => t.start && t.state === "accepted")
      .map((t): TimelineItem => ({
        date: t.start,
        title: offices[t.officeType] ?? t.officeType,
        detail: [t.polity?.name, t.end ? `đến ${t.end.label}` : null].filter(Boolean).join(" · "),
        href: t.polity?.slug ? `/polity/${t.polity.slug}` : undefined,
      })),
    ...events.items
      .filter((e) => e.start)
      .map((e): TimelineItem => ({
        date: e.start,
        title: e.name,
        detail: [e.eventTypeLabel, e.place?.name].filter(Boolean).join(" · "),
        href: `/event/${e.slug}`,
      })),
    ...(person.death
      ? [{ date: person.death, title: "Mất", detail: person.deathPlace?.name }]
      : []),
  ].sort((a, b) => (dateKey(a.date) ?? 0) - (dateKey(b.date) ?? 0));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: person.name,
          alternateName: otherNames.map((n) => n.name),
          description: person.summary ?? undefined,
          gender: person.sex === "male" ? "Male" : person.sex === "female" ? "Female" : undefined,
          birthDate: isoDate(person.birth) ?? undefined,
          deathDate: isoDate(person.death) ?? undefined,
        }}
      />
      <JsonLd
        data={breadcrumbData(SITE_URL, [
          { name: "Nhân vật", path: "/persons" },
          { name: person.name, path: `/person/${person.slug}` },
        ])}
      />
      <PageHeader
        hero
        eyebrow="Nhân vật"
        title={person.name}
        leading={
          <Monogram name={person.name} seed={person.slug} size="lg" className="hidden sm:grid" />
        }
        description={[
          lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất",
          person.birthPlace && `sinh tại ${person.birthPlace.name}`,
          person.deathPlace && `mất tại ${person.deathPlace.name}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        meta={
          <>
            <Badge variant="neutral">{sexLabels[person.sex]}</Badge>
            <Badge variant={person.historicity === "historical" ? "success" : "warning"}>
              {historicityLabels[person.historicity]}
            </Badge>
          </>
        }
      />

      {otherNames.length > 0 && (
        <Section title="Các tên khác">
          <ul className="flex flex-wrap gap-2">
            {otherNames.map((n, i) => (
              <li key={i} className="bg-card rounded-full border px-3.5 py-1 text-sm">
                {n.name}{" "}
                <span className="text-muted-foreground">· {nameKinds[n.kind] ?? n.kind}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {person.summary && (
        <Section title="Giới thiệu">
          <p className="max-w-prose-page whitespace-pre-line text-lg leading-relaxed">
            {person.summary}
          </p>
        </Section>
      )}

      {life.length >= 2 && (
        <Section title="Dòng đời">
          <LifeTimeline items={life} />
        </Section>
      )}

      {person.relations.some((r) => ["child_of", "spouse_of", "parent_of"].includes(r.type)) && (
        <Section title="Gia đình">
          <FamilySection relations={person.relations} />
        </Section>
      )}

      {person.attributes.length > 0 && (
        <Section title="Thông tin">
          <Attributes items={person.attributes} />
        </Section>
      )}

      {person.body && (
        <Section title="Tiểu sử">
          <p className="max-w-prose-page whitespace-pre-line leading-relaxed">{person.body}</p>
        </Section>
      )}

      {person.tenures.length > 0 && (
        <Section title="Chức vụ">
          <div className="flex flex-col gap-2">
            {person.tenures.map((t) => (
              <div
                key={t.id}
                className="surface flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div>
                  <span className="font-semibold">{offices[t.officeType] ?? t.officeType}</span>
                  {t.polity?.slug && (
                    <>
                      {" · "}
                      <Link href={`/polity/${t.polity.slug}`}>{t.polity.name}</Link>
                    </>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  {t.state === "alternative" && <Badge variant="neutral">Phiên bản khác</Badge>}
                  {t.disputed && <Badge variant="warning">Còn tranh cãi</Badge>}
                  {t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {events.items.length > 0 && (
        <Section title="Sự kiện tham gia">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Sơ đồ quan hệ">
        <EntityEgoGraph slug={person.slug} />
      </Section>

      <Section title="Quan hệ">
        {person.relations.length === 0 ? (
          <Empty>Chưa có quan hệ nào được ghi.</Empty>
        ) : (
          <RelationList relations={person.relations} />
        )}
        <div className="mt-5 border-t pt-5">
          <RelationCompare subjectSlug={person.slug} />
        </div>
      </Section>

      {person.siblings.length > 0 && (
        <Section title="Anh chị em">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {person.siblings.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        </Section>
      )}

      {citations.length > 0 && (
        <Section title="Nguồn tư liệu">
          <CitationList citations={citations} />
        </Section>
      )}

      <ReadNext
        slug={person.slug}
        kind="person"
        relations={person.relations}
        start={person.birth}
      />

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 print:hidden">
        <CiteButton title={person.name} url={`${SITE_URL}/person/${person.slug}`} />
        <ReportLink path={`/person/${person.slug}`} />
      </div>
    </>
  );
}
