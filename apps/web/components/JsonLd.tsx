import type { DateValue } from "@/lib/types";

type Props = { data: Record<string, unknown> };

// Structured data for search engines. `<` is escaped so the JSON can never close its own script tag.
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** ISO 8601 date for structured data; null for years before 1 CE, which ISO years cannot express plainly. */
export function isoDate(date: DateValue | null | undefined): string | null {
  if (!date || date.year < 1) return null;
  const y = String(date.year).padStart(4, "0");
  if (date.month && date.day) {
    return `${y}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  }
  return date.month ? `${y}-${String(date.month).padStart(2, "0")}` : y;
}
