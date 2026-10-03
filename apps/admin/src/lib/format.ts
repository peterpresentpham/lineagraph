import type { DateInput, DateValue } from "./types";

export const sexLabels: Record<string, string> = { male: "Nam", female: "Nữ", unknown: "Không rõ" };
export const historicityLabels: Record<string, string> = {
  historical: "Có thật",
  semi_legendary: "Bán huyền thoại",
  legendary: "Huyền thoại",
};

export const toDateInput = (value: DateValue | null | undefined): DateInput | null =>
  value ? { year: value.year, month: value.month, day: value.day, approximate: value.approximate } : null;

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
