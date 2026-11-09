// Structured data (schema.org JSON-LD) for search engines, per the Next 16 guide
// "JSON-LD". A plain <script>, not next/script: it's data, not code to run.
// `<` is escaped so a string in the data can't close the tag early.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
