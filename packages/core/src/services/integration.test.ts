import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Service tests against a real, migrated and seeded Postgres (never the shared one):
//   createdb lineagraph_test && DATABASE_URL=postgres://localhost/lineagraph_test pnpm db:migrate && pnpm db:seed
//   TEST_DATABASE_URL=postgres://localhost/lineagraph_test pnpm test
// Without TEST_DATABASE_URL the whole file is skipped.
const url = process.env.TEST_DATABASE_URL;

type Core = typeof import("../index");
let core: Core;
const created: { persons: string[]; polities: string[]; relations: string[] } = {
  persons: [],
  polities: [],
  relations: [],
};
const names = (name: string, ...aliases: string[]) => [
  { name, kind: "common", isPrimary: true },
  ...aliases.map((a) => ({ name: a, kind: "common", isPrimary: false })),
];

describe.skipIf(!url)("services against a real database", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    core = await import("../index");
  });

  afterAll(async () => {
    if (!core) return;
    // Best effort clean-up of what the tests created (links first: a node with links is kept).
    for (const id of created.relations) await core.deleteRelationship(id).catch(() => undefined);
    for (const id of created.persons) await core.deletePerson(id).catch(() => undefined);
    for (const id of created.polities) await core.deletePolity(id).catch(() => undefined);
    await core.sql.end();
  });

  const person = async (name: string, extra: object = {}) => {
    const p = await core.createPerson(core.personInput.parse({ names: names(name), ...extra }));
    created.persons.push(p.id);
    return p;
  };

  it("creates a person with names, dates and a unique slug, then updates it in place", async () => {
    const a = await person("Test Người Một", {
      birth: { year: 1400, month: 2 },
      death: { year: 1450 },
    });
    const b = await person("Test Người Một");
    // Same name, so the second slug is the first one with a numeric suffix (deleted nodes from
    // earlier runs keep their slugs, so compare against the shared base rather than "-2").
    expect(b.slug).not.toBe(a.slug);
    expect(b.slug.replace(/-\d+$/, "")).toBe(a.slug.replace(/-\d+$/, ""));

    let edit = await core.getPersonForEdit(a.id);
    expect(edit.birth?.label).toBe("2/1400");
    await core.updatePerson(
      a.id,
      core.personInput.parse({ names: names("Test Đổi Tên"), birth: { year: 1401 }, death: null }),
    );
    edit = await core.getPersonForEdit(a.id);
    expect(edit.names.map((n) => n.name)).toEqual(["Test Đổi Tên"]);
    expect(edit.birth?.label).toBe("1401");
    expect(edit.death).toBeNull();
  });

  it("reports an unknown id and never touches another kind's rows", async () => {
    const p = await person("Test Không Bị Xoá Tên");
    const missing = "00000000-0000-4000-8000-000000000000";
    const input = core.polityInput.parse({ names: names("X"), polityType: "state" });
    await expect(core.updatePolity(missing, input)).rejects.toMatchObject({ status: 404 });
    // A person's id given to the polity update must not delete the person's names.
    await expect(core.updatePolity(p.id, input)).rejects.toMatchObject({ status: 404 });
    expect((await core.getPersonForEdit(p.id)).names).toHaveLength(1);
  });

  it("refuses to delete a node that relationships still point at", async () => {
    const a = await person("Test Quan Hệ A");
    const b = await person("Test Quan Hệ B");
    const rel = await core.createRelationship(
      core.relationshipInput.parse({ type: "friend_of", fromId: a.id, toId: b.id }),
    );
    await expect(core.deletePerson(a.id)).rejects.toMatchObject({ status: 409 });
    await core.deleteRelationship(rel.id);
    await core.deletePerson(a.id);
    await expect(core.getPersonForEdit(a.id)).rejects.toMatchObject({ status: 404 });
  });

  it("starts a new relationship from its type's default importance", async () => {
    const a = await person("Test Điểm A");
    const b = await person("Test Điểm B");
    const rel = await core.createRelationship(
      core.relationshipInput.parse({ type: "successor_of", fromId: a.id, toId: b.id }),
    );
    expect((await core.getRelationshipForEdit(rel.id)).importance).toBe(5);
    await core.deleteRelationship(rel.id);
  });

  it("ranks exact matches before prefix and substring matches", async () => {
    await person("Zxq");
    await person("Zxq Dài Hơn");
    await person("Có Zxq Ở Giữa");
    const found = (await core.search("zxq")).map((r) => r.name);
    expect(found.slice(0, 3)).toEqual(["Zxq", "Zxq Dài Hơn", "Có Zxq Ở Giữa"]);
  });

  it("cleans up a tenure's dates and eras when it is replaced or deleted", async () => {
    const p = await person("Test Chức Vụ");
    const q = await core.createPolity(
      core.polityInput.parse({ names: names("Test Chính Thể"), polityType: "state" }),
    );
    created.polities.push(q.id);
    const counts = async () =>
      (
        await core.sql`select (select count(*)::int from kg.fuzzy_date) as d, (select count(*)::int from history.tenure_era) as e`
      )[0]!;
    const before = await counts();
    const t = await core.createTenure(
      core.tenureInput.parse({
        personId: p.id,
        polityId: q.id,
        officeType: "king",
        start: { year: 1428 },
        eras: [{ name: "Thuận Thiên", start: { year: 1428 }, end: { year: 1433 } }],
      }),
    );
    await core.updateTenure(
      t.id,
      core.tenureInput.parse({ personId: p.id, polityId: q.id, officeType: "king", eras: [] }),
    );
    expect(await counts()).toEqual(before);
    await core.deleteTenure(t.id);
    expect(await counts()).toEqual(before);
  });

  describe("consistency report", () => {
    const link = async (parent: string, child: string) => {
      const r = await core.createRelationship(
        core.relationshipInput.parse({ type: "parent_of", fromId: parent, toId: child }),
      );
      created.relations.push(r.id);
      return r.id;
    };

    it("flags a parent born after the child and a death before birth", async () => {
      const young = await person("Test Cha Sinh Muộn", { birth: { year: 1500 } });
      const old = await person("Test Con Sinh Sớm", { birth: { year: 1400 } });
      await link(young.id, old.id);
      const report = await core.runConsistencyCheck();
      const names = report.issues
        .filter((i) => i.check === "parent_born_after_child")
        .flatMap((i) => i.nodes.map((n) => n.name));
      expect(names).toContain("Test Cha Sinh Muộn");
      expect(report.counts.parent_born_after_child).toBeGreaterThanOrEqual(1);
    });

    it("finds a cycle of ancestors, even one the write checks would have refused", async () => {
      const a = await person("Test Vòng A");
      const b = await person("Test Vòng B");
      const c = await person("Test Vòng C");
      await link(a.id, b.id);
      await link(b.id, c.id);
      // The service refuses c -> a, so close the loop directly in the database.
      const [row] = await core.sql`
        insert into kg.relation (type, from_id, to_id, importance, state)
        values ('parent_of', ${c.id}, ${a.id}, 3, 'approved') returning id`;
      created.relations.push(row!.id as string);
      const report = await core.runConsistencyCheck();
      const looped = report.issues
        .filter((i) => i.check === "ancestor_cycle")
        .flatMap((i) => i.nodes.map((n) => n.name));
      expect(looped).toEqual(expect.arrayContaining(["Test Vòng A", "Test Vòng B", "Test Vòng C"]));
    });
  });

  describe("places", () => {
    it("nests places, sets a birthplace, and refuses to delete a place in use", async () => {
      const country = await core.createPlace(core.placeInput.parse({ name: "Test Nước" }));
      const city = await core.createPlace(
        core.placeInput.parse({
          name: "Test Thành",
          parentId: country.id,
          latitude: 21,
          longitude: 105,
        }),
      );
      expect((await core.getPlace(city.id)).parent?.name).toBe("Test Nước");

      // The country cannot be moved inside its own city.
      await expect(
        core.updatePlace(
          country.id,
          core.placeInput.parse({ name: "Test Nước", parentId: city.id }),
        ),
      ).rejects.toMatchObject({ status: 400 });

      const p = await person("Test Sinh Tại Thành", { birthPlaceId: city.id });
      expect((await core.getPersonForEdit(p.id)).birthPlaceName).toBe("Test Thành");
      await expect(core.deletePlace(city.id)).rejects.toMatchObject({ status: 409 });
      await expect(core.deletePlace(country.id)).rejects.toMatchObject({ status: 409 });

      await core.updatePerson(
        p.id,
        core.personInput.parse({ names: names("Test Sinh Tại Thành") }),
      );
      await core.deletePlace(city.id);
      await core.deletePlace(country.id);
      await expect(core.getPlace(city.id)).rejects.toMatchObject({ status: 404 });
      await expect(core.deletePlace(city.id)).rejects.toMatchObject({ status: 404 });
    });

    it("needs both coordinates or neither", () => {
      expect(core.placeInput.safeParse({ name: "x", latitude: 1 }).success).toBe(false);
      expect(core.placeInput.safeParse({ name: "x", latitude: 1, longitude: 2 }).success).toBe(
        true,
      );
    });
  });
  describe("events", () => {
    const polity = async (name: string) => {
      const p = await core.createPolity(
        core.polityInput.parse({ names: names(name), polityType: "state" }),
      );
      created.polities.push(p.id);
      return p;
    };

    it("stores an event with sides and replaces its participants in one statement", async () => {
      const a = await polity("Test Bên Một");
      const b = await polity("Test Bên Hai");
      const general = await person("Test Tướng");
      const input = (extra: object = {}) =>
        core.eventInput.parse({
          names: names("Test Trận Đánh"),
          eventType: "battle",
          start: { year: 1426, month: 10 },
          participants: [
            { nodeId: a.id, role: "belligerent", side: 1 },
            { nodeId: b.id, role: "belligerent", side: 2 },
            { nodeId: general.id, role: "commander", side: 1 },
          ],
          ...extra,
        });
      const e = await core.createEvent(input());
      let got = await core.getEvent(e.id);
      expect(got.participants).toHaveLength(3);
      expect(got.participants[0]!.side).toBe(1);
      expect(got.start?.label).toBe("10/1426");

      // The same participants again: delete and insert in one statement must not collide.
      await core.updateEvent(e.id, input({ outcome: "Bên một thắng" }));
      got = await core.getEvent(e.id);
      expect(got.outcome).toBe("Bên một thắng");
      expect(got.participants).toHaveLength(3);

      expect((await core.listEvents({ nodeId: general.id })).items.map((i) => i.id)).toEqual([
        e.id,
      ]);

      // A person in a live event cannot be deleted; once the event is gone, they can.
      await expect(core.deletePerson(general.id)).rejects.toMatchObject({ status: 409 });
      await core.deleteEvent(e.id);
      await expect(core.getEvent(e.id)).rejects.toMatchObject({ status: 404 });
      await core.deletePerson(general.id);
    });

    it("nests events and refuses loops, unknown participants and duplicate roles", async () => {
      const war = await core.createEvent(
        core.eventInput.parse({ names: names("Test Chiến Tranh"), eventType: "war" }),
      );
      const battle = await core.createEvent(
        core.eventInput.parse({
          names: names("Test Trận Con"),
          eventType: "battle",
          parentEventId: war.id,
        }),
      );
      expect((await core.getEvent(war.id)).children.map((c) => c.id)).toEqual([battle.id]);
      await expect(core.deleteEvent(war.id)).rejects.toMatchObject({ status: 409 });
      await expect(
        core.updateEvent(
          war.id,
          core.eventInput.parse({
            names: names("Test Chiến Tranh"),
            eventType: "war",
            parentEventId: battle.id,
          }),
        ),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        core.createEvent(
          core.eventInput.parse({
            names: names("Test Ma"),
            eventType: "battle",
            participants: [{ nodeId: crypto.randomUUID(), role: "commander" }],
          }),
        ),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        core.createEvent(
          core.eventInput.parse({
            names: names("Test Vai Sai"),
            eventType: "battle",
            participants: [{ nodeId: (await person("Test Người Vai Sai")).id, role: "nope" }],
          }),
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(
        core.eventInput.safeParse({
          names: names("x"),
          eventType: "battle",
          participants: [{ nodeId: crypto.randomUUID(), role: "commander" }],
        }).success,
      ).toBe(true);
      await core.deleteEvent(battle.id);
      await core.deleteEvent(war.id);
    });

    it("reports events without participants and participants outside their lifespan", async () => {
      const empty = await core.createEvent(
        core.eventInput.parse({ names: names("Test Sự Kiện Rỗng"), eventType: "other" }),
      );
      const early = await person("Test Người Mất Sớm", {
        birth: { year: 1300 },
        death: { year: 1350 },
      });
      const late = await core.createEvent(
        core.eventInput.parse({
          names: names("Test Sự Kiện Muộn"),
          eventType: "battle",
          start: { year: 1400 },
          participants: [{ nodeId: early.id, role: "commander" }],
        }),
      );
      const report = await core.runConsistencyCheck();
      expect(
        report.issues.some(
          (i) => i.check === "event_without_participants" && i.nodes[0]!.id === empty.id,
        ),
      ).toBe(true);
      expect(
        report.issues.some(
          (i) => i.check === "participant_outside_lifespan" && i.nodes[1]!.id === late.id,
        ),
      ).toBe(true);
      await core.deleteEvent(empty.id);
      await core.deleteEvent(late.id);
    });
  });

  it("keeps confidence and dispute notes on relations and alternative tenures", async () => {
    const a = await person("Test Cha Tin Cậy");
    const b = await person("Test Con Tin Cậy");
    const r = await core.createRelationship(
      core.relationshipInput.parse({
        type: "parent_of",
        fromId: a.id,
        toId: b.id,
        disputed: true,
        disputeNote: "Hai sử gia ghi khác nhau",
        confidence: 2,
      }),
    );
    created.relations.push(r.id);
    const got = await core.getRelationship(r.id);
    expect(got.confidence).toBe(2);
    expect(got.disputeNote).toBe("Hai sử gia ghi khác nhau");
    expect(
      core.relationshipInput.safeParse({
        type: "parent_of",
        fromId: a.id,
        toId: b.id,
        confidence: 9,
      }).success,
    ).toBe(false);
  });
  describe("admin lists", () => {
    it("restores a deleted person with its citations and keeps its slug", async () => {
      const p = await person("Test Người Hoàn Tác");
      const source = await core.createSource(core.sourceInput.parse({ title: "Test Nguồn" }));
      await core.createCitation(
        core.citationInput.parse({ subjectTable: "person", subjectId: p.id, sourceId: source.id }),
      );
      await core.deletePerson(p.id);
      await expect(core.getPerson(p.slug)).rejects.toMatchObject({ status: 404 });
      await core.restoreNode(p.id, "person");
      expect((await core.getPerson(p.slug)).name).toBe("Test Người Hoàn Tác");
      expect(await core.listCitations("person", p.id)).toHaveLength(1);
      // Restoring something that is not deleted (or the wrong kind) is a 404, not a silent no-op.
      await expect(core.restoreNode(p.id, "person")).rejects.toMatchObject({ status: 404 });
      await expect(core.restoreNode(p.id, "polity")).rejects.toMatchObject({ status: 404 });
    });

    it("filters people by sex, source and sorts by birth", async () => {
      const early = await person("Test Lọc Sớm", { sex: "female", birth: { year: 1200 } });
      const late = await person("Test Lọc Muộn", { sex: "female", birth: { year: 1500 } });
      const source = await core.createSource(core.sourceInput.parse({ title: "Test Nguồn Lọc" }));
      await core.createCitation(
        core.citationInput.parse({
          subjectTable: "person",
          subjectId: late.id,
          sourceId: source.id,
        }),
      );
      const ids = async (opts: Parameters<typeof core.listPersons>[0]) =>
        (await core.listPersons({ q: "Test Lọc", ...opts })).items.map((i) => i.id);
      expect(await ids({ sort: "birth" })).toEqual([early.id, late.id]);
      expect(await ids({ sex: "male" })).toEqual([]);
      expect(await ids({ sex: "female", noSource: true })).toEqual([early.id]);
      const total = (await core.listPersons({ q: "Test Lọc", noSource: true })).total;
      expect(total).toBe(1);
    });
  });
  describe("public reads", () => {
    it("groups the timeline by century and lists events in it", async () => {
      const tag = `Tl${Date.now()}`;
      const ev = await core.createEvent(
        core.eventInput.parse({
          names: names(`${tag} Trận`),
          eventType: "battle",
          start: { year: -480 },
        }),
      );
      const who = await person(`${tag} Người`, { birth: { year: 1428 } });
      const index = await core.getTimelineIndex();
      expect(index.find((i) => i.century === -5)?.count).toBeGreaterThanOrEqual(1);
      expect(index.find((i) => i.century === 15)?.count).toBeGreaterThanOrEqual(1);
      // Earliest first, BCE before CE.
      expect(index.map((i) => i.century)).toEqual(
        [...index.map((i) => i.century)].sort((a, b) => a - b),
      );

      const bce = await core.getTimeline({ century: -5 });
      expect(bce.some((e) => e.kind === "event" && e.slug === ev.slug)).toBe(true);
      expect(bce.some((e) => e.slug === who.slug)).toBe(false);
      const ce = await core.getTimeline({ century: 15 });
      expect(ce.some((e) => e.kind === "person" && e.slug === who.slug)).toBe(true);
      // Without a century it still returns at most `limit` entries.
      expect((await core.getTimeline({ limit: 1 })).length).toBe(1);
      await core.deleteEvent(ev.id);
    });

    it("narrows a search to the kinds asked for", async () => {
      const tag = `Kd${Date.now()}`;
      const ev = await core.createEvent(
        core.eventInput.parse({ names: names(`${tag} Hiệp ước`), eventType: "treaty" }),
      );
      const p = await person(`${tag} Người`);
      const all = await core.search(tag);
      expect(all.map((r) => r.kind).sort()).toEqual(["event", "person"]);
      const onlyPeople = await core.search(tag, core.parseSearchKinds(["person", "polity"]));
      expect(onlyPeople.map((r) => r.slug)).toEqual([p.slug]);
      // Unknown kinds are dropped rather than reaching the query.
      expect(core.parseSearchKinds(["x'; drop table"])).toEqual(["person", "polity", "event"]);
      await core.deleteEvent(ev.id);
    });

    it("lists a source in the bibliography only while it backs a live record, without notes", async () => {
      const tag = `Bib${Date.now()}`;
      const src = await core.createSource(
        core.sourceInput.parse({ title: `${tag} Sử`, license: "CC BY-SA 4.0", note: "nội bộ" }),
      );
      const unused = await core.listBibliography({ limit: 200 });
      expect(unused.items.some((s) => s.id === src.id)).toBe(false);

      const p = await person(`${tag} Người`);
      await core.createCitation(
        core.citationInput.parse({ subjectTable: "person", subjectId: p.id, sourceId: src.id }),
      );
      const used = await core.listBibliography({ limit: 200 });
      const entry = used.items.find((s) => s.id === src.id)!;
      expect(entry.citations).toBe(1);
      expect(entry.license).toBe("CC BY-SA 4.0");
      expect(JSON.stringify(entry)).not.toContain("nội bộ");

      await core.deletePerson(p.id);
      const afterDelete = await core.listBibliography({ limit: 200 });
      expect(afterDelete.items.some((s) => s.id === src.id)).toBe(false);
      expect((await core.listCitations("person", p.id))[0]?.source.license).toBe("CC BY-SA 4.0");
    });
  });
  it("opens an ego graph on weaker links when the core links leave it nearly empty", async () => {
    const tag = `Ego${Date.now()}`;
    const root = await person(`${tag} Gốc`);
    for (let i = 0; i < 4; i++) {
      const child = await person(`${tag} Con ${i}`);
      const rel = await core.createRelationship(
        core.relationshipInput.parse({
          type: "parent_of",
          fromId: root.id,
          toId: child.id,
          importance: 3,
        }),
      );
      created.relations.push(rel.id);
    }
    const auto = await core.getEgoGraph(root.id);
    expect(auto.nodes.length).toBe(5);
    expect(auto.minImportance).toBeLessThan(5);
    // A caller that asks for the core only gets exactly that.
    const core5 = await core.getEgoGraph(root.id, { minImportance: 5 });
    expect(core5.nodes.length).toBe(1);
    expect(core5.minImportance).toBe(5);
  });

  it("offers near matches for a typo, and lists entries dated to a year", async () => {
    const tag = `Zqv${Date.now()}`.toLowerCase();
    await person(`${tag} Trinhsam`, { birth: { year: 1111 } });
    expect(await core.search(`${tag} Trinhsm`)).toHaveLength(0);
    const near = await core.searchSimilar(`${tag} Trinhsm`);
    expect(near.map((r) => r.name)).toContain(`${tag} Trinhsam`);
    const inYear = await core.getTimeline({ year: 1111 });
    expect(inYear.some((e) => e.name === `${tag} Trinhsam`)).toBe(true);
    expect((await core.getTimeline({ year: 1112 })).some((e) => e.name.startsWith(tag))).toBe(
      false,
    );
  });

  it("finds people of the same time, and entries that fall on a given day of the year", async () => {
    const tag = `Zqw${Date.now()}`.toLowerCase();
    const a = await person(`${tag} Mot`, {
      birth: { year: 1236, month: 2, day: 29, calendar: "julian" },
      death: { year: 1290, month: 7, day: 4 },
    });
    await person(`${tag} Hai`, { birth: { year: 1250 }, death: { year: 1300 } });
    await person(`${tag} Ba`, { birth: { year: 1700 } });

    const next = await core.getReadNext(a.slug);
    const nearNames = next.contemporaries.map((r) => r.name);
    expect(nearNames).toContain(`${tag} Hai`);
    expect(nearNames).not.toContain(`${tag} Ba`);
    expect(nearNames).not.toContain(`${tag} Mot`);

    const born = (await core.getToday(2, 29)).find((e) => e.name === `${tag} Mot`);
    expect(born).toMatchObject({ type: "birth", kind: "person" });
    expect(born?.date.day).toBe(29);
    const died = (await core.getToday(7, 4)).find((e) => e.name === `${tag} Mot`);
    expect(died?.type).toBe("death");
    // A date known only to the year is not "on" any day.
    expect((await core.getToday(1, 1)).some((e) => e.name.startsWith(tag))).toBe(false);
    await expect(core.getReadNext("khong-co-nguoi-nay-zqw")).rejects.toMatchObject({
      status: 404,
    });
  });
});
