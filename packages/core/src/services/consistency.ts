import { sql } from "drizzle-orm";
import { db } from "../db";

// Consistency checks (design doc 7.6): problems the data can contain even though every write is
// validated, because it also arrives through scripts and older versions. Each check is one query;
// they run together and each reports at most MAX_PER_CHECK examples plus its true count.

export type ConsistencySeverity = "error" | "warning" | "info";

export type ConsistencyCheck =
  | "ancestor_cycle"
  | "parent_born_after_child"
  | "parent_died_before_conception"
  | "death_before_birth"
  | "tenure_ends_before_start"
  | "overlapping_tenures"
  | "node_without_source";

export type ConsistencyIssue = {
  check: ConsistencyCheck;
  severity: ConsistencySeverity;
  message: string;
  /** The people or polities involved, so the admin can open them. */
  nodes: { id: string; kind: "person" | "polity"; name: string }[];
};

export type ConsistencyReport = {
  generatedAt: string;
  /** True count per check, which can be larger than the examples listed. */
  counts: Record<ConsistencyCheck, number>;
  issues: ConsistencyIssue[];
};

const MAX_PER_CHECK = 100;
// A child can be born after the father's death (about nine months), but not much later.
const GESTATION_DAYS = 300;

type NodeCell = { id: string; kind: "person" | "polity"; name: string };
type Row = { total: number; nodes: NodeCell[]; detail?: string | null };

// Every check returns one row per problem with its involved nodes as JSON, plus the total count of
// problems (the same on every row), so the count stays true while the examples are capped.
const nodeJson = (alias: string, name: string) =>
  sql`jsonb_build_object('id', ${sql.raw(alias)}.id, 'kind', ${sql.raw(alias)}.kind, 'name', ${sql.raw(name)})`;

async function run(query: ReturnType<typeof sql>): Promise<Row[]> {
  return db.execute<Row>(query);
}

// parent_of is stored parent -> child; a cycle means someone is their own ancestor. Found as the
// strongly connected components (Tarjan, iterative) of the graph of live parent -> child links, so
// a family with many overlapping lines costs one pass instead of enumerating every path.
async function findAncestorCycles(): Promise<Row[]> {
  const edges = await db.execute<{ a: string; b: string }>(
    sql`select r.from_id as a, r.to_id as b from kg.relation r
        join kg.node f on f.id = r.from_id and f.deleted_at is null
        join kg.node t on t.id = r.to_id and t.deleted_at is null
        where r.type = 'parent_of'`,
  );
  const next = new Map<string, string[]>();
  for (const e of edges) next.set(e.a, [...(next.get(e.a) ?? []), e.b]);

  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const inCycle = new Set<string>();
  let counter = 0;
  for (const root of next.keys()) {
    if (index.has(root)) continue;
    // Each frame is a node and how many of its children were already visited.
    const frames: { id: string; child: number }[] = [{ id: root, child: 0 }];
    index.set(root, counter);
    low.set(root, counter++);
    stack.push(root);
    onStack.add(root);
    while (frames.length) {
      const frame = frames[frames.length - 1]!;
      const children = next.get(frame.id) ?? [];
      if (frame.child < children.length) {
        const w = children[frame.child++]!;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter++);
          stack.push(w);
          onStack.add(w);
          frames.push({ id: w, child: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(w)!));
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!));
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== frame.id);
        // A one-node component is a cycle only when the node is its own parent.
        if (component.length > 1 || (next.get(frame.id) ?? []).includes(frame.id)) {
          for (const id of component) inCycle.add(id);
        }
      }
    }
  }
  if (!inCycle.size) return [];
  const ids = [...inCycle];
  const named = await db.execute<NodeCell>(
    sql`select n.id, n.kind, pn.name from kg.node n
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        where n.id in (${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})
        order by pn.name limit ${MAX_PER_CHECK}`,
  );
  return named.map((n) => ({ total: ids.length, nodes: [n] }));
}

