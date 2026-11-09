<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Building UI: use the design system

Before writing or changing any UI, read `DESIGN.md` (repo root).

- Build new screens only from the primitives in `src/components/ui` (import from `@/components/ui`) and the colour tokens in `src/app/globals.css`.
- Never hard-code a hex value, and don't restyle a button, card, chip, input or progress bar inline. If no primitive fits, say so and propose a new variant or component instead of styling one-off markup.
- A new primitive or variant goes in `src/components/ui`, on the `/design-system` page, and in `DESIGN.md`, all in the same change.
- Product copy follows `PRODUCT.md` (voice, terminology, principles).
