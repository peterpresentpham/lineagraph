import { z } from "zod";
import "./validation-messages";

// Shared by the API (request validation) and the admin forms.
export const dateInput = z.object({
  // 1 BCE is -1 and 1 CE is 1: there is no year 0.
  year: z
    .number()
    .int()
    .min(-9999)
    .max(9999)
    .refine((y) => y !== 0, "Không có năm 0: sau năm 1 TCN là năm 1"),
  month: z.number().int().min(1).max(12).nullish(),
  day: z.number().int().min(1).max(31).nullish(),
  approximate: z.boolean().default(false),
  // The calendar the source gives the date in (Gregorian when left out). Julian is for dates before
  // the Gregorian reform.
  calendar: z.enum(["gregorian", "julian"]).optional(),
});
export type DateInput = z.infer<typeof dateInput>;

// `year` is as entered (no year 0, 1 BCE = -1); leap years are counted on the astronomical year.
const isLeapYear = (year: number, calendar: "gregorian" | "julian") => {
  const y = year < 0 ? year + 1 : year;
  return calendar === "julian" ? y % 4 === 0 : (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
};
const daysInMonth = (year: number, m: number, calendar: "gregorian" | "julian") =>
  m === 2 ? (isLeapYear(year, calendar) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;

type MaybeDate = z.infer<typeof dateInput> | null | undefined;

// A date is a real calendar date: a day needs a month, and the day exists in that month.
function checkDate(date: MaybeDate, path: (string | number)[], ctx: z.RefinementCtx) {
  if (!date) return;
  if (date.day && !date.month) {
    ctx.addIssue({ code: "custom", path, message: "Nhập tháng khi đã nhập ngày" });
  } else if (
    date.day &&
    date.month &&
    date.day > daysInMonth(date.year, date.month, date.calendar ?? "gregorian")
  ) {
    ctx.addIssue({ code: "custom", path, message: "Ngày không tồn tại trong tháng này" });
  }
}

// The earliest and latest moment a (possibly month- or year-only) date can mean.
const earliest = (d: z.infer<typeof dateInput>) => [d.year, d.month ?? 1, d.day ?? 1] as const;
const latest = (d: z.infer<typeof dateInput>) => [d.year, d.month ?? 12, d.day ?? 31] as const;
const after = (a: readonly number[], b: readonly number[]) =>
  a[0]! !== b[0]! ? a[0]! > b[0]! : a[1]! !== b[1]! ? a[1]! > b[1]! : a[2]! > b[2]!;

// Both dates valid, and `from` is not later than `to` (only when both are known).
function checkRange(
  from: MaybeDate,
  to: MaybeDate,
  paths: { from: (string | number)[]; to: (string | number)[] },
  message: string,
  ctx: z.RefinementCtx,
) {
  checkDate(from, paths.from, ctx);
  checkDate(to, paths.to, ctx);
  if (from && to && after(earliest(from), latest(to))) {
    ctx.addIssue({ code: "custom", path: paths.to, message });
  }
}

const optionalDate = dateInput.nullish();
const text = (max = 4000) => z.string().trim().max(max);
const optionalText = (max = 4000) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const nameInput = z.object({
  name: text(200).min(1, "Tên không được để trống"),
  kind: z.string().min(1).default("common"),
  language: z.string().nullish(),
  // Writing system when it matters ("Hant" for traditional Chinese, "Cyrl", "Arab"...).
  script: z.string().trim().max(20).nullish(),
  isPrimary: z.boolean().default(false),
});

export const attributeInput = z.object({
  type: z.string().min(1, "Chọn loại thông tin"),
  value: text(1000).min(1, "Giá trị không được để trống"),
});
export type AttributeInput = z.infer<typeof attributeInput>;

const attributes = z.array(attributeInput).default([]);

const names = z
  .array(nameInput)
  .min(1, "Cần ít nhất một tên")
  .superRefine((list, ctx) => {
    if (list.filter((n) => n.isPrimary).length !== 1) {
      ctx.addIssue({ code: "custom", message: "Cần đúng một tên chính" });
    }
  });

export const personInput = z
  .object({
    names,
    sex: z.enum(["male", "female", "unknown"]).default("unknown"),
    historicity: z.enum(["historical", "semi_legendary", "legendary"]).default("historical"),
    summary: optionalText(),
    body: optionalText(50000),
    attributes,
    birth: optionalDate,
    death: optionalDate,
    birthPlaceId: z.string().uuid().nullish(),
    deathPlaceId: z.string().uuid().nullish(),
  })
  .superRefine((p, ctx) =>
    checkRange(
      p.birth,
      p.death,
      { from: ["birth"], to: ["death"] },
      "Ngày mất không thể trước ngày sinh",
      ctx,
    ),
  );
export type PersonInput = z.infer<typeof personInput>;

export const placeInput = z
  .object({
    name: text(200).min(1, "Tên địa điểm không được để trống"),
    // The larger place this one lies in (a city's province).
    parentId: z.string().uuid().nullish(),
    placeType: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]*$/, "Loại địa điểm chỉ gồm chữ thường, số, gạch dưới")
      .nullish()
      .transform((v) => v || null),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    note: optionalText(),
  })
  .superRefine((p, ctx) => {
    if ((p.latitude == null) !== (p.longitude == null)) {
      ctx.addIssue({ code: "custom", path: ["longitude"], message: "Nhập cả vĩ độ lẫn kinh độ" });
    }
  });
