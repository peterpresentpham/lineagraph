import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@lineagraph/ui";
import { PersonCard } from "@/components/PersonCard";
import { Empty, Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { PersonSummary, PolitySummary } from "@/lib/types";

export default async function HomePage() {
  const [polities, persons, typeLabels] = await Promise.all([
    apiGet<PolitySummary[]>("/polities"),
    apiGet<{ items: PersonSummary[]; total: number }>("/persons?limit=8"),
    getLabels("polity_type"),
  ]);

  return (
    <>
      <div className="border-l-4 border-l-primary bg-card px-8 py-10 shadow-[0_1px_0_var(--border)]">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Sử Phả</p>
        <h1 className="mt-2 max-w-2xl text-4xl leading-tight">Lịch sử Việt Nam qua từng dòng phả hệ</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Tra cứu nhân vật, triều đại và mối quan hệ giữa họ: ai là cha của ai, ai kế vị ai.
        </p>
        <form action="/search" className="mt-6 flex max-w-md items-center">
          <label className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Thử gõ: Lê Lợi, Nhà Trần..."
              className="h-12 w-full rounded-sm border border-input bg-background pr-4 pl-10 outline-none focus:border-primary"
            />
          </label>
        </form>
      </div>

      <Section title="Chính thể">
        {polities.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {polities.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/polity/${p.slug}`}
                className="block rounded-[var(--radius)] border bg-card p-4 no-underline transition-shadow hover:no-underline hover:shadow-md"
              >
                <div className="font-semibold text-foreground">{p.name}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {p.started || p.ended ? `${p.started?.label ?? "?"} – ${p.ended?.label ?? "?"}` : "Chưa rõ thời gian"}
                </div>
                <Badge className="mt-2" variant="neutral">{typeLabels[p.polityType] ?? p.polityType}</Badge>
              </Link>
            ))}
          </div>
        )}
        {polities.length > 6 && (
          <Link href="/polities" className="mt-3 inline-block text-sm font-medium">Xem tất cả chính thể →</Link>
        )}
      </Section>

      <Section title="Nhân vật">
        {persons.items.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {persons.items.map((p) => <PersonCard key={p.id} person={p} />)}
          </div>
        )}
        {persons.total > 8 && (
          <Link href="/persons" className="mt-3 inline-block text-sm font-medium">Xem tất cả {persons.total} nhân vật →</Link>
        )}
      </Section>
    </>
  );
}
