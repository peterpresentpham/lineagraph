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

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 15 -> "XV". Centuries are written in Roman numerals in Vietnamese ("thế kỷ XV"). */
export const toRoman = (n: number) => {
  let rest = Math.abs(Math.trunc(n));
  let out = "";
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
};

/** Century 15 -> "Thế kỷ XV"; century -5 -> "Thế kỷ V TCN". */
/** Century of a year with no year 0: years 1-100 are century 1, years -100..-1 are century -1. */
export const centuryOf = (year: number) =>
  year > 0 ? Math.ceil(year / 100) : -Math.ceil(Math.abs(year) / 100);

export const centuryLabel = (century: number) =>
  century > 0 ? `Thế kỷ ${toRoman(century)}` : `Thế kỷ ${toRoman(-century)} TCN`;

export const searchKindLabels: Record<string, string> = {
  person: "Nhân vật",
  polity: "Chính thể",
  event: "Sự kiện",
};