export type PlaceInput = z.infer<typeof placeInput>;

export const eventParticipantInput = z.object({
  nodeId: z.string().uuid("Chọn người hoặc chính thể tham gia"),
  role: z.string().min(1, "Chọn vai trò"),
  // Groups the sides of a war or treaty: 1 = one party, 2 = the other, ...
  side: z.number().int().min(1).max(20).nullish(),
  note: optionalText(500),
});
export type EventParticipantInput = z.infer<typeof eventParticipantInput>;

export const eventInput = z
  .object({
    names,
    eventType: z.string().min(1, "Chọn loại sự kiện"),
    summary: optionalText(),
    outcome: optionalText(2000),
    body: optionalText(50000),
    start: optionalDate,
    end: optionalDate,
    placeId: z.string().uuid().nullish(),
    parentEventId: z.string().uuid().nullish(),
    participants: z.array(eventParticipantInput).max(200).default([]),
  })
  .superRefine((e, ctx) => {
    checkRange(
      e.start,
      e.end,
      { from: ["start"], to: ["end"] },
      "Ngày kết thúc không thể trước ngày bắt đầu",
      ctx,
    );
    const seen = new Set<string>();
    e.participants.forEach((p, i) => {
      const key = `${p.nodeId}|${p.role}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["participants", i, "role"],
          message: "Người này đã có vai trò đó trong sự kiện",
        });
      }
      seen.add(key);
    });
  });
export type EventInput = z.infer<typeof eventInput>;

export const polityInput = z
  .object({
    names,
    polityType: z.string().min(1, "Chọn loại chính thể"),
    summary: optionalText(),
    body: optionalText(50000),
    attributes,
    started: optionalDate,
    ended: optionalDate,
  })
  .superRefine((p, ctx) =>
    checkRange(
      p.started,
      p.ended,
      { from: ["started"], to: ["ended"] },
      "Ngày kết thúc không thể trước ngày bắt đầu",
      ctx,
    ),
  );
export type PolityInput = z.infer<typeof polityInput>;

export const tenureInput = z
  .object({
    personId: z.string().uuid("Chọn nhân vật"),
    polityId: z.string().uuid().nullish(),
    officeType: z.string().min(1, "Chọn chức vụ"),
    successionMode: z
      .string()
      .nullish()
      .transform((v) => v || null),
    start: optionalDate,
    end: optionalDate,
    seq: z.number().int().min(1, "Thứ tự phải từ 1 trở lên").nullish(),
    disputed: z.boolean().default(false),
    // 1 (a guess) to 5 (well attested); `alternative` records a rival historian's version.
    confidence: z.number().int().min(1).max(5).nullish(),
    note: optionalText(),
    state: z.enum(["accepted", "alternative"]).default("accepted"),
    eras: z
      .array(
        z.object({
          name: text(100).min(1, "Niên hiệu không được để trống"),
          start: optionalDate,
          end: optionalDate,
        }),
      )
      .default([]),
  })
  .superRefine((t, ctx) => {
    checkRange(
      t.start,
      t.end,
      { from: ["start"], to: ["end"] },
      "Ngày kết thúc không thể trước ngày bắt đầu",
      ctx,
    );
    t.eras.forEach((era, i) =>
      checkRange(
        era.start,
        era.end,
        { from: ["eras", i, "start"], to: ["eras", i, "end"] },
        "Ngày kết thúc không thể trước ngày bắt đầu",
        ctx,
      ),
    );
  });
export type TenureInput = z.infer<typeof tenureInput>;

// A relationship between two nodes (person or polity). `type` may be either side of an
// inverse pair ("parent_of" or "child_of"); the service stores the primary one.
export const relationshipInput = z
  .object({
    type: z.string().min(1, "Chọn loại quan hệ"),
    fromId: z.string().uuid("Chọn đối tượng thứ nhất"),
    toId: z.string().uuid("Chọn đối tượng thứ hai"),
    variant: optionalText(40),
    label: optionalText(100),
    note: optionalText(),
    disputed: z.boolean().default(false),
    disputeNote: optionalText(),
    confidence: z.number().int().min(1).max(5).nullish(),
    // 1 (minor) to 5 (core): decides how early a graph view shows this link.
    // Left out on create, it starts from the relation type's default importance.
    importance: z.number().int().min(1).max(5).optional(),
    start: optionalDate,
    end: optionalDate,
  })
  .superRefine((r, ctx) =>
    checkRange(
      r.start,
      r.end,
      { from: ["start"], to: ["end"] },
      "Ngày kết thúc không thể trước ngày bắt đầu",
      ctx,
    ),
  );
export type RelationshipInput = z.infer<typeof relationshipInput>;

const nodeKinds = z.array(z.enum(["person", "polity"])).min(1, "Chọn ít nhất một loại đối tượng");

export const relationTypeInput = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Mã chỉ gồm chữ thường, số, gạch dưới"),
  label: text(100).min(1, "Nhãn không được để trống"),
  category: z.string().trim().min(1).default("other"),
  // Leave both empty for a symmetric relation ("là bạn của").
  inverseCode: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .nullish()
    .transform((v) => v || null),
  inverseLabel: optionalText(100),
  isSymmetric: z.boolean().default(false),
  isAcyclic: z.boolean().default(false),
  defaultImportance: z.number().int().min(1).max(5).default(3),
  subjectKinds: nodeKinds,
  objectKinds: nodeKinds,
});
export type RelationTypeInput = z.infer<typeof relationTypeInput>;

export const sourceInput = z.object({
  title: text(300).min(1, "Tiêu đề không được để trống"),
  author: optionalText(200),
  kind: optionalText(50),
  url: optionalText(500).refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "Đường dẫn phải bắt đầu bằng http:// hoặc https://",
  ),
  reliability: z.number().int().min(1).max(5).nullish(),
  // How the source may be reused, shown with every citation of it ("CC BY-SA 4.0", "Phạm vi công cộng").
  license: optionalText(100),
  note: optionalText(),
});
export type SourceInput = z.infer<typeof sourceInput>;

export const citationInput = z.object({
  subjectTable: z.enum(["person", "polity", "tenure", "relation", "event"]),
  subjectId: z.string().uuid(),
  sourceId: z.string().uuid("Chọn nguồn"),
  locator: optionalText(200),
  quote: optionalText(),
  confidence: z.number().int().min(1).max(5).default(3),
  // Whether the source backs the fact, disputes it, or only mentions it.
  stance: z.enum(["supports", "disputes", "mentions"]).default("supports"),
});
export type CitationInput = z.infer<typeof citationInput>;

export const registryInput = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Mã chỉ gồm chữ thường, số, gạch dưới"),
  label: text(100).min(1, "Nhãn không được để trống"),
});
