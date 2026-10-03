import { describe, expect, it } from "vitest";
import {
  describeKinship,
  kinshipSentence,
  type KinPerson,
  type ParentLink,
  type Sex,
} from "./kinship";

// Golden cases for the Vietnamese kinship terms (design doc section 7.7). The tree below is the
// early Hậu Lê royal line, plus invented relatives to cover the uncle / cousin / far cases.
const people = new Map<string, KinPerson>();
const person = (id: string, sex: Sex, birthYear: number | null = null) =>
  people.set(id, { id, sex, birthYear });
const links: ParentLink[] = [];
const parent = (
  parentId: string,
  childId: string,
  variant: string | null = "biological",
  disputed = false,
) => links.push({ parentId, childId, variant, disputed });

person("loi", "male", 1385);
person("thai-tong", "male", 1423);
person("nghi-dan", "male", 1439);
person("nhan-tong", "male", 1441);
person("thanh-tong", "male", 1442);
person("duong-thi-bi", "female", null); // mother of Nghi Dân
person("ngo-ngoc-dao", "female", null); // mother of Thánh Tông
parent("loi", "thai-tong");
parent("thai-tong", "nghi-dan");
parent("thai-tong", "nhan-tong");
parent("thai-tong", "thanh-tong");
parent("duong-thi-bi", "nghi-dan");
parent("ngo-ngoc-dao", "thanh-tong");

// Extra family: A's father and mother, their siblings, cousins.
person("g", "male", 1300); // common grandfather
person("p-elder", "male", 1330); // father's elder brother (bác)
person("p-younger", "male", 1340); // father's younger brother (chú)
person("p-sister", "female", 1335); // father's sister (cô)
person("father", "male", 1335);
person("a", "male", 1360);
person("cousin-older", "female", 1355);
person("mother-line-g", "female", 1305);
person("mother", "female", 1338);
person("m-brother", "male", 1340); // mother's brother (cậu)
person("m-sister", "female", 1342); // mother's sister (dì)
person("a-mom-side-cousin", "male", 1365);
for (const c of ["p-elder", "p-younger", "p-sister", "father"]) parent("g", c);
parent("father", "a");
parent("mother", "a");
parent("p-elder", "cousin-older");
for (const c of ["mother", "m-brother", "m-sister"]) parent("mother-line-g", c);
parent("m-brother", "a-mom-side-cousin");

const kin = (a: string, b: string, opts?: { includeDisputed?: boolean }) =>
  describeKinship(a, b, people, links, opts);

describe("lineal relatives", () => {
  it("Lê Lợi is the paternal grandfather of Lê Thánh Tông", () => {
    const k = kin("loi", "thanh-tong")!;
    expect(k.aIs).toBe("ông nội");
    expect(k.bIs).toBe("cháu nội");
    expect(kinshipSentence("Lê Lợi", "Lê Thánh Tông", k)).toBe(
      "Lê Lợi là ông nội của Lê Thánh Tông",
    );
  });

  it("parent and child", () => {
    const k = kin("thai-tong", "nhan-tong")!;
    expect([k.aIs, k.bIs]).toEqual(["cha", "con trai"]);
    const mother = kin("ngo-ngoc-dao", "thanh-tong")!;
    expect([mother.aIs, mother.bIs]).toEqual(["mẹ", "con trai"]);
  });

  it("maternal grandparents are ngoại", () => {
    const k = kin("mother-line-g", "a")!;
    expect(k.aIs).toBe("bà ngoại");
    expect(k.bIs).toBe("cháu ngoại");
  });

  it("great-grandparent and beyond", () => {
    expect(kin("g", "a")!.aIs).toBe("ông nội");
    const chain = new Map(people);
    const l: ParentLink[] = [];
    const ids = ["t0", "t1", "t2", "t3", "t4", "t5"];
    ids.forEach((id) => chain.set(id, { id, sex: "male", birthYear: null }));
    for (let i = 0; i < 5; i++)
      l.push({ parentId: ids[i]!, childId: ids[i + 1]!, variant: "biological", disputed: false });
    expect(describeKinship("t0", "t3", chain, l)!.aIs).toBe("cụ ông bên nội");
    expect(describeKinship("t0", "t4", chain, l)!.aIs).toBe("kỵ bên nội");
    const far = describeKinship("t0", "t5", chain, l)!;
    expect(far.aIs).toBe("tổ 5 đời");
    expect(far.note).toBe("theo dòng cha");
    expect(far.bIs).toBe("hậu duệ 5 đời");
  });
});

