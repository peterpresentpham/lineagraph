import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Section";
import { TimelineList } from "@/components/TimelineList";
import { apiGet } from "@/lib/api";
import { centuryLabel } from "@/lib/labels";
import type { TimelineEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dòng thời gian",
  description:
    "Chính thể, nhân vật và sự kiện lịch sử thế giới theo thứ tự thời gian, chọn từng thế kỷ để xem.",
  alternates: { canonical: "/timeline" },
};

// Reads the API, which is not running while the site is built, so render per request (the fetches
// inside are still cached for a minute, see lib/api.ts).
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ c?: string }> };

export default async function TimelinePage({ searchParams }: Props) {
  const { c } = await searchParams;
  const index = await apiGet<{ century: number; count: number }[]>("/timeline/centuries");

  // The century asked for if it exists, else the earliest one that has entries.
  const asked = Number(c);
  const century = index.some((i) => i.century === asked) ? asked : index[0]?.century;
  const entries =
    century === undefined
      ? []
      : await apiGet<TimelineEntry[]>(`/timeline?century=${century}&limit=1000`);
  const position = index.findIndex((i) => i.century === century);
  const previous = position > 0 ? index[position - 1] : undefined;
  const next = position >= 0 ? index[position + 1] : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Theo thế kỷ"
        title="Dòng thời gian"
        description="Chính thể, nhân vật và sự kiện theo thứ tự thời gian. Chọn một thế kỷ để xem."
      />
      {index.length === 0 ? (
        <div className="mt-8">
          <Empty>Dữ liệu đang được biên soạn, chưa có mốc thời gian nào.</Empty>
        </div>
      ) : (
        <>
          <nav aria-label="Chọn thế kỷ" className="mt-6 flex flex-wrap gap-2">
            {index.map((i) => (
              <Link
                key={i.century}
                href={`/timeline?c=${i.century}`}
                aria-current={i.century === century ? "true" : undefined}
                className={
                  i.century === century
                    ? "border-primary bg-accent text-foreground inline-flex min-h-8 items-center rounded-full border px-3.5 text-sm"
                    : "bg-card text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center rounded-full border px-3.5 text-sm transition-colors"
                }
              >
                {centuryLabel(i.century)} <span className="ml-1.5 text-xs">({i.count})</span>
              </Link>
            ))}
          </nav>

          <section className="mt-8" aria-labelledby="century-title">
            <h2 id="century-title" className="text-gradient mb-4 w-fit text-2xl">
              {century !== undefined && centuryLabel(century)}
            </h2>
            <TimelineList entries={entries} />
          </section>

          <div className="mt-8 flex items-center justify-between gap-3 text-sm">
            {previous ? (
              <Link href={`/timeline?c=${previous.century}`} className="underline">
                ← {centuryLabel(previous.century)}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/timeline?c=${next.century}`} className="underline">
                {centuryLabel(next.century)} →
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
