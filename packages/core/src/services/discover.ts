import { sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { parseDate, type DateView } from "./dates";

// Two ways of leading a reader from one page to the next, both built from data that is already
// there: "Đọc tiếp" (people, events and polities from the same time or the same dynasty) and
// "Hôm nay trong lịch sử" (births, deaths and events that fall on a given day of the year).

const DAYS_PER_YEAR = 365;
// A person with a birth but no death date is taken to have lived about this long, for overlap.
const ASSUMED_LIFESPAN_YEARS = 70;
// Likewise for a polity with no end date.
const ASSUMED_POLITY_YEARS = 100;

export type ReadRef = {
  kind: "person" | "polity" | "event";
  slug: string;
  name: string;
  start: DateView | null;
  end: DateView | null;
  /** Office held in the shared polity (person entries of `samePolity` only), as an office code. */
  detail: string | null;
};

export type ReadNext = {
  /** People, events and polities that overlap the subject's time, nearest first. */
  contemporaries: ReadRef[];
  /** People who held office in the same polities as the subject (people only). */
  samePolity: { polity: { slug: string; name: string }; people: ReadRef[] }[];
};

type RefRow = {
  kind: ReadRef["kind"];
  slug: string;
  name: string;
  start_edtf: string | null;
  end_edtf: string | null;
  detail: string | null;
};

const toRef = (r: RefRow): ReadRef => ({
  kind: r.kind,
  slug: r.slug,
  name: r.name,
  start: parseDate(r.start_edtf),
  end: parseDate(r.end_edtf),
  detail: r.detail,
});

/** Everything dated, with the span it covers in Julian Day Numbers; used to find who overlaps. */
const spans = sql`
  select 'person' as kind, n.id, n.slug, pn.name, bd.edtf as start_edtf, dd.edtf as end_edtf,
         bd.earliest_jdn as s,
         coalesce(dd.latest_jdn, bd.earliest_jdn + ${ASSUMED_LIFESPAN_YEARS * DAYS_PER_YEAR}::int) as e
  from kg.node n join history.person p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
  join kg.fuzzy_date bd on bd.id = b.date_id
  left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
  left join kg.fuzzy_date dd on dd.id = d.date_id
  where n.deleted_at is null and bd.earliest_jdn is not null
  union all
  select 'polity', n.id, n.slug, pn.name, sd.edtf, ed.edtf, sd.earliest_jdn,
         coalesce(ed.latest_jdn, sd.earliest_jdn + ${ASSUMED_POLITY_YEARS * DAYS_PER_YEAR}::int)
  from kg.node n join history.polity p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  join kg.fuzzy_date sd on sd.id = p.started_id
  left join kg.fuzzy_date ed on ed.id = p.ended_id
  where n.deleted_at is null and sd.earliest_jdn is not null
  union all
  select 'event', n.id, n.slug, en.name, sd.edtf, ed.edtf, sd.earliest_jdn,
         coalesce(ed.latest_jdn, sd.latest_jdn, sd.earliest_jdn)
  from kg.node n join history.event ev on ev.id = n.id
  join kg.name en on en.node_id = n.id and en.is_primary
  join kg.fuzzy_date sd on sd.id = ev.start_id
  left join kg.fuzzy_date ed on ed.id = ev.end_id
  where n.deleted_at is null and sd.earliest_jdn is not null`;

// How many of each kind to suggest. A polity's own page already lists its people, so it gets none.
const PER_KIND = { person: 6, event: 3, polity: 3 } as const;

export async function getReadNext(slug: string): Promise<ReadNext> {
  const [subject] = await db.execute<{ id: string; kind: ReadRef["kind"]; s: number; e: number }>(
    sql`select id, kind, s, e from (${spans}) t where slug = ${slug}`,
  );
  const [node] = subject
    ? [subject]
    : await db.execute<{ id: string }>(
        sql`select id from kg.node where slug = ${slug} and deleted_at is null`,
      );
  if (!node) throw notFound("đối tượng");

  const [near, samePolity] = await Promise.all([
    subject
      ? db.execute<RefRow>(
          sql`select kind, slug, name, start_edtf, end_edtf, null as detail from (
                select *, row_number() over (
                  partition by kind order by abs(s - ${(Number(subject.s) + Number(subject.e)) / 2}::float8), name
                ) as rank
                from (${spans}) t
                where s <= ${subject.e}::int and e >= ${subject.s}::int and id <> ${subject.id}::uuid
                  and not (${subject.kind}::text = 'polity' and kind = 'person')
              ) ranked
              where rank <= case kind when 'person' then ${PER_KIND.person}::int
                                      when 'event' then ${PER_KIND.event}::int
                                      else ${PER_KIND.polity}::int end
              order by kind = 'person' desc, kind = 'event' desc, abs(s - ${subject.s}::int)`,
        )
      : [],
    subject?.kind === "person" ? samePolityPeople(subject.id) : [],
  ]);
  // Someone listed as a fellow office-holder is not also offered as "cùng thời".
  const listed = new Set(samePolity.flatMap((g) => g.people.map((p) => p.slug)));
  return { contemporaries: near.map(toRef).filter((r) => !listed.has(r.slug)), samePolity };
}

/** Others who held office in the (up to two earliest) polities this person served. */
async function samePolityPeople(personId: string): Promise<ReadNext["samePolity"]> {
  const polities = await db.execute<{
    id: string;
    slug: string;
    name: string;
    my_start: number | null;
  }>(
    sql`select n.id, n.slug, pn.name, min(sd.earliest_jdn) as my_start
        from history.tenure t
        join kg.node n on n.id = t.polity_id and n.deleted_at is null
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        left join kg.fuzzy_date sd on sd.id = t.start_id
        where t.person_id = ${personId}::uuid and t.state = 'accepted'
        group by n.id, n.slug, pn.name
        order by min(sd.earliest_jdn) nulls last, pn.name
        limit 2`,
  );
  return Promise.all(
    polities.map(async (polity) => {
      const rows = await db.execute<RefRow & { t_start: number | null }>(
        sql`select distinct on (n.id) 'person' as kind, n.slug, pn.name, bd.edtf as start_edtf,
                   dd.edtf as end_edtf, t.office_type as detail, sd.earliest_jdn as t_start
            from history.tenure t
            join kg.node n on n.id = t.person_id and n.deleted_at is null
            join kg.name pn on pn.node_id = n.id and pn.is_primary
            left join history.person_date b on b.person_id = n.id and b.kind = 'birth' and b.is_preferred
            left join kg.fuzzy_date bd on bd.id = b.date_id
            left join history.person_date d on d.person_id = n.id and d.kind = 'death' and d.is_preferred
            left join kg.fuzzy_date dd on dd.id = d.date_id
            left join kg.fuzzy_date sd on sd.id = t.start_id
            where t.polity_id = ${polity.id}::uuid and t.state = 'accepted'
              and t.person_id <> ${personId}::uuid
            order by n.id, t.seq nulls last`,
      );
      // The eight closest in time to when this person held office, then in the order held.
      const mine = Number(polity.my_start ?? 0);
      const nearest =
        polity.my_start === null
          ? rows
          : [...rows].sort(
              (a, b) =>
                Math.abs(Number(a.t_start ?? Infinity) - mine) -
                Math.abs(Number(b.t_start ?? Infinity) - mine),
            );
      const sorted = nearest
        .slice(0, 8)
        .sort((a, b) => Number(a.t_start ?? Infinity) - Number(b.t_start ?? Infinity));
      return {
        polity: { slug: polity.slug, name: polity.name },
        people: sorted.map(toRef),
      };
    }),
  ).then((groups) => groups.filter((g) => g.people.length > 0));
}

export type TodayEntry = {
  /** What happened on the day: a birth, a death, or an event that began. */
  type: "birth" | "death" | "event";
  kind: "person" | "event";
  slug: string;
  name: string;
  date: DateView;
};

const monthDay = (month: number, day: number) =>
  `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * Births, deaths and events whose recorded date falls on this day of the year, oldest first.
 * Only dates known to the day count (and not approximate ones); the day and month are the ones
 * the source gives, in its own calendar, which is how history books cite them.
 */
export async function getToday(month: number, day: number): Promise<TodayEntry[]> {
  const rows = await db.execute<{
    type: TodayEntry["type"];
    kind: TodayEntry["kind"];
    slug: string;
    name: string;
    edtf: string;
  }>(sql`
    select * from (
      select pd.kind as type, 'person' as kind, n.slug, pn.name, fd.edtf, fd.earliest_jdn
      from history.person_date pd
      join kg.fuzzy_date fd on fd.id = pd.date_id
      join kg.node n on n.id = pd.person_id and n.deleted_at is null
      join kg.name pn on pn.node_id = n.id and pn.is_primary
      where pd.is_preferred and pd.kind in ('birth', 'death')
      union all
      select 'event', 'event', n.slug, en.name, fd.edtf, fd.earliest_jdn
      from history.event ev
      join kg.fuzzy_date fd on fd.id = ev.start_id
      join kg.node n on n.id = ev.id and n.deleted_at is null
      join kg.name en on en.node_id = n.id and en.is_primary
    ) t
    where substring(edtf from '^-?[0-9]{4}-([0-9]{2}-[0-9]{2})') = ${monthDay(month, day)}
      and edtf not like '%~'
    order by earliest_jdn, name
    limit 80`);
  return rows.flatMap((r) => {
    const date = parseDate(r.edtf);
    return date ? [{ type: r.type, kind: r.kind, slug: r.slug, name: r.name, date }] : [];
  });
}
