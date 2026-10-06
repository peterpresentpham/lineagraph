import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Section";
import { TimelineList } from "@/components/TimelineList";
import { apiGet } from "@/lib/api";
import { searchKindLabels } from "@/lib/labels";
import type { SearchResult, TimelineEntry } from "@/lib/types";

type Related = {
  year: number | null;
  entries: TimelineEntry[];
  similar: { kind: SearchResult["kind"]; slug: string; name: string }[];
};

export const metadata: Metadata = {
  title: "Tìm kiếm",
  // Result pages depend on the query string; they should not be listed as pages of their own.
  robots: { index: false },
  description:
    "Tìm nhân vật, chính thể hoặc sự kiện trong lịch sử thế giới theo tên, không cần gõ dấu.",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  let results: SearchResult[] = [];
  let related: Related = { year: null, entries: [], similar: [] };
  let failed = false;
  if (q.trim()) {
    try {
      results = await apiGet<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`, { fresh: true });
      // A typed year lists what happened then; an empty result offers near matches instead.
      related = await apiGet<Related>(
        `/search/related?q=${encodeURIComponent(q)}${results.length === 0 ? "&similar=1" : ""}`,
        { fresh: true },
      );
    } catch {
      failed = true;
    }
  }
  const yearLabel =
    related.year === null ? "" : related.year < 0 ? `${-related.year} TCN` : `${related.year}`;

  return (
    <>
      <PageHeader
        eyebrow="Tìm kiếm"
        title={q ? `Kết quả cho "${q}"` : "Tìm kiếm"}
        description="Tìm theo mọi tên của nhân vật, chính thể hoặc sự kiện, không cần gõ dấu."
      />
      <div className="mt-8 flex flex-col gap-3">
        {!q.trim() ? (
          <Empty>Nhập từ khoá vào ô tìm kiếm phía trên.</Empty>
        ) : failed ? (
          <Empty>Không tìm kiếm được lúc này, bạn thử lại sau ít giây.</Empty>
        ) : results.length === 0 && related.entries.length === 0 ? (
          <>
            <Empty>Không tìm thấy kết quả nào cho “{q}”.</Empty>
            {related.similar.length > 0 && (
              <section aria-labelledby="similar-title" className="mt-4">
                <h2 id="similar-title" className="mb-3 text-lg">
                  Có phải bạn muốn tìm
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {related.similar.map((r) => (
                    <li key={`${r.kind}-${r.slug}`}>
                      <Link
                        href={`/${r.kind}/${r.slug}`}
                        className="bg-card hover:text-foreground inline-flex min-h-9 items-center rounded-full border px-4 text-sm"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="text-muted-foreground mt-4 text-sm">
              Mẹo: gõ tên đầy đủ hoặc một phần tên, hoặc một năm như “1428” để xem những gì xảy ra
              năm đó.
            </p>
          </>
        ) : (
          <>
            {related.entries.length > 0 && (
              <section aria-labelledby="year-title" className="mb-4">
                <h2 id="year-title" className="mb-4 text-lg">
                  Năm {yearLabel}
                </h2>
                <TimelineList entries={related.entries} />
              </section>
            )}
            {results.map((r) => (
              <Link
                key={`${r.kind}-${r.slug}`}
                href={`/${r.kind}/${r.slug}`}
                className="surface-interactive flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="text-foreground font-semibold">{r.name}</div>
                  {r.matched !== r.name && (
                    <div className="text-muted-foreground text-sm">Còn gọi là: {r.matched}</div>
                  )}
                </div>
                <Badge
                  variant={
                    r.kind === "person" ? "info" : r.kind === "polity" ? "success" : "warning"
                  }
                >
                  {searchKindLabels[r.kind]}
                </Badge>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}
