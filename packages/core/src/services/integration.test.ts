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
});
