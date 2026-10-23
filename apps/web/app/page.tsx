import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History, Network, Route, Search, Shuffle } from "lucide-react";
import { DynastyRibbon } from "@/components/DynastyRibbon";
import { EventCard } from "@/components/EventCard";
import { JsonLd } from "@/components/JsonLd";
import { LineageMotif } from "@/components/LineageMotif";
import { PersonCard } from "@/components/PersonCard";
import { PolityCard } from "@/components/PolityCard";
import { Empty, Section } from "@/components/Section";
import { TodayRow } from "@/components/TodayList";
import { apiGet, getLabels } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import { cn } from "@lineagraph/ui";
import type { EventSummary, PersonSummary, PolitySummary, TodayEntry } from "@/lib/types";

const tools = [
  {
    href: "/graph",
    icon: Network,
    tone: "tone-brand",
    title: "Sơ đồ quan hệ",
    text: "Chọn một nhân vật và xem cả mạng lưới họ hàng, vợ chồng, thầy trò quanh người đó.",
    action: "Mở sơ đồ",
  },
  {
    href: "/relations",
    icon: Route,
    tone: "tone-indigo",
    title: "Tìm quan hệ",
    text: "Hai nhân vật bất kỳ có quan hệ gì? Từ ông cháu, cô cháu đến tổ tiên chung nhiều đời.",
    action: "Thử tìm",
  },
  {
    href: "/timeline",
    icon: History,
    tone: "tone-gold",
    title: "Dòng thời gian",
    text: "Duyệt lịch sử theo từng thế kỷ: triều đại, nhân vật và sự kiện sắp theo thứ tự thời gian.",
    action: "Xem theo thế kỷ",
  },
] as const;

