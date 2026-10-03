import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@lineagraph/ui";
import { NodePicker } from "@/components/NodePicker";
import { RelationList } from "@/components/RelationList";
import { Empty, Section } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { RelationResult } from "@/lib/types";

export const metadata: Metadata = { title: "Tìm mối quan hệ" };

type Props = { searchParams: Promise<{ a?: string; b?: string; disputed?: string }> };

export default async function RelationsPage({ searchParams }: Props) {
  const { a, b, disputed } = await searchParams;
  const includeDisputed = disputed === "1";
  const result = a && b && a !== b ? await apiGet<RelationResult>(`/relations?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}${includeDisputed ? "&includeDisputed=1" : ""}`) : null;
  const pre = async (slug?: string) => {
    if (!slug) return undefined;
    if (result) return { slug, name: slug === result.a.slug ? result.a.name : result.b.name };
    try {
      const p = await apiGet<{ name: string }>(`/persons/${slug}`);
      return { slug, name: p.name };
    } catch { return undefined; }
  };
  const [initA, initB] = await Promise.all([pre(a), pre(b)]);

  return (
    <>
      <h1>Tìm mối quan hệ</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Chọn hai nhân vật hoặc chính thể để xem họ có quan hệ gì, trực tiếp hay qua những ai.
      </p>
      <form id="finder" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <NodePicker key={`a-${initA?.slug}`} name="a" label="Người thứ nhất" initial={initA} />
        <NodePicker key={`b-${initB?.slug}`} name="b" label="Người thứ hai" initial={initB} />
        <Button type="submit" className="h-11">Tìm</Button>
      </form>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" form="finder" name="disputed" value="1" defaultChecked={includeDisputed} />
        Bao gồm cả quan hệ còn tranh cãi
      </label>

      {result && (
        <>
          {result.kinship && (
            <div className="mt-8 rounded-md border border-primary bg-accent p-5">
              <div className="text-xs tracking-wide text-muted-foreground uppercase">Quan hệ họ hàng</div>
              <p className="mt-1 font-serif text-2xl">{result.kinship.sentence}</p>
              <p className="mt-1 text-muted-foreground">
                {result.a.name} là <b>{result.kinship.aIs}</b>, {result.b.name} là <b>{result.kinship.bIs}</b>
                {result.kinship.ancestor && <> · Tổ chung: <Link href={`/person/${result.kinship.ancestor.slug}`}>{result.kinship.ancestor.name}</Link></>}
              </p>
              {result.kinship.note && <p className="mt-1 text-sm text-muted-foreground">{result.kinship.note}</p>}
            </div>
          )}

          {result.direct.length > 0 && (
            <Section title="Quan hệ trực tiếp">
              <RelationList relations={result.direct} />
            </Section>
          )}

          <Section title="Các chuỗi quan hệ">
            {result.paths.length === 0 ? (
              <Empty>Chưa tìm thấy mối liên hệ nào giữa {result.a.name} và {result.b.name} trong dữ liệu hiện có.</Empty>
            ) : (
              <ol className="flex flex-col gap-4">
                {result.paths.map((p, i) => (
                  <li key={i} className="rounded-md border bg-card p-4">
                    <div className="mb-2 text-xs text-muted-foreground">Chuỗi {i + 1} · {p.steps.length} bước</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                      <Link href={`/${p.steps[0]!.from.kind}/${p.steps[0]!.from.slug}`} className="font-semibold">{p.steps[0]!.from.name}</Link>
                      {p.steps.map((s, j) => (
                        <span key={j} className="flex items-center gap-2">
                          <span className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {s.typeLabel}{s.details.length > 0 ? ` (${s.details.join(", ")})` : ""}
                          </span>
                          <Link href={`/${s.to.kind}/${s.to.slug}`} className="font-semibold">{s.to.name}</Link>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </>
      )}
    </>
  );
}
