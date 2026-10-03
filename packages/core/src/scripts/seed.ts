// Seeds the registry (lookup) tables the foreign keys depend on: `pnpm db:seed`.
// Safe to re-run: existing rows are left untouched.
import { sql as dsql } from "drizzle-orm";
import { db, sql } from "../db";
import * as kg from "../schema/kg";
import * as history from "../schema/history";

const nodeKinds = ["person", "polity"];

// code -> Vietnamese label, shown in the UI (kg.label, namespace = table name).
const nameKinds = {
  birth: "Tên húy",
  courtesy: "Tên tự",
  art: "Hiệu",
  posthumous: "Thụy hiệu",
  temple: "Miếu hiệu",
  common: "Tên thường gọi",
  alias: "Tên khác",
};
const polityTypes = {
  dynasty: "Triều đại",
  kingdom: "Vương quốc",
  empire: "Đế quốc",
  state: "Quốc gia",
  lordship: "Chính quyền chúa",
  republic: "Cộng hòa",
};
const officeTypes = {
  emperor: { label: "Hoàng đế", category: "ruler", isSovereign: true },
  king: { label: "Vua", category: "ruler", isSovereign: true },
  lord: { label: "Chúa", category: "ruler", isSovereign: false },
  regent: { label: "Nhiếp chính", category: "ruler", isSovereign: false },
  chancellor: { label: "Tể tướng", category: "court", isSovereign: false },
  general: { label: "Tướng quân", category: "military", isSovereign: false },
  mandarin: { label: "Quan lại", category: "court", isSovereign: false },
  other: { label: "Khác", category: "other", isSovereign: false },
} as const;
const successionModes = {
  hereditary: "Cha truyền con nối",
  abdication: "Nhường ngôi",
  usurpation: "Cướp ngôi",
  conquest: "Chinh phục",
  election: "Suy tôn / bầu chọn",
  appointment: "Bổ nhiệm",
};
// Relation types. Each inverse pair is two rows; only the primary one is ever stored on a
// relationship (the other is derived when reading), see kg.relation_type.is_primary.
type Kind = "person" | "polity";
const relationTypes: {
  code: string; label: string; inverse: string | null; symmetric: boolean; primary: boolean;
  acyclic?: boolean; category: string; subjects: Kind[]; objects: Kind[];
}[] = [
  { code: "parent_of", label: "Là cha/mẹ của", inverse: "child_of", symmetric: false, primary: true, acyclic: true, category: "family", subjects: ["person"], objects: ["person"] },
  { code: "child_of", label: "Là con của", inverse: "parent_of", symmetric: false, primary: false, category: "family", subjects: ["person"], objects: ["person"] },
  { code: "spouse_of", label: "Là vợ/chồng của", inverse: null, symmetric: true, primary: true, category: "family", subjects: ["person"], objects: ["person"] },
  { code: "sibling_of", label: "Là anh chị em của", inverse: null, symmetric: true, primary: true, category: "family", subjects: ["person"], objects: ["person"] },
  { code: "successor_of", label: "Kế vị", inverse: "predecessor_of", symmetric: false, primary: true, category: "politics", subjects: ["person"], objects: ["person"] },
  { code: "predecessor_of", label: "Tiền nhiệm của", inverse: "successor_of", symmetric: false, primary: false, category: "politics", subjects: ["person"], objects: ["person"] },
  { code: "teacher_of", label: "Là thầy của", inverse: "student_of", symmetric: false, primary: true, category: "personal", subjects: ["person"], objects: ["person"] },
  { code: "student_of", label: "Là học trò của", inverse: "teacher_of", symmetric: false, primary: false, category: "personal", subjects: ["person"], objects: ["person"] },
  { code: "friend_of", label: "Là bạn của", inverse: null, symmetric: true, primary: true, category: "personal", subjects: ["person"], objects: ["person"] },
  { code: "ally_of", label: "Là đồng minh của", inverse: null, symmetric: true, primary: true, category: "politics", subjects: ["person", "polity"], objects: ["person", "polity"] },
  { code: "rival_of", label: "Là đối thủ của", inverse: null, symmetric: true, primary: true, category: "politics", subjects: ["person", "polity"], objects: ["person", "polity"] },
  { code: "founder_of", label: "Là người sáng lập", inverse: "founded_by", symmetric: false, primary: true, category: "politics", subjects: ["person"], objects: ["polity"] },
  { code: "founded_by", label: "Được sáng lập bởi", inverse: "founder_of", symmetric: false, primary: false, category: "politics", subjects: ["polity"], objects: ["person"] },
  { code: "succeeded_by", label: "Được kế tục bởi", inverse: "succeeds", symmetric: false, primary: true, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "succeeds", label: "Kế tục", inverse: "succeeded_by", symmetric: false, primary: false, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "split_from", label: "Tách ra từ", inverse: "split_into", symmetric: false, primary: true, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "split_into", label: "Tách thành", inverse: "split_from", symmetric: false, primary: false, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "vassal_of", label: "Là chư hầu của", inverse: "suzerain_of", symmetric: false, primary: true, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "suzerain_of", label: "Là tông chủ của", inverse: "vassal_of", symmetric: false, primary: false, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "conquered", label: "Đã chinh phục", inverse: "conquered_by", symmetric: false, primary: true, category: "politics", subjects: ["polity"], objects: ["polity"] },
  { code: "conquered_by", label: "Bị chinh phục bởi", inverse: "conquered", symmetric: false, primary: false, category: "politics", subjects: ["polity"], objects: ["polity"] },
];
const attributeTypes = {
  hometown: "Quê quán",
  birth_place: "Nơi sinh",
  burial_place: "Nơi an táng",
  occupation: "Nghề nghiệp / chức danh",
  capital: "Kinh đô",
  national_title: "Quốc hiệu",
  territory: "Lãnh thổ",
  other: "Khác",
};
const calendars = {
  gregorian: "Dương lịch (Gregorian)",
  julian: "Lịch Julius",
  lunisolar_vi: "Âm lịch Việt Nam",
  lunisolar_cn: "Âm lịch Trung Quốc",
};

