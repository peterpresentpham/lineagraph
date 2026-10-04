import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { GraphClient } from "@/components/GraphClient";
import { RelationCompare } from "@/components/RelationCompare";
import { Attributes, RelationList } from "@/components/RelationList";
import { Empty, Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { GraphView, PolityDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const polity = await apiGet<PolityDetail>(`/polities/${(await params).slug}`);
  const description = polity.summary ?? `${polity.name} trong lịch sử Việt Nam.`;
  return {
    title: polity.name,
    description,
    openGraph: { title: polity.name, description, type: "website" },
    twitter: { title: polity.name, description },
  };
}

export default async function PolityPage({ params }: Props) {
  const { slug } = await params;
  const polity = await apiGet<PolityDetail>(`/polities/${slug}`);
  const [graph, typeLabels, offices, modes] = await Promise.all([
    apiGet<GraphView>(`/polities/${slug}/graph`),
    getLabels("polity_type"),
    getLabels("office_type"),
    getLabels("succession_mode"),
  ]);
  const otherNames = polity.names.filter((n) => !n.isPrimary);

  return (
    <>
      <h1 className="text-3xl">{polity.name}</h1>
      <p className="text-muted-foreground mt-1">
        {polity.started || polity.ended
          ? `${polity.started?.label ?? "?"} – ${polity.ended?.label ?? "?"}`
          : "Chưa rõ thời gian"}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="neutral">{typeLabels[polity.polityType] ?? polity.polityType}</Badge>
        {otherNames.map((n, i) => (
          <Badge key={i} variant="outline">
            {n.name}
          </Badge>
        ))}
      </div>

      {polity.summary && (
        <Section title="Giới thiệu">
          <p className="whitespace-pre-line leading-relaxed">{polity.summary}</p>
        </Section>
      )}

      {polity.attributes.length > 0 && (
        <Section title="Thông tin">
          <Attributes items={polity.attributes} />
        </Section>
      )}

      {polity.body && (
        <Section title="Lịch sử">
          <p className="whitespace-pre-line leading-relaxed">{polity.body}</p>
        </Section>
      )}

      <Section title="Cây quan hệ">
        <GraphClient data={graph} />
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
                className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border p-4"
              >
                <div className="flex items-center gap-3">
                  {t.seq != null && (
                    <span className="bg-accent grid size-8 place-items-center rounded-md text-sm font-semibold">
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
                <div className="text-muted-foreground text-sm">
                  {t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
