import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { CitationList } from "@/components/CitationList";
import { EntityEgoGraph } from "@/components/EntityEgoGraph";
import { RelationCompare } from "@/components/RelationCompare";
import { Attributes, RelationList } from "@/components/RelationList";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbData, isoDate } from "@/lib/structuredData";
import { PageHeader } from "@/components/PageHeader";
import { CiteButton } from "@/components/CiteButton";
import { ReadNext } from "@/components/ReadNext";
import { ReportLink } from "@/components/ReportLink";
import { Empty, Section } from "@/components/Section";
import { SITE_URL } from "@/lib/site";
import { apiGet, getLabels } from "@/lib/api";
import { recordOpenGraph } from "@/lib/seo";
import type { Citation, EventSummary, PolityDetail } from "@/lib/types";
import { EventCard } from "@/components/EventCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const polity = await apiGet<PolityDetail>(`/polities/${(await params).slug}`);
  const description = polity.summary ?? `${polity.name} trong lịch sử thế giới.`;
  return {
    title: polity.name,
    description,
    alternates: { canonical: `/polity/${polity.slug}` },
    openGraph: {
      ...recordOpenGraph({ title: polity.name, description, path: `/polity/${polity.slug}` }),
      type: "website",
    },
    twitter: { title: polity.name, description },
  };
}

export default async function PolityPage({ params }: Props) {
  const { slug } = await params;
  const polity = await apiGet<PolityDetail>(`/polities/${slug}`);
  const [citations, events, typeLabels, offices, modes] = await Promise.all([
    apiGet<Citation[]>(`/citations?subjectTable=polity&subjectId=${polity.id}`),
    apiGet<{ items: EventSummary[] }>(`/events?node=${polity.id}&limit=50`),
    getLabels("polity_type"),
    getLabels("office_type"),
    getLabels("succession_mode"),
  ]);
  const otherNames = polity.names.filter((n) => !n.isPrimary);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: polity.name,
          alternateName: otherNames.map((n) => n.name),
          description: polity.summary ?? undefined,
          foundingDate: isoDate(polity.started) ?? undefined,
          dissolutionDate: isoDate(polity.ended) ?? undefined,
        }}
      />
      <JsonLd
        data={breadcrumbData(SITE_URL, [
          { name: "Chính thể", path: "/polities" },
          { name: polity.name, path: `/polity/${polity.slug}` },
        ])}
      />
      <PageHeader
        hero
        eyebrow="Chính thể"
        title={polity.name}
        description={
          polity.started || polity.ended
            ? `${polity.started?.label ?? "?"} – ${polity.ended?.label ?? "?"}`
            : "Chưa rõ thời gian"
        }
        meta={
          <>
            <Badge variant="neutral">{typeLabels[polity.polityType] ?? polity.polityType}</Badge>
            {otherNames.map((n, i) => (
              <Badge key={i} variant="outline">
                {n.name}
              </Badge>
            ))}
          </>
        }
      />

      {polity.summary && (
        <Section title="Giới thiệu">
          <p className="max-w-prose-page whitespace-pre-line text-lg leading-relaxed">
            {polity.summary}
          </p>
        </Section>
      )}

      {polity.attributes.length > 0 && (
        <Section title="Thông tin">
          <Attributes items={polity.attributes} />
        </Section>
      )}

      {polity.body && (
        <Section title="Lịch sử">
          <p className="max-w-prose-page whitespace-pre-line leading-relaxed">{polity.body}</p>
        </Section>
      )}

      <Section title="Cây quan hệ">
        <EntityEgoGraph slug={polity.slug} height={560} />
      </Section>

      <Section title="Quan hệ với các chính thể và nhân vật khác">
        {polity.relations.length > 0 && <RelationList relations={polity.relations} />}
        <div className={polity.relations.length > 0 ? "mt-5 border-t pt-5" : undefined}>
          <RelationCompare subjectSlug={polity.slug} />
        </div>
      </Section>

      <Section title="Những người giữ chức vụ">
        {polity.tenures.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <ol className="flex flex-col gap-2">
            {polity.tenures.map((t) => (
              <li
                key={t.id}
                className="surface flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div className="flex items-center gap-3">
                  {t.seq != null && (
                    <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-xl text-sm font-semibold">
                      {t.seq}
                    </span>
                  )}
                  <div>
                    <Link href={`/person/${t.person.slug}`} className="font-semibold">
                      {t.person.name}
                    </Link>
                    <div className="text-muted-foreground text-sm">
                      {offices[t.officeType] ?? t.officeType}
                      {t.successionMode && ` · ${modes[t.successionMode] ?? t.successionMode}`}
                      {t.eras.length > 0 && ` · Niên hiệu: ${t.eras.join(", ")}`}
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  {t.state === "alternative" && <Badge variant="neutral">Phiên bản khác</Badge>}
                  {t.disputed && <Badge variant="warning">Còn tranh cãi</Badge>}
                  {t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {events.items.length > 0 && (
        <Section title="Sự kiện liên quan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e) => (
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

      <ReadNext
        slug={polity.slug}
        kind="polity"
        relations={polity.relations}
        start={polity.started}
      />

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 print:hidden">
        <CiteButton title={polity.name} url={`${SITE_URL}/polity/${polity.slug}`} />
        <ReportLink path={`/polity/${polity.slug}`} />
      </div>
    </>
  );
}
