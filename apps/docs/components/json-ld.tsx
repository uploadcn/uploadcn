/**
 * Structured data for search and answer engines. `<` is escaped so a value
 * can never close the script tag (Next.js JSON-LD guide).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
