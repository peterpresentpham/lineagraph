import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { NodePicker } from "@/components/NodePicker";
import { RelationList } from "@/components/RelationList";
import { Empty, Section } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { RelationResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tìm mối quan hệ",
  description:
    "Tìm mối quan hệ họ hàng giữa hai nhân vật lịch sử thế giới, trực tiếp hoặc qua tổ tiên chung.",
};

type Props = { searchParams: Promise<{ a?: string; b?: string; disputed?: string }> };

export default async function RelationsPage({ searchParams }: Props) {
  const { a, b, disputed } = await searchParams;
  const includeDisputed = disputed === "1";
  const result =
    a && b && a !== b
      ? await apiGet<RelationResult>(
          `/relations?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}${includeDisputed ? "&includeDisputed=1" : ""}`,
        )
      : null;
  const pre = async (slug?: string) => {
    if (!slug) return undefined;
    if (result) return { slug, name: slug === result.a.slug ? result.a.name : result.b.name };
    try {
      const p = await apiGet<{ name: string }>(`/persons/${slug}`);
      return { slug, name: p.name };
    } catch {
      return undefined;
    }
  };
  const [initA, initB] = await Promise.all([pre(a), pre(b)]);

  return (
    <>
      <PageHeader
        eyebrow="Khám phá"
        title="Tìm mối quan hệ"
        description="Chọn hai nhân vật hoặc chính thể để xem họ có quan hệ gì, trực tiếp hay qua những ai."
      />
      <form id="finder" className="surface mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <NodePicker key={`a-${initA?.slug}`} name="a" label="Người thứ nhất" initial={initA} />
        <NodePicker key={`b-${initB?.slug}`} name="b" label="Người thứ hai" initial={initB} />
        <Button type="submit" size="lg">
          Tìm
        </Button>
      </form>
      <label className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          form="finder"
          name="disputed"
          value="1"
          defaultChecked={includeDisputed}
        />
        Bao gồm cả quan hệ còn tranh cãi
      </label>

      {result && (
        <>
          {result.kinship && (
            <div className="border-primary bg-accent mt-8 rounded-md border p-5">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">
                Quan hệ họ hàng
              </div>
              <p className="mt-1 font-serif text-2xl">{result.kinship.sentence}</p>
              <p className="text-muted-foreground mt-1">
                {result.a.name} là <b>{result.kinship.aIs}</b>, {result.b.name} là{" "}
                <b>{result.kinship.bIs}</b>
                {result.kinship.ancestor && (
                  <>
                    {" "}
                    · Tổ chung:{" "}
                    <Link href={`/person/${result.kinship.ancestor.slug}`}>
                      {result.kinship.ancestor.name}
                    </Link>
                  </>
                )}
              </p>
              {result.kinship.note && (
                <p className="text-muted-foreground mt-1 text-sm">{result.kinship.note}</p>
              )}
            </div>
          )}

          {result.direct.length > 0 && (
            <Section title="Quan hệ trực tiếp">
              <RelationList relations={result.direct} />
            </Section>
          )}

          <Section title="Các chuỗi quan hệ">
            {result.paths.length === 0 ? (
              <Empty>
                Chưa tìm thấy mối liên hệ nào giữa {result.a.name} và {result.b.name} trong dữ liệu
                hiện có.
              </Empty>
            ) : (
              <ol className="flex flex-col gap-4">
                {result.paths.map((p, i) => (
                  <li key={i} className="bg-card rounded-md border p-4">
                    <div className="text-muted-foreground mb-2 text-xs">
                      Chuỗi {i + 1} · {p.steps.length} bước
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                      <Link
                        href={`/${p.steps[0]!.from.kind}/${p.steps[0]!.from.slug}`}
                        className="font-semibold"
                      >
                        {p.steps[0]!.from.name}
                      </Link>
                      {p.steps.map((s, j) => (
                        <span key={j} className="flex items-center gap-2">
                          <span className="bg-muted text-muted-foreground rounded-sm px-2 py-0.5 text-xs">
                            {s.typeLabel}
                            {s.details.length > 0 ? ` (${s.details.join(", ")})` : ""}
                          </span>
                          <Link href={`/${s.to.kind}/${s.to.slug}`} className="font-semibold">
                            {s.to.name}
                          </Link>
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
