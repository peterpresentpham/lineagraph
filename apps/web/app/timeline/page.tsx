import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { TimelineEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dòng thời gian",
  description: "Chính thể và nhân vật lịch sử Việt Nam theo thứ tự thời gian, nhóm theo thế kỷ.",
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
      <h1>Dòng thời gian</h1>
      <p className="text-muted-foreground mt-1">
        Chính thể và nhân vật theo thứ tự thời gian, nhóm theo thế kỷ.
      </p>
      <div className="mt-6 flex flex-col gap-8">
        {entries.length === 0 && <Empty>Chưa có dữ liệu.</Empty>}
        {[...groups.entries()].map(([c, items]) => (
          <section key={c}>
            <h2 className="mb-3 border-b pb-2">{centuryLabel(c)}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((e) => (
                <li key={`${e.kind}-${e.slug}`}>
                  <Link
                    href={`/${e.kind}/${e.slug}`}
                    className="bg-card flex items-center justify-between gap-3 rounded-[var(--radius)] border p-3 no-underline transition-shadow hover:no-underline hover:shadow-md"
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
