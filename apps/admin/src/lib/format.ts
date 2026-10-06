import type { DateInput, DateValue } from "./types";

export const sexLabels: Record<string, string> = { male: "Nam", female: "Nữ", unknown: "Không rõ" };
export const historicityLabels: Record<string, string> = {
  historical: "Có thật",
  semi_legendary: "Bán huyền thoại",
  legendary: "Huyền thoại",
};

export const toDateInput = (value: DateValue | null | undefined): DateInput | null =>
  value
    ? {
        year: value.year,
        month: value.month,
        day: value.day,
        approximate: value.approximate,
        calendar: value.calendar,
      }
    : null;

export const lifeSpan = (birth: DateValue | null, death: DateValue | null) =>
  birth || death ? `${birth?.label ?? "?"} – ${death?.label ?? "?"}` : "";

// Suggested sub-kinds for the families of relationship that have them. Other types use free text.
export const variantOptions: Record<string, { code: string; label: string }[]> = {
  parent_of: [
    { code: "biological", label: "Ruột" },
    { code: "adoptive", label: "Nuôi" },
    { code: "step", label: "Kế" },
  ],
  spouse_of: [
    { code: "marriage", label: "Hôn nhân" },
    { code: "principal", label: "Chính thất" },
    { code: "political", label: "Hôn nhân chính trị" },
    { code: "concubine", label: "Thứ phi / hầu" },
    { code: "partnership", label: "Quan hệ khác" },
  ],
};
// child_of is the other side of parent_of and shares its variants.
variantOptions.child_of = variantOptions.parent_of!;

export const categoryLabels: Record<string, string> = {
  family: "Gia đình",
  politics: "Chính trị",
  personal: "Cá nhân",
  other: "Khác",
};

export const nodeKindLabels: Record<string, string> = { person: "Nhân vật", polity: "Chính thể" };

// Importance of a relationship (1-5), most important first; used by every importance picker.
export const importanceLevels: [number, string][] = [
  [5, "Cốt lõi (luôn hiện)"],
  [4, "Quan trọng"],
  [3, "Thông thường"],
  [2, "Phụ"],
  [1, "Rất phụ"],
];

// Kinds of place offered in the place form (the API accepts any lowercase code).
export const placeTypes: [string, string][] = [
  ["city", "Thành phố / thị trấn"],
  ["region", "Vùng"],
  ["province", "Tỉnh / bang"],
  ["country", "Quốc gia / lãnh thổ"],
  ["river", "Sông"],
  ["mountain", "Núi"],
  ["battlefield", "Chiến trường"],
  ["fortress", "Thành luỹ / pháo đài"],
  ["other", "Khác"],
];

// How well attested a relation or tenure is, from the editor's reading of the sources.
export const confidenceLevels: [number, string][] = [
  [1, "Phỏng đoán"],
  [2, "Ít chắc chắn"],
  [3, "Có thể tin"],
  [4, "Khá chắc chắn"],
  [5, "Được ghi nhận rõ"],
];
