import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import { node } from "../schema/kg";
import type { EventInput } from "../validation";
import { dateInsert, parseDate } from "./dates";
import { LABEL_LANGUAGE } from "./labels";
import { nameAttributeCtes, softDeleteNode, uniqueSlug, withoutSource } from "./node";
import { likeContains, normalizeText } from "./text";

type ListRow = {
  id: string;
  slug: string;
  name: string;
  event_type: string;
  type_label: string | null;
  start_edtf: string | null;
  end_edtf: string | null;
  place_id: string | null;
  place_name: string | null;
  participant_count: number;
  updated_at: Date | string;
};

const listSelect = sql`
  select n.id, n.slug, en.name, e.event_type, tl.text as type_label, n.updated_at,
         sd.edtf as start_edtf, ed.edtf as end_edtf, e.place_id, pl.name as place_name,
         (select count(*)::int from history.event_participant ep where ep.event_id = e.id) as participant_count
  from kg.node n
  join history.event e on e.id = n.id
  join kg.name en on en.node_id = n.id and en.is_primary
  left join kg.label tl on tl.namespace = 'event_type' and tl.code = e.event_type and tl.language = ${LABEL_LANGUAGE}
  left join kg.fuzzy_date sd on sd.id = e.start_id
  left join kg.fuzzy_date ed on ed.id = e.end_id
  left join history.place pl on pl.id = e.place_id
  where n.deleted_at is null`;