// Reads the API, which is not running while the site is built, so render per request (the fetches
// inside are still cached for a minute, see lib/api.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [
    { items: polities, total: polityTotal },
    timelinePolities,
    persons,
    events,
    typeLabels,
    today,
  ] = await Promise.all([
    apiGet<{ items: PolitySummary[]; total: number }>("/polities?limit=6&sort=notable"),
    apiGet<{ items: PolitySummary[] }>("/polities?limit=24&sort=date"),
    apiGet<{ items: PersonSummary[]; total: number }>("/persons?limit=8&sort=notable"),
    apiGet<{ items: EventSummary[]; total: number }>("/events?limit=6"),
    getLabels("polity_type"),
    apiGet<{ month: number; day: number; entries: TodayEntry[] }>("/today").catch(() => null),
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
      <section className="bg-ink animate-fade-up relative overflow-hidden rounded-[2rem] px-6 py-14 shadow-lg sm:px-12 sm:py-20 lg:px-16 lg:py-24">
        <LineageMotif className="text-gold-400 pointer-events-none absolute -right-24 top-1/2 w-[40rem] max-w-none -translate-y-1/2 opacity-30 md:-right-10 md:opacity-60 lg:right-4" />
        <div className="relative max-w-2xl">
          <p className="text-gold-300 text-xs font-semibold uppercase tracking-[0.22em]">
            Sử Phả · Lịch sử qua phả hệ
          </p>
          <h1 className="text-display mt-4 text-white">
            Mỗi triều đại là một <span className="text-gold">dòng họ</span>, mỗi dòng họ là một câu
            chuyện
          </h1>
          <p className="text-night-200 mt-5 max-w-xl text-pretty text-lg leading-relaxed">
            Tra cứu nhân vật, triều đại và sự kiện; lần theo ai là cha của ai, ai kế vị ai, và hai
            người có họ hàng thế nào.
          </p>
          <form action="/search" className="relative mt-9 max-w-xl">
            <label>
              <span className="sr-only">Tìm nhân vật, chính thể hoặc sự kiện</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-stone-500" />
              <input
                name="q"
                type="search"
                placeholder={
                  suggestions.length > 0
                    ? `Thử gõ: ${suggestions.slice(0, 2).join(", ")}...`
                    : "Tìm nhân vật, chính thể, sự kiện..."
                }
                className="focus-visible:ring-gold-400 h-16 w-full rounded-2xl border-0 bg-white pl-14 pr-32 text-base text-stone-900 shadow-lg outline-none placeholder:text-stone-500 focus-visible:ring-4"
              />
            </label>
            <button
              type="submit"
              className="bg-brand-gradient shadow-brand absolute right-2.5 top-1/2 h-11 -translate-y-1/2 rounded-xl px-6 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Tìm kiếm
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-night-200">Gợi ý:</span>
              {suggestions.map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="hover:border-gold-300 hover:text-gold-300 rounded-full border border-white/25 px-3.5 py-1 text-white no-underline transition-colors hover:no-underline"
                >
                  {q}
                </Link>
              ))}
              {/* A plain link on purpose: it is a redirect, which must not be prefetched. */}
              <a
                href="/ngau-nhien"
                className="text-gold-300 ml-1 inline-flex items-center gap-1.5 px-1 py-1 font-medium"
              >
                <Shuffle className="size-4" aria-hidden /> Xem ngẫu nhiên
              </a>
            </div>
          )}
          {showCounters ? (
            <dl className="mt-12 flex gap-8 sm:gap-12">
              {[
                ["Nhân vật", persons.total],
                ["Chính thể", polityTotal],
                ["Sự kiện", events.total],
              ].map(([label, value]) => (
                <div key={label} className="border-l border-white/20 pl-4 sm:pl-5">
                  <dd className="text-gold font-serif text-4xl font-semibold leading-none">
                    {value}
                  </dd>
                  <dt className="text-night-200 mt-2 text-sm">{label}</dt>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-night-200 mt-10 text-sm">
              Dữ liệu đang được biên soạn và bổ sung dần.
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tools.map(({ href, icon: Icon, tone, title, text, action }) => (
          <Link
            key={href}
            href={href}
            className={cn("surface-interactive group flex flex-col p-6", tone)}
          >
            <span className="tone-panel text-tone grid size-12 place-items-center rounded-2xl">
              <Icon className="size-6" />
            </span>
            <div className="text-foreground mt-4 font-serif text-xl font-semibold">{title}</div>
            <p className="text-muted-foreground mt-1.5 flex-1 text-sm leading-relaxed">{text}</p>
            <span className="text-tone mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              {action}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      {today && today.entries.length > 0 && (
        <Section
          large
          eyebrow="Hôm nay trong lịch sử"
          title={`Ngày ${today.day} tháng ${today.month}`}
          action={
            today.entries.length > 4 && (
              <Link href="/hom-nay" className="flex items-center gap-1 text-sm font-medium">
                Xem tất cả {today.entries.length} <ArrowRight className="size-4" />
              </Link>
            )
          }
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {today.entries.slice(0, 4).map((e) => (
              <TodayRow
                key={`${e.kind}-${e.slug}-${e.type}`}
                entry={e}
                currentYear={new Date().getFullYear()}
              />
            ))}
          </ul>
        </Section>
      )}

      {timelinePolities.items.filter((p) => p.started?.year != null).length >= 2 && (
        <Section
          large
          eyebrow="Trục thời gian"
          title="Các triều đại nối tiếp nhau"
          description="Mỗi thanh là một chính thể, vẽ theo năm tồn tại. Chọn một thanh để xem chi tiết."
        >
          <DynastyRibbon polities={timelinePolities.items} />
        </Section>
      )}

      <Section
        large
        eyebrow="Chính thể"
        title="Những triều đại và thế lực"
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
        large
        eyebrow="Nhân vật"
        title="Những gương mặt nổi bật"
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {persons.items.map((p) => (
              <PersonCard key={p.id} person={p} variant="feature" />
            ))}
          </div>
        )}
      </Section>

      {events.items.length > 0 && (
        <Section
          large
          eyebrow="Sự kiện"
          title="Những dấu mốc lịch sử"
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

      <section className="bg-ink relative mt-20 overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12">
        <LineageMotif className="text-gold-400 pointer-events-none absolute left-1/2 top-1/2 w-[34rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-15" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-headline text-[length:var(--text-headline)] text-white">
            Hai người này có họ hàng với nhau không?
          </h2>
          <p className="text-night-200 mt-3">
            Chọn hai nhân vật bất kỳ, Sử Phả sẽ tìm đường nối họ với nhau qua các thế hệ.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/relations"
              className="bg-brand-gradient shadow-brand inline-flex h-12 items-center gap-2 rounded-xl px-6 font-semibold text-white no-underline transition-transform hover:scale-[1.03] hover:no-underline"
            >
              <Route className="size-5" aria-hidden /> Tìm quan hệ
            </Link>
            <a
              href="/ngau-nhien"
              className="hover:border-gold-300 hover:text-gold-300 inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-medium text-white no-underline transition-colors hover:no-underline"
            >
              <Shuffle className="size-5" aria-hidden /> Xem ngẫu nhiên
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