export async function runConsistencyCheck(): Promise<ConsistencyReport> {
  const [cycles, parentAfterChild, parentDied, deathBeforeBirth, tenureOrder, overlaps, unsourced] =
    await Promise.all([
      findAncestorCycles(),
      run(sql`
        with bad as (
          select p.id pid, p.kind pkind, pm.name pname, c.id cid, c.kind ckind, cm.name cname
          from kg.relation r
          join kg.node p on p.id = r.from_id and p.deleted_at is null
          join kg.node c on c.id = r.to_id and c.deleted_at is null
          join kg.name pm on pm.node_id = p.id and pm.is_primary
          join kg.name cm on cm.node_id = c.id and cm.is_primary
          join history.person_date pb on pb.person_id = p.id and pb.kind = 'birth' and pb.is_preferred
          join kg.fuzzy_date pbd on pbd.id = pb.date_id
          join history.person_date cb on cb.person_id = c.id and cb.kind = 'birth' and cb.is_preferred
          join kg.fuzzy_date cbd on cbd.id = cb.date_id
          where r.type = 'parent_of' and pbd.earliest_jdn > cbd.latest_jdn)
        select (select count(*)::int from bad) as total,
               jsonb_build_array(
                 jsonb_build_object('id', pid, 'kind', pkind, 'name', pname),
                 jsonb_build_object('id', cid, 'kind', ckind, 'name', cname)) as nodes
        from bad order by pname limit ${MAX_PER_CHECK}`),
      run(sql`
        with bad as (
          select p.id pid, p.kind pkind, pm.name pname, c.id cid, c.kind ckind, cm.name cname
          from kg.relation r
          join kg.node p on p.id = r.from_id and p.deleted_at is null
          join kg.node c on c.id = r.to_id and c.deleted_at is null
          join kg.name pm on pm.node_id = p.id and pm.is_primary
          join kg.name cm on cm.node_id = c.id and cm.is_primary
          join history.person_date pd on pd.person_id = p.id and pd.kind = 'death' and pd.is_preferred
          join kg.fuzzy_date pdd on pdd.id = pd.date_id
          join history.person_date cb on cb.person_id = c.id and cb.kind = 'birth' and cb.is_preferred
          join kg.fuzzy_date cbd on cbd.id = cb.date_id
          where r.type = 'parent_of' and r.variant is distinct from 'adoptive'
            and pdd.latest_jdn + ${GESTATION_DAYS} < cbd.earliest_jdn)
        select (select count(*)::int from bad) as total,
               jsonb_build_array(
                 jsonb_build_object('id', pid, 'kind', pkind, 'name', pname),
                 jsonb_build_object('id', cid, 'kind', ckind, 'name', cname)) as nodes
        from bad order by pname limit ${MAX_PER_CHECK}`),
      run(sql`
        with bad as (
          select n.id, n.kind, pn.name
          from history.person p
          join kg.node n on n.id = p.id and n.deleted_at is null
          join kg.name pn on pn.node_id = n.id and pn.is_primary
          join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
          join kg.fuzzy_date bd on bd.id = b.date_id
          join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
          join kg.fuzzy_date dd on dd.id = d.date_id
          where bd.earliest_jdn > dd.latest_jdn)
        select (select count(*)::int from bad) as total,
               jsonb_build_array(${nodeJson("bad", "bad.name")}) as nodes
        from bad order by bad.name limit ${MAX_PER_CHECK}`),
      run(sql`
        with bad as (
          select n.id, n.kind, pn.name, q.name qname, q.id qid, q.kind qkind
          from history.tenure t
          join kg.node n on n.id = t.person_id and n.deleted_at is null
          join kg.name pn on pn.node_id = n.id and pn.is_primary
          left join (
            select qn.id, qn.kind, qm.name from kg.node qn
            join kg.name qm on qm.node_id = qn.id and qm.is_primary where qn.deleted_at is null) q
            on q.id = t.polity_id
          join kg.fuzzy_date sd on sd.id = t.start_id
          join kg.fuzzy_date ed on ed.id = t.end_id
          where sd.earliest_jdn > ed.latest_jdn)
        select (select count(*)::int from bad) as total,
               case when bad.qid is null then jsonb_build_array(${nodeJson("bad", "bad.name")})
                    else jsonb_build_array(${nodeJson("bad", "bad.name")},
                      jsonb_build_object('id', bad.qid, 'kind', bad.qkind, 'name', bad.qname)) end as nodes
        from bad order by bad.name limit ${MAX_PER_CHECK}`),
      // Two people holding the same sovereign office of the same polity over the same time.
      run(sql`
        with bad as (
          select a.person_id aid, am.name aname, b.person_id bid, bm.name bname,
                 q.id qid, qm.name qname, a.office_type
          from history.tenure a
          join history.tenure b on b.polity_id = a.polity_id and b.office_type = a.office_type
            and b.person_id <> a.person_id and a.id < b.id
          join history.office_type ot on ot.code = a.office_type and ot.is_sovereign
          join kg.fuzzy_date asd on asd.id = a.start_id
          join kg.fuzzy_date aed on aed.id = a.end_id
          join kg.fuzzy_date bsd on bsd.id = b.start_id
          join kg.fuzzy_date bed on bed.id = b.end_id
          join kg.node an on an.id = a.person_id and an.deleted_at is null
          join kg.node bn on bn.id = b.person_id and bn.deleted_at is null
          join kg.node q on q.id = a.polity_id and q.deleted_at is null
          join kg.name am on am.node_id = a.person_id and am.is_primary
          join kg.name bm on bm.node_id = b.person_id and bm.is_primary
          join kg.name qm on qm.node_id = q.id and qm.is_primary
          where not a.disputed and not b.disputed
            and asd.earliest_jdn < bed.latest_jdn and bsd.earliest_jdn < aed.latest_jdn
            -- Reigns that merely share the changeover year are not an overlap.
            and asd.latest_jdn < bed.earliest_jdn and bsd.latest_jdn < aed.earliest_jdn)
        select (select count(*)::int from bad) as total,
               jsonb_build_array(
                 jsonb_build_object('id', aid, 'kind', 'person', 'name', aname),
                 jsonb_build_object('id', bid, 'kind', 'person', 'name', bname),
                 jsonb_build_object('id', qid, 'kind', 'polity', 'name', qname)) as nodes,
               office_type as detail
        from bad order by qname limit ${MAX_PER_CHECK}`),
      // Facts with no citation at all: people and polities (the relationship and tenure facts hang
      // off them, so listing the nodes is enough to act on).
      run(sql`
        with bad as (
          select n.id, n.kind, pn.name
          from kg.node n
          join kg.name pn on pn.node_id = n.id and pn.is_primary
          where n.deleted_at is null and n.kind in ('person', 'polity')
            and not exists (
              select 1 from kg.citation c where c.subject_id = n.id
                or c.subject_id in (select r.id from kg.relation r where n.id in (r.from_id, r.to_id))
                or c.subject_id in (select t.id from history.tenure t where n.id in (t.person_id, t.polity_id))))
        select (select count(*)::int from bad) as total,
               jsonb_build_array(${nodeJson("bad", "bad.name")}) as nodes
        from bad order by bad.name limit ${MAX_PER_CHECK}`),
    ]);

  const counts: ConsistencyReport["counts"] = {
    ancestor_cycle: cycles[0]?.total ?? 0,
    parent_born_after_child: parentAfterChild[0]?.total ?? 0,
    parent_died_before_conception: parentDied[0]?.total ?? 0,
    death_before_birth: deathBeforeBirth[0]?.total ?? 0,
    tenure_ends_before_start: tenureOrder[0]?.total ?? 0,
    overlapping_tenures: overlaps[0]?.total ?? 0,
    node_without_source: unsourced[0]?.total ?? 0,
  };

  const issues: ConsistencyIssue[] = [];
  const add = (
    rows: Row[],
    check: ConsistencyCheck,
    severity: ConsistencySeverity,
    message: (r: Row) => string,
  ) => {
    for (const r of rows) issues.push({ check, severity, message: message(r), nodes: r.nodes });
  };
  add(cycles, "ancestor_cycle", "error", (r) => `${r.nodes[0]!.name} là tổ tiên của chính mình`);
  add(
    parentAfterChild,
    "parent_born_after_child",
    "error",
    (r) => `${r.nodes[0]!.name} sinh sau con là ${r.nodes[1]!.name}`,
  );
  add(
    parentDied,
    "parent_died_before_conception",
    "warning",
    (r) => `${r.nodes[0]!.name} mất hơn chín tháng trước khi ${r.nodes[1]!.name} ra đời`,
  );
  add(
    deathBeforeBirth,
    "death_before_birth",
    "error",
    (r) => `${r.nodes[0]!.name} có ngày mất trước ngày sinh`,
  );
  add(
    tenureOrder,
    "tenure_ends_before_start",
    "error",
    (r) =>
      `Nhiệm kỳ của ${r.nodes[0]!.name}${r.nodes[1] ? ` ở ${r.nodes[1].name}` : ""} kết thúc trước khi bắt đầu`,
  );
  add(
    overlaps,
    "overlapping_tenures",
    "warning",
    (r) =>
      `${r.nodes[0]!.name} và ${r.nodes[1]!.name} cùng giữ chức ${r.detail ?? ""} của ${r.nodes[2]!.name} trong cùng thời gian`,
  );
  add(
    unsourced,
    "node_without_source",
    "info",
    (r) => `${r.nodes[0]!.name} chưa có nguồn trích dẫn nào`,
  );
  return { generatedAt: new Date().toISOString(), counts, issues };
}
