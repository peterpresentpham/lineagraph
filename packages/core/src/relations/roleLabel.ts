import type { Sex } from "./kinship";

// "Là cha của" / "Là mẹ của" depending on who holds the role, instead of the relation type's
// neutral stored label ("Là cha/mẹ của"). Falls back to `fallback` when sex is unknown, or the
// type has no gendered phrasing (anything but parent_of / child_of / spouse_of).
export function sexAwareLabel(type: string, sex: Sex, fallback: string): string {
  if (type === "parent_of")
    return sex === "male" ? "Là cha của" : sex === "female" ? "Là mẹ của" : fallback;
  if (type === "child_of")
    return sex === "male" ? "Là con trai của" : sex === "female" ? "Là con gái của" : fallback;
  if (type === "spouse_of")
    return sex === "male" ? "Là chồng của" : sex === "female" ? "Là vợ của" : fallback;
  return fallback;
}