describe("collateral relatives", () => {
  it("half brothers share only the father", () => {
    const k = kin("nghi-dan", "thanh-tong")!;
    expect(k.aIs).toBe("anh");
    expect(k.bIs).toBe("em");
    expect(k.note).toBe("cùng cha khác mẹ");
  });

  it("a missing parent is unknown, not different: no half-sibling note", () => {
    const k = kin("nhan-tong", "thanh-tong")!;
    expect(k.aIs).toBe("anh");
    expect(k.note).toBeNull();
  });

  it("father's side: bác, chú, cô", () => {
    expect(kin("p-elder", "a")!.aIs).toBe("bác");
    expect(kin("p-younger", "a")!.aIs).toBe("chú");
    expect(kin("p-sister", "a")!.aIs).toBe("cô");
    expect(kin("a", "p-elder")!.aIs).toBe("cháu trai");
  });

  it("mother's side: cậu, dì", () => {
    expect(kin("m-brother", "a")!.aIs).toBe("cậu");
    expect(kin("m-sister", "a")!.aIs).toBe("dì");
  });

  it("first cousins, with age and side", () => {
    const paternal = kin("cousin-older", "a")!;
    expect(paternal.aIs).toBe("chị họ");
    expect(paternal.bIs).toBe("em họ");
    expect(paternal.note).toBe("con chú bác");
    const maternal = kin("a-mom-side-cousin", "a")!;
    expect(maternal.aIs).toBe("em họ");
    expect(maternal.note).toBe("con cô cậu dì");
  });

  it("distant relatives are 'cùng tổ N đời', by father's line when it is all male", () => {
    const tree = new Map<string, KinPerson>();
    const l: ParentLink[] = [];
    const add = (id: string, sex: Sex = "male") => tree.set(id, { id, sex, birthYear: null });
    ["root", "x1", "x2", "x3", "y1", "y2", "y3"].forEach((id) => add(id));
    for (const [p, c] of [
      ["root", "x1"],
      ["x1", "x2"],
      ["x2", "x3"],
      ["root", "y1"],
      ["y1", "y2"],
      ["y2", "y3"],
    ]) {
      l.push({ parentId: p!, childId: c!, variant: "biological", disputed: false });
    }
    const k = describeKinship("x3", "y3", tree, l)!;
    expect(k.aIs).toBe("họ hàng xa");
    expect(k.note).toBe("cùng tổ 3 đời theo dòng cha");
    expect(k.line).toBe("cha");
    // Make one ancestor female: the line becomes mixed and the note drops the side.
    tree.set("x2", { id: "x2", sex: "female", birthYear: null });
    expect(describeKinship("x3", "y3", tree, l)!.note).toBe("cùng tổ 3 đời");
  });
});

describe("edge cases", () => {
  it("unrelated people have no kinship", () => {
    expect(kin("loi", "a")).toBeNull();
  });

  it("the same person has none either", () => {
    expect(kin("loi", "loi")).toBeNull();
  });

  it("disputed parentage is ignored unless requested", () => {
    const disputed = [
      ...links,
      { parentId: "loi", childId: "a", variant: "biological", disputed: true },
    ];
    expect(describeKinship("loi", "a", people, links)).toBeNull();
    expect(describeKinship("loi", "a", people, disputed)).toBeNull();
    expect(describeKinship("loi", "a", people, disputed, { includeDisputed: true })!.aIs).toBe(
      "cha",
    );
  });

  it("adoptive parentage is flagged; step-parents are not blood", () => {
    const adopted = [{ parentId: "loi", childId: "a", variant: "adoptive", disputed: false }];
    expect(describeKinship("loi", "a", people, adopted)!.adoptive).toBe(true);
    const step = [{ parentId: "loi", childId: "a", variant: "step", disputed: false }];
    expect(describeKinship("loi", "a", people, step)).toBeNull();
  });
});
