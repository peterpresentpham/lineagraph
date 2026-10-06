import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Network, Route, Search, Shuffle } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { JsonLd } from "@/components/JsonLd";
import { PersonCard } from "@/components/PersonCard";
import { PolityCard } from "@/components/PolityCard";
import { Empty, Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import type { EventSummary, PersonSummary, PolitySummary } from "@/lib/types";

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

// Reads the API, which is not running while the site is built, so render per request (the fetches
// inside are still cached for a minute, see lib/api.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [{ items: polities, total: polityTotal }, persons, events, typeLabels] = await Promise.all([
    apiGet<{ items: PolitySummary[]; total: number }>("/polities?limit=6&sort=notable"),
    apiGet<{ items: PersonSummary[]; total: number }>("/persons?limit=8&sort=notable"),
    apiGet<{ items: EventSummary[]; total: number }>("/events?limit=6"),
    getLabels("polity_type"),
  ]);
  // The counters only mean something once there is a body of data; before that they would read
  // as "3 people, 1 polity" and make the site look abandoned instead of in progress.
  const showCounters = persons.total + polityTotal + events.total >= 30;

  // Example searches come from what is actually in the data, not a fixed list of names.
  const suggestions = [...polities.slice(0, 2), ...persons.items.slice(0, 2)].map((n) => n.name);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Sử Phả",
          url: SITE_URL,
          inLanguage: "vi",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="bg-aurora shadow-card relative overflow-hidden rounded-3xl border p-6 sm:p-10 lg:p-14">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom_left,black,transparent_60%)]" />
        <div className="animate-fade-up relative max-w-3xl">
          <p className="eyebrow">Sử Phả</p>
          <h1 className="text-display mt-3">
            Lịch sử thế giới qua từng <span className="text-gradient">dòng phả hệ</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-pretty text-lg">
            Tra cứu nhân vật, triều đại và mối quan hệ giữa họ: ai là cha của ai, ai kế vị ai, hai
            người có họ hàng thế nào.
          </p>
          <form action="/search" className="mt-8 flex max-w-xl">
            <label className="relative w-full">
              <span className="sr-only">Tìm nhân vật hoặc chính thể</span>
              <Search className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2" />
              <input
                name="q"
                type="search"
                placeholder={
                  suggestions.length > 0
                    ? `Thử gõ: ${suggestions.slice(0, 2).join(", ")}...`
                    : "Tìm nhân vật, chính thể, sự kiện..."
                }
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring h-14 w-full rounded-2xl border pl-12 pr-4 text-base shadow-md transition focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </label>
          </form>
          {suggestions.length > 0 && (
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
              {/* A plain link on purpose: it is a redirect, which must not be prefetched. */}
              <a
                href="/ngau-nhien"
                className="text-primary ml-1 inline-flex items-center gap-1.5 px-1 py-1 font-medium"
              >
                <Shuffle className="size-4" aria-hidden /> Xem ngẫu nhiên
              </a>
            </div>
          )}
          {showCounters ? (
            <dl className="mt-10 flex gap-10">
              <div>
                <dt className="text-muted-foreground text-sm">Nhân vật</dt>
                <dd className="font-serif text-3xl font-semibold">{persons.total}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Chính thể</dt>
                <dd className="font-serif text-3xl font-semibold">{polityTotal}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Sự kiện</dt>
                <dd className="font-serif text-3xl font-semibold">{events.total}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground mt-8 text-sm">
              Dữ liệu đang được biên soạn và bổ sung dần.
            </p>
          )}
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
          polityTotal > 6 && (
            <Link href="/polities" className="flex items-center gap-1 text-sm font-medium">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          )
        }
      >
        {polities.length === 0 ? (
          <Empty>Dữ liệu đang được biên soạn.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polities.map((p) => (
              <PolityCard
                key={p.id}
                polity={p}
                typeLabel={typeLabels[p.polityType] ?? p.polityType}
              />
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
          <Empty>Dữ liệu đang được biên soạn.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {persons.items.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        )}
      </Section>

      {events.items.length > 0 && (
        <Section
          title="Sự kiện"
          action={
            events.total > 6 && (
              <Link href="/events" className="flex items-center gap-1 text-sm font-medium">
                Xem tất cả {events.total} <ArrowRight className="size-4" />
              </Link>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
