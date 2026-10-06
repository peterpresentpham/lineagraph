import type { DateValue } from "./types";

export const sexLabels: Record<string, string> = { male: "Nam", female: "Nữ", unknown: "Không rõ" };
export const historicityLabels: Record<string, string> = {
  historical: "Có thật",
  semi_legendary: "Bán huyền thoại",
  legendary: "Huyền thoại",
};
export const categoryLabels: Record<string, string> = {
  family: "Gia đình",
  politics: "Chính trị",
  personal: "Cá nhân",
  other: "Khác",
};
export const variantLabels: Record<string, string> = {
  adoptive: "nuôi",
  step: "kế",
  concubine: "thứ phi / hầu",
  principal: "chính thất",
  political: "hôn nhân chính trị",
  partnership: "quan hệ khác",
};

export const lifeSpan = (birth: DateValue | null, death: DateValue | null) =>
  birth || death ? `${birth?.label ?? "?"} – ${death?.label ?? "?"}` : "";

export const confidenceLabels: Record<number, string> = {
  1: "phỏng đoán",
  2: "ít chắc chắn",
  3: "có thể tin",
  4: "khá chắc chắn",
  5: "được ghi nhận rõ",
};

/** A sortable number for a possibly partial date (year, then month, then day; BCE is negative). */
export const dateKey = (d: DateValue | null | undefined) =>
  d ? d.year * 10_000 + (d.month ?? 0) * 100 + (d.day ?? 0) : null;
