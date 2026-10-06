import { sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import type { PlaceInput } from "../validation";
import { likeContains, normalizeText } from "./text";

type PlaceRow = {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  place_type: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
};

const placeSelect = sql`
  select p.id, p.name, p.parent_id, pp.name as parent_name, p.place_type, p.latitude, p.longitude, p.note
  from history.place p
  left join history.place pp on pp.id = p.parent_id`;

const placeView = (r: PlaceRow) => ({
  id: r.id,
  name: r.name,
  parent: r.parent_id ? { id: r.parent_id, name: r.parent_name! } : null,
  placeType: r.place_type,
  latitude: r.latitude,
  longitude: r.longitude,
  note: r.note,
});

export async function listPlaces(opts: { q?: string; limit?: number; offset?: number }) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const q = opts.q ? normalizeText(opts.q) : null;
  const filter = q ? sql`where p.name_normalized like ${likeContains(q)}` : sql``;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<PlaceRow>(
      sql`${placeSelect} ${filter} order by p.name_normalized limit ${limit} offset ${offset}`,
    ),
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from history.place p ${filter}`,
    ),
  ]);
  return { items: rows.map(placeView), total: count };
}

export async function getPlace(id: string) {
  const [row] = await db.execute<PlaceRow>(sql`${placeSelect} where p.id = ${id}::uuid`);
  if (!row) throw notFound("địa điểm");
  return placeView(row);
}

// A place cannot lie inside itself, directly or through its own sub-places.
async function assertNoParentLoop(id: string, parentId: string) {
  const [hit] = await db.execute<{ loops: boolean }>(
    sql`with recursive up(id) as (
          select ${parentId}::uuid
          union
          select p.parent_id from history.place p join up on p.id = up.id where p.parent_id is not null
        ) select exists (select 1 from up where id = ${id}::uuid) as loops`,
  );
  if (hit?.loops) throw new ServiceError(400, "Địa điểm không thể nằm trong chính nó");
}

export async function createPlace(input: PlaceInput) {
  const [row] = await db.execute<{ id: string }>(
    sql`insert into history.place (name, name_normalized, place_type, parent_id, latitude, longitude, note)
        values (${input.name}, ${normalizeText(input.name)}, ${input.placeType}, ${input.parentId ?? null}::uuid,
                ${input.latitude ?? null}, ${input.longitude ?? null}, ${input.note})
        returning id`,
  );
  return row!;
}

export async function updatePlace(id: string, input: PlaceInput) {
  if (input.parentId) await assertNoParentLoop(id, input.parentId);
  const rows = await db.execute<{ id: string }>(
    sql`update history.place set name = ${input.name}, name_normalized = ${normalizeText(input.name)},
          place_type = ${input.placeType}, parent_id = ${input.parentId ?? null}::uuid, latitude = ${input.latitude ?? null},
          longitude = ${input.longitude ?? null}, note = ${input.note}
        where id = ${id}::uuid returning id`,
  );
  if (!rows.length) throw notFound("địa điểm");
}

export async function deletePlace(id: string) {
  const [r] = await db.execute<{
    found: boolean;
    people: number;
    children: number;
    events: number;
    deleted: number;
  }>(
    sql`with used as (
          select
            (select count(*)::int from history.person where birth_place_id = ${id}::uuid or death_place_id = ${id}::uuid) as people,
            (select count(*)::int from history.place where parent_id = ${id}::uuid) as children,
            (select count(*)::int from history.event where place_id = ${id}::uuid) as events),
        gone as (
          delete from history.place where id = ${id}::uuid
            and (select people + children + events from used) = 0 returning id)
        select exists (select 1 from history.place where id = ${id}::uuid) as found,
               used.people, used.children, used.events, (select count(*)::int from gone) as deleted
        from used`,
  );
  if (r?.deleted) return;
  // Not deleted: either it never existed (found is evaluated on the pre-delete snapshot) or in use.
  if (!r?.found) throw notFound("địa điểm");
  throw new ServiceError(
    409,
    `Còn ${r.people} nhân vật, ${r.events} sự kiện và ${r.children} địa điểm con dùng nơi này, hãy gỡ chúng trước`,
  );
}
