import type { DateValue } from "./types";

/**
 * ISO 8601 date for structured data. Years before 1 CE use the astronomical numbering ISO 8601
 * uses (1 BCE is year 0000, 44 BCE is -0043), written with a sign and four digits.
 */
export function isoDate(date: DateValue | null | undefined): string | null {
  if (!date) return null;
  const astronomical = date.year < 0 ? date.year + 1 : date.year;
  const y = `${astronomical < 0 ? "-" : ""}${String(Math.abs(astronomical)).padStart(4, "0")}`;
  if (date.month && date.day) {
    return `${y}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  }
  return date.month ? `${y}-${String(date.month).padStart(2, "0")}` : y;
}

/** BreadcrumbList for a record page: Trang chủ > section > the record. Paths are relative to the site. */
export function breadcrumbData(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Sử Phả", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path === "/" ? "" : item.path}`,
    })),
  };
}
