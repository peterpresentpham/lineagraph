import Link from "next/link";
import { ArrowRight, ArrowUpRight, Network, Route, Search } from "lucide-react";
import { PersonCard } from "@/components/PersonCard";
import { PolityCard } from "@/components/PolityCard";
import { Empty, Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { PersonSummary, PolitySummary } from "@/lib/types";

const suggestions = ["Lê Lợi", "Nhà Trần", "Nguyễn Trãi", "Lê Thánh Tông"];

const tools = [
  {
    href: "/graph",
    icon: Network,
    title: "Sơ đồ quan hệ",
    text: "Chọn một nhân vật, xem cả mạng lưới họ hàng, vợ chồng, thầy trò quanh người đó.",
  },
  {
    href: "/relations",
    icon: Route,
    title: "Tìm quan hệ",
    text: "Hai nhân vật bất kỳ có quan hệ gì? Từ ông cháu, cô cháu đến tổ tiên chung nhiều đời.",
  },
];

export default async function HomePage() {
  const [polities, persons, typeLabels] = await Promise.all([
    apiGet<PolitySummary[]>("/polities"),
    apiGet<{ items: PersonSummary[]; total: number }>("/persons?limit=8"),
    getLabels("polity_type"),
  ]);

  return (
    <>
      <div className="bg-aurora relative overflow-hidden rounded-3xl border p-6 shadow-card sm:p-10 lg:p-14">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom_left,black,transparent_60%)]" />
        <div className="animate-fade-up relative max-w-3xl">
          <p className="eyebrow">Sử Phả</p>
          <h1 className="text-display mt-3">
            Lịch sử Việt Nam qua từng <span className="text-gradient">dòng phả hệ</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-lg text-pretty">
            Tra cứu nhân vật, triều đại và mối quan hệ giữa họ: ai là cha của ai, ai kế vị ai, hai
            người có họ hàng thế nào.
          </p>
          <form action="/search" className="mt-8 flex max-w-xl">
            <label className="relative w-full">
              <Search className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2" />
              <input
                name="q"
                type="search"
                placeholder="Thử gõ: Lê Lợi, Nhà Trần..."
                className="border-input bg-card focus:border-ring focus:ring-ring/25 h-14 w-full rounded-2xl border pl-12 pr-4 text-base shadow-md outline-none transition focus:ring-4"
              />
            </label>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Gợi ý:</span>
            {suggestions.map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="bg-card/80 hover:border-primary hover:text-primary text-foreground rounded-full border px-3 py-1 no-underline transition-colors hover:no-underline"
              >
                {q}
              </Link>
            ))}
          </div>
          <dl className="mt-10 flex gap-10">
            <div>
              <dt className="text-muted-foreground text-sm">Nhân vật</dt>
              <dd className="font-serif text-3xl font-semibold">{persons.total}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Chính thể</dt>
              <dd className="font-serif text-3xl font-semibold">{polities.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tools.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="surface-interactive group flex gap-4 p-5">
            <span className="bg-brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-white">
              <Icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-foreground flex items-center justify-between font-serif text-xl font-semibold">
                {title}
                <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{text}</p>
            </div>
          </Link>
        ))}
      </div>

      <Section
        title="Chính thể"
        action={
          polities.length > 6 && (
            <Link href="/polities" className="flex items-center gap-1 text-sm font-medium">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          )
        }
      >
        {polities.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polities.slice(0, 6).map((p) => (
              <PolityCard key={p.id} polity={p} typeLabel={typeLabels[p.polityType] ?? p.polityType} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Nhân vật"
        action={
          persons.total > 8 && (
            <Link href="/persons" className="flex items-center gap-1 text-sm font-medium">
              Xem tất cả {persons.total} <ArrowRight className="size-4" />
            </Link>
          )
        }
      >
        {persons.items.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {persons.items.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
