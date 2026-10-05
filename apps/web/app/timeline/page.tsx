import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { TimelineEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dòng thời gian",
  description: "Chính thể và nhân vật lịch sử thế giới theo thứ tự thời gian, nhóm theo thế kỷ.",
};

const century = (year: number) => (year > 0 ? Math.ceil(year / 100) : -Math.ceil(-year / 100));
const centuryLabel = (c: number) => (c > 0 ? `Thế kỷ ${c}` : `Thế kỷ ${-c} TCN`);

export default async function TimelinePage() {
  const entries = await apiGet<TimelineEntry[]>("/timeline");
  const groups = new Map<number, TimelineEntry[]>();
  for (const e of entries) {
    const c = century(e.start!.year);
    groups.set(c, [...(groups.get(c) ?? []), e]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Theo thế kỷ"
        title="Dòng thời gian"
        description="Chính thể và nhân vật theo thứ tự thời gian, nhóm theo thế kỷ."
      />
      <div className="mt-8 flex flex-col gap-10">
        {entries.length === 0 && <Empty>Chưa có dữ liệu.</Empty>}
        {[...groups.entries()].map(([c, items]) => (
          <section key={c}>
            <h2 className="text-gradient mb-4 w-fit text-2xl">{centuryLabel(c)}</h2>
            <ul className="border-border ml-1 flex flex-col gap-3 border-l-2 pl-5">
              {items.map((e) => (
                <li key={`${e.kind}-${e.slug}`}>
                  <Link
                    href={`/${e.kind}/${e.slug}`}
                    className="surface-interactive flex items-center justify-between gap-3 p-3.5"
                  >
                    <span>
                      <span className="text-foreground font-semibold">{e.name}</span>
                      <span className="text-muted-foreground ml-3 text-sm">
                        {e.start?.label} – {e.end?.label ?? "?"}
                      </span>
                    </span>
                    <Badge variant={e.kind === "polity" ? "success" : "info"}>
                      {e.kind === "polity" ? "Chính thể" : "Nhân vật"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