const listItem = (r: ListRow) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  eventType: r.event_type,
  eventTypeLabel: r.type_label ?? r.event_type,
  start: parseDate(r.start_edtf),
  end: parseDate(r.end_edtf),
  place: r.place_id && r.place_name ? { id: r.place_id, name: r.place_name } : null,
  participantCount: r.participant_count,
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function listEvents(opts: {
  q?: string;
  type?: string;
  /** Only events this person or polity took part in. */
  nodeId?: string;
  /** Only events that have no source at all. */
  noSource?: boolean;
  sort?: "date" | "name";
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const q = opts.q ? normalizeText(opts.q) : null;
  const filter = sql`${
    q
      ? sql`and exists (select 1 from kg.name x where x.node_id = n.id and x.name_normalized like ${likeContains(q)})`
      : sql``
  } ${opts.type ? sql`and e.event_type = ${opts.type}` : sql``} ${
    opts.nodeId
      ? sql`and exists (select 1 from history.event_participant p where p.event_id = e.id and p.node_id = ${opts.nodeId}::uuid)`
      : sql``
  } ${opts.noSource ? withoutSource : sql``}`;
  const order = opts.sort === "name" ? sql`en.name` : sql`sd.earliest_jdn nulls last, en.name`;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<ListRow>(
      sql`${listSelect} ${filter} order by ${order} limit ${limit} offset ${offset}`,
    ),
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from kg.node n join history.event e on e.id = n.id
          where n.deleted_at is null ${filter}`,
    ),
  ]);
  return { items: rows.map(listItem), total: count };
}

async function resolveId(slugOrId: string): Promise<string> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const [row] = await db
    .select({ id: node.id })
    .from(node)
    .where(
      and(
        sql`${node.deletedAt} is null`,
        eq(node.kind, "event"),
        isUuid ? eq(node.id, slugOrId) : eq(node.slug, slugOrId),
      ),
    );
  if (!row) throw notFound("sự kiện");
  return row.id;
}

export async function getEvent(slugOrId: string) {
  const id = await resolveId(slugOrId);
  const [[base], [meta], names, participants, [bodyRow], parent, children] = await Promise.all([
    db.execute<ListRow>(sql`${listSelect} and n.id = ${id}`),
    db.execute<{
      summary: string | null;
      outcome: string | null;
      parent_event_id: string | null;
    }>(sql`select summary, outcome, parent_event_id from history.event where id = ${id}`),
    db.execute<{
      name: string;
      kind: string;
      language: string | null;
      script: string | null;
      is_primary: boolean;
    }>(
      sql`select name, kind, language, script, is_primary from kg.name where node_id = ${id} order by is_primary desc, name`,
    ),
    db.execute<{
      id: string;
      node_id: string;
      slug: string;
      name: string;
      kind: string;
      role: string;
      role_label: string | null;
      side: number | null;
      note: string | null;
    }>(
      sql`select ep.id, ep.node_id, n.slug, nm.name, n.kind, ep.role, rl.text as role_label, ep.side, ep.note
          from history.event_participant ep
          join kg.node n on n.id = ep.node_id and n.deleted_at is null
          join kg.name nm on nm.node_id = n.id and nm.is_primary
          left join kg.label rl on rl.namespace = 'participant_role' and rl.code = ep.role and rl.language = ${LABEL_LANGUAGE}
          where ep.event_id = ${id}
          order by ep.side nulls last, ep.sort_order, nm.name`,
    ),
    db.select({ body: node.body }).from(node).where(eq(node.id, id)),
    db.execute<ListRow>(
      sql`${listSelect} and n.id = (select parent_event_id from history.event where id = ${id})`,
    ),
    db.execute<ListRow>(
      sql`${listSelect} and e.parent_event_id = ${id} order by sd.earliest_jdn nulls last, en.name`,
    ),
  ]);
  return {
    ...listItem(base!),
    summary: meta?.summary ?? null,
    outcome: meta?.outcome ?? null,
    body: bodyRow?.body ?? null,
    names: names.map((n) => ({
      name: n.name,
      kind: n.kind,
      language: n.language,
      script: n.script,
      isPrimary: n.is_primary,
    })),
    participants: participants.map((p) => ({
      id: p.id,
      node: { id: p.node_id, slug: p.slug, name: p.name, kind: p.kind },
      role: p.role,
      roleLabel: p.role_label ?? p.role,
      side: p.side,
      note: p.note,
    })),
    parent: parent[0] ? listItem(parent[0]) : null,
    children: children.map(listItem),
  };
}

export async function getEventForEdit(slugOrId: string) {
  const d = await getEvent(slugOrId);
  return {
    id: d.id,
    slug: d.slug,
    names: d.names,
    eventType: d.eventType,
    summary: d.summary,
    outcome: d.outcome,
    body: d.body,
    start: d.start,
    end: d.end,
    placeId: d.place?.id ?? null,
    parentEventId: d.parent?.id ?? null,
    participants: d.participants.map((p) => ({
      nodeId: p.node.id,
      nodeName: p.node.name,
      role: p.role,
      side: p.side,
      note: p.note,
    })),
  };
}

// Participants must be live people or polities; the place and parent event must exist and the
// parent must not be the event itself or one of its own sub-events.
async function assertEventRefs(input: EventInput, selfId?: string) {
  const ids = [...new Set(input.participants.map((p) => p.nodeId))];
  const [found, place, parentLoop] = await Promise.all([
    ids.length
      ? db.execute<{ id: string }>(
          sql`select id from kg.node where deleted_at is null and kind in ('person', 'polity')
              and id in (${sql.join(
                ids.map((i) => sql`${i}::uuid`),
                sql`, `,
              )})`,
        )
      : Promise.resolve([] as { id: string }[]),
    input.placeId
      ? db.execute<{ id: string }>(
          sql`select id from history.place where id = ${input.placeId}::uuid`,
        )
      : Promise.resolve([{ id: "" }]),
    input.parentEventId
      ? db.execute<{ ok: boolean; loops: boolean }>(
          sql`with recursive up(id) as (
                select ${input.parentEventId}::uuid
                union
                select e.parent_event_id from history.event e join up on e.id = up.id
                where e.parent_event_id is not null)
              select exists (select 1 from kg.node n where n.id = ${input.parentEventId}::uuid
                               and n.kind = 'event' and n.deleted_at is null) as ok,
                     ${selfId ? sql`exists (select 1 from up where id = ${selfId}::uuid)` : sql`false`} as loops`,
        )
      : Promise.resolve([{ ok: true, loops: false }]),
  ]);
  const roles = [...new Set(input.participants.map((p) => p.role))];
  const [known] = await db.execute<{ type_ok: boolean; roles_ok: number }>(
    sql`select exists (select 1 from history.event_type where code = ${input.eventType}) as type_ok,
               (select count(*)::int from history.participant_role
                where code in (select jsonb_array_elements_text(${JSON.stringify(roles)}::jsonb))) as roles_ok`,
  );
  if (!known?.type_ok) throw new ServiceError(400, "Loại sự kiện không tồn tại");
  if (roles.length && known.roles_ok !== roles.length) {
    throw new ServiceError(400, "Có vai trò tham gia không tồn tại trong danh mục");
  }
  if (found.length !== ids.length) {
    throw new ServiceError(400, "Có người hoặc chính thể tham gia không tồn tại hoặc đã bị xoá");
  }
  if (!place.length) throw new ServiceError(400, "Địa điểm không tồn tại");
  if (!parentLoop[0]?.ok) throw new ServiceError(400, "Sự kiện cha không tồn tại");
  if (parentLoop[0].loops) throw new ServiceError(400, "Sự kiện không thể nằm trong chính nó");
}

function participantRows(input: EventInput) {
  return JSON.stringify(
    input.participants.map((p, i) => ({
      node_id: p.nodeId,
      role: p.role,
      side: p.side ?? null,
      note: p.note,
      sort: i,
    })),
  );
}

// Upserts on (event, node, role), so rewriting an event keeps unchanged participants in place: a
// plain delete-then-insert in one statement would hit the unique key, because the statements of
// one query run against the same snapshot in no fixed order.
const participantInsert = (eventId: string, input: EventInput, from: string) => sql`
  insert into history.event_participant (event_id, node_id, role, side, note, sort_order)
  select ${eventId}::uuid, x.node_id, x.role, x.side, x.note, x.sort
  from jsonb_to_recordset(${participantRows(input)}::jsonb) as x(
    node_id uuid, role text, side smallint, note text, sort int),
    ${sql.raw(from)}
  on conflict (event_id, node_id, role)
  do update set side = excluded.side, note = excluded.note, sort_order = excluded.sort_order`;

export async function createEvent(input: EventInput) {
  await assertEventRefs(input);
  // One statement after one slug lookup, like createPerson and createPolity.
  const id = randomUUID();
  const slug = await uniqueSlug(input.names);
  const start = dateInsert(input.start);
  const end = dateInsert(input.end);
  await db.execute(sql`
    with created as (
      insert into kg.node (id, kind, slug, body, review_state)
      values (${id}::uuid, 'event', ${slug}, ${input.body}, 'approved') returning id)
    ${start.insert ? sql`, start_date as (${start.insert})` : sql``}
    ${end.insert ? sql`, end_date as (${end.insert})` : sql``},
    event_row as (
      insert into history.event (id, event_type, summary, outcome, start_id, end_id, place_id,
                                 parent_event_id)
      select id, ${input.eventType}, ${input.summary}, ${input.outcome}, ${start.id}::uuid,
             ${end.id}::uuid, ${input.placeId ?? null}::uuid, ${input.parentEventId ?? null}::uuid
      from created
      returning id),
    ${sql.join(nameAttributeCtes(id, input.names, [], "created"), sql`, `)},
    participants as (${participantInsert(id, input, "event_row")})
    select id from created`);
  return { id, slug };
}

export async function updateEvent(id: string, input: EventInput) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("sự kiện");
  await assertEventRefs(input, id);
  const live = sql`exists (
    select 1 from kg.node n join history.event e on e.id = n.id
    where n.id = ${id}::uuid and n.deleted_at is null)`;
  const start = dateInsert(input.start, live);
  const end = dateInsert(input.end, live);
  const [result] = await db.execute<{ updated: number }>(sql`
    with old as (select start_id, end_id from history.event where id = ${id}::uuid)
    ${start.insert ? sql`, start_date as (${start.insert})` : sql``}
    ${end.insert ? sql`, end_date as (${end.insert})` : sql``},
    upd as (
      update history.event set event_type = ${input.eventType}, summary = ${input.summary},
        outcome = ${input.outcome}, start_id = ${start.id}::uuid, end_id = ${end.id}::uuid,
        place_id = ${input.placeId ?? null}::uuid,
        parent_event_id = ${input.parentEventId ?? null}::uuid
      where id = ${id}::uuid and ${live} returning id),
    node_upd as (
      update kg.node set updated_at = now()${input.body !== undefined ? sql`, body = ${input.body}` : sql``}
      where id in (select id from upd)),
    ${sql.join(nameAttributeCtes(id, input.names, [], "upd"), sql`, `)},
    parts_del as (
      delete from history.event_participant ep
      where ep.event_id = ${id}::uuid and exists (select 1 from upd)
        and not exists (
          select 1 from jsonb_to_recordset(${participantRows(input)}::jsonb) as x(
            node_id uuid, role text)
          where x.node_id = ep.node_id and x.role = ep.role)),
    parts_ins as (${participantInsert(id, input, "upd")}),
    gone_dates as (
      delete from kg.fuzzy_date
      where id in (select start_id from old union select end_id from old)
        and exists (select 1 from upd))
    select count(*)::int as updated from upd`);
  if (!result?.updated) throw notFound("sự kiện");
}

export async function deleteEvent(id: string) {
  await softDeleteNode(id, "event");
}
