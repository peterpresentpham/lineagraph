import { transliterate } from "transliteration";

// Lowercases and strips diacritics, so "Lê Lợi" is searchable as "le loi". Names in other scripts
// are romanized ("Київ" -> "kiyiv", "秦始皇" -> "qin shi huang"), so they can be found and slugged
// too. Plain Latin text with diacritics takes the cheap path and never reaches the transliterator.
export function normalizeText(value: string): string {
  const stripped = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-\u007f]/.test(stripped)
    ? transliterate(stripped).toLowerCase().trim()
    : stripped;
}

export function slugify(value: string): string {
  return (
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** A LIKE pattern matching `value` anywhere, with `%`, `_` and `\` in it taken literally. */
export function likeContains(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

/** A LIKE pattern matching names that start with `value`. */
export function likePrefix(value: string): string {
  return `${value.replace(/[\\%_]/g, "\\$&")}%`;
}
