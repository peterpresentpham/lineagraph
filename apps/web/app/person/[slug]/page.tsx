import type { Metadata } from "next";
import Link from "next/link";
import { GitCompare, Network } from "lucide-react";
import { Badge, Button } from "@lineagraph/ui";
import { PersonCard } from "@/components/PersonCard";
import { Attributes, RelationList } from "@/components/RelationList";
import { Empty, Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import { historicityLabels, lifeSpan, sexLabels } from "@/lib/labels";
import type { Citation, PersonDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await apiGet<PersonDetail>(`/persons/${(await params).slug}`);
  return { title: person.name, description: person.summary ?? undefined };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = await apiGet<PersonDetail>(`/persons/${slug}`);
  const [citations, nameKinds, offices] = await Promise.all([
    apiGet<Citation[]>(`/citations?subjectTable=person&subjectId=${person.id}`),
    getLabels("name_kind"),
    getLabels("office_type"),
  ]);
  const otherNames = person.names.filter((n) => !n.isPrimary);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">{person.name}</h1>
          <p className="mt-1 text-muted-foreground">{lifeSpan(person.birth, person.death) || "Chưa rõ năm sinh – mất"}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="neutral">{sexLabels[person.sex]}</Badge>
            <Badge variant={person.historicity === "historical" ? "success" : "warning"}>{historicityLabels[person.historicity]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/relations?a=${person.slug}`}>
            <Button variant="secondary"><GitCompare /> Tìm quan hệ</Button>
          </Link>
          <Link href={`/graph?node=${person.slug}`}>
            <Button variant="secondary"><Network /> Sơ đồ quan hệ</Button>
          </Link>
        </div>
      </div>

      {otherNames.length > 0 && (
        <Section title="Các tên khác">
          <ul className="flex flex-wrap gap-2">
            {otherNames.map((n, i) => (
              <li key={i} className="rounded-md border bg-card px-3 py-1 text-sm">
                {n.name} <span className="text-muted-foreground">· {nameKinds[n.kind] ?? n.kind}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {person.summary && (
        <Section title="Giới thiệu">
          <p className="whitespace-pre-line leading-relaxed">{person.summary}</p>
        </Section>
      )}

      {person.attributes.length > 0 && (
        <Section title="Thông tin">
          <Attributes items={person.attributes} />
        </Section>
      )}

      {person.body && (
        <Section title="Tiểu sử">
          <p className="whitespace-pre-line leading-relaxed">{person.body}</p>
        </Section>
      )}

      {person.tenures.length > 0 && (
        <Section title="Chức vụ">
          <div className="flex flex-col gap-2">
            {person.tenures.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border bg-card p-4">
                <div>
                  <span className="font-semibold">{offices[t.officeType] ?? t.officeType}</span>
                  {t.polity?.slug && (
                    <>
                      {" · "}
                      <Link href={`/polity/${t.polity.slug}`}>{t.polity.name}</Link>
                    </>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Quan hệ">
        {person.relations.length === 0 ? <Empty>Chưa có quan hệ nào được ghi.</Empty> : <RelationList relations={person.relations} />}
      </Section>

      {person.siblings.length > 0 && (
        <Section title="Anh chị em">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {person.siblings.map((p) => <PersonCard key={p.id} person={p} />)}
          </div>
        </Section>
      )}

      {citations.length > 0 && (
        <Section title="Nguồn tư liệu">
          <ul className="flex flex-col gap-2">
            {citations.map((c) => (
              <li key={c.id} className="rounded-[var(--radius)] border bg-card p-4 text-sm">
                <div className="font-medium">
                  {c.source.url ? <a href={c.source.url} target="_blank" rel="noreferrer">{c.source.title}</a> : c.source.title}
                  {c.source.author && <span className="font-normal text-muted-foreground"> — {c.source.author}</span>}
                </div>
                {c.locator && <div className="text-muted-foreground">{c.locator}</div>}
                {c.quote && <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground">{c.quote}</blockquote>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
