import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { Empty } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { PolitySummary } from "@/lib/types";

export const metadata: Metadata = { title: "Chính thể" };

export default async function PolitiesPage() {
  const [polities, typeLabels] = await Promise.all([apiGet<PolitySummary[]>("/polities"), getLabels("polity_type")]);
  return (
    <>
      <h1>Chính thể</h1>
      <p className="mt-1 text-muted-foreground">Các triều đại và chính quyền, theo thứ tự thời gian.</p>
      <div className="mt-6 flex flex-col gap-2">
        {polities.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          polities.map((p) => (
            <Link
              key={p.id}
              href={`/polity/${p.slug}`}
              className="flex items-center justify-between rounded-[var(--radius)] border bg-card p-4 no-underline transition-shadow hover:no-underline hover:shadow-md"
            >
              <div>
                <div className="font-semibold text-foreground">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.started || p.ended ? `${p.started?.label ?? "?"} – ${p.ended?.label ?? "?"}` : "Chưa rõ thời gian"}
                </div>
              </div>
              <Badge variant="neutral">{typeLabels[p.polityType] ?? p.polityType}</Badge>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
