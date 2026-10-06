// Recomputes the Julian Day Numbers of every stored date from its text form. Run it once after
// changing how years are numbered (BCE years used to be treated as astronomical years, which put
// them one year off); safe to run again, it only rewrites rows whose numbers differ.
import { sql as rawSql, db } from "../db";
import { sql } from "drizzle-orm";
import { parseDate, toRow } from "../services/dates";

const rows = await rawSql<{ id: string; edtf: string }[]>`
  select id, edtf from kg.fuzzy_date where edtf is not null`;

const fixed = rows.flatMap((r) => {
  const d = parseDate(r.edtf);
  if (!d) return [];
  const row = toRow({
    year: d.year,
    month: d.month,
    day: d.day,
    approximate: d.approximate,
    calendar: d.calendar,
  });
  return [{ id: r.id, e: row.earliestJdn, l: row.latestJdn }];
});

const changed = await db.execute<{ id: string }>(sql`
  update kg.fuzzy_date f set earliest_jdn = x.e, latest_jdn = x.l
  from jsonb_to_recordset(${JSON.stringify(fixed)}::jsonb) as x(id uuid, e int, l int)
  where f.id = x.id and (f.earliest_jdn, f.latest_jdn) is distinct from (x.e, x.l)
  returning f.id`);

console.log(`${rows.length} dates checked, ${changed.length} updated`);
await rawSql.end();
