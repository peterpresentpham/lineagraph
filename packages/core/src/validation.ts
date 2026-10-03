import { z } from "zod";

// Shared by the API (request validation) and the admin forms.
export const dateInput = z.object({
  year: z.number().int().min(-3000).max(2100),
  month: z.number().int().min(1).max(12).nullish(),
  day: z.number().int().min(1).max(31).nullish(),
  approximate: z.boolean().default(false),
});
export type DateInput = z.infer<typeof dateInput>;

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

export const personInput = z.object({
  names,
  sex: z.enum(["male", "female", "unknown"]).default("unknown"),
  historicity: z.enum(["historical", "semi_legendary", "legendary"]).default("historical"),
  summary: optionalText(),
  body: optionalText(50000),
  attributes,
  birth: optionalDate,
  death: optionalDate,
});
export type PersonInput = z.infer<typeof personInput>;

export const polityInput = z.object({
  names,
  polityType: z.string().min(1, "Chọn loại chính thể"),
  summary: optionalText(),
  body: optionalText(50000),
  attributes,
  started: optionalDate,
  ended: optionalDate,
});
export type PolityInput = z.infer<typeof polityInput>;

export const tenureInput = z.object({
  personId: z.string().uuid("Chọn nhân vật"),
  polityId: z.string().uuid().nullish(),
  officeType: z.string().min(1, "Chọn chức vụ"),
  successionMode: z
    .string()
    .nullish()
    .transform((v) => v || null),
  start: optionalDate,
  end: optionalDate,
  seq: z.number().int().nullish(),
  eras: z
    .array(
      z.object({
        name: text(100).min(1, "Niên hiệu không được để trống"),
        start: optionalDate,
        end: optionalDate,
      }),
    )
    .default([]),
});
export type TenureInput = z.infer<typeof tenureInput>;

// A relationship between two nodes (person or polity). `type` may be either side of an
// inverse pair ("parent_of" or "child_of"); the service stores the primary one.
export const relationshipInput = z.object({
  type: z.string().min(1, "Chọn loại quan hệ"),
  fromId: z.string().uuid("Chọn đối tượng thứ nhất"),
  toId: z.string().uuid("Chọn đối tượng thứ hai"),
  variant: optionalText(40),
  label: optionalText(100),
  note: optionalText(),
  disputed: z.boolean().default(false),
  start: optionalDate,
  end: optionalDate,
});
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
  subjectKinds: nodeKinds,
  objectKinds: nodeKinds,
});
export type RelationTypeInput = z.infer<typeof relationTypeInput>;

export const sourceInput = z.object({
  title: text(300).min(1, "Tiêu đề không được để trống"),
  author: optionalText(200),
  kind: optionalText(50),
  url: optionalText(500),
  reliability: z.number().int().min(1).max(5).nullish(),
  note: optionalText(),
});
export type SourceInput = z.infer<typeof sourceInput>;

export const citationInput = z.object({
  subjectTable: z.enum(["person", "polity", "tenure", "relation"]),
  subjectId: z.string().uuid(),
  sourceId: z.string().uuid("Chọn nguồn"),
  locator: optionalText(200),
  quote: optionalText(),
  confidence: z.number().int().min(1).max(5).default(3),
});
export type CitationInput = z.infer<typeof citationInput>;

export const registryInput = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Mã chỉ gồm chữ thường, số, gạch dưới"),
  label: text(100).min(1, "Nhãn không được để trống"),
});