const labelRows: { namespace: string; code: string; text: string }[] = [];
const addLabels = (namespace: string, map: Record<string, string>) => {
  for (const [code, text] of Object.entries(map)) labelRows.push({ namespace, code, text });
};

await db.insert(kg.language).values([
  { code: "vi", name: "Tiếng Việt" },
  { code: "zh", name: "Tiếng Trung" },
  { code: "en", name: "Tiếng Anh" },
]).onConflictDoNothing();
await db.insert(kg.nodeKind).values(nodeKinds.map((code) => ({ code }))).onConflictDoNothing();
await db.insert(kg.nameKind).values(Object.keys(nameKinds).map((code) => ({ code }))).onConflictDoNothing();
await db.insert(kg.calendar).values(Object.entries(calendars).map(([code, name]) => ({ code, name }))).onConflictDoNothing();
await db.insert(history.polityType).values(Object.keys(polityTypes).map((code) => ({ code }))).onConflictDoNothing();
await db.insert(history.officeType).values(
  Object.entries(officeTypes).map(([code, o]) => ({ code, category: o.category, isSovereign: o.isSovereign })),
).onConflictDoNothing();
await db.insert(history.successionMode).values(Object.keys(successionModes).map((code) => ({ code }))).onConflictDoNothing();
for (const r of relationTypes) {
  const row = {
    code: r.code,
    category: r.category,
    inverseCode: r.inverse,
    isSymmetric: r.symmetric,
    isPrimary: r.primary,
    isAcyclic: r.acyclic ?? false,
    subjectKinds: r.subjects,
    objectKinds: r.objects,
  };
  await db.insert(kg.relationType).values(row).onConflictDoUpdate({ target: kg.relationType.code, set: row });
}
await db.insert(kg.attributeType).values(Object.keys(attributeTypes).map((code) => ({ code }))).onConflictDoNothing();

addLabels("name_kind", nameKinds);
addLabels("polity_type", polityTypes);
addLabels("office_type", Object.fromEntries(Object.entries(officeTypes).map(([c, o]) => [c, o.label])));
addLabels("succession_mode", successionModes);
addLabels("relation_type", Object.fromEntries(relationTypes.map((r) => [r.code, r.label])));
addLabels("attribute_type", attributeTypes);
addLabels("calendar", calendars);
await db
  .insert(kg.label)
  .values(labelRows.map((l) => ({ ...l, language: "vi" })))
  .onConflictDoUpdate({
    target: [kg.label.namespace, kg.label.code, kg.label.language],
    set: { text: dsql`excluded.text` },
  });

console.log("Seed done");
await sql.end();
