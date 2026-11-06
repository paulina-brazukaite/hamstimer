// An inline <script> that runs while the HTML is parsed (before first paint).
// From the Next 16 guide "Preventing flash before hydration": rendering it as
// text/plain on the client stops React's dev warning about <script> tags, and
// suppressHydrationWarning accepts the server/client `type` difference.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
