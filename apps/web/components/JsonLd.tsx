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
