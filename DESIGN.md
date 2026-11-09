# BusyHamster design system

The shared language for the designer, the developer and AI agents. **The code is the source of truth:**
tokens live in `src/app/globals.css`, components in `src/components/ui/`, and the `/design-system` page shows
all of it in both themes. Figma mirrors the code, not the other way round.

- See it: `npm run dev`, then <http://localhost:3000/design-system>, or `/design-system` on any Vercel preview
  deployment. It returns 404 in production.
- Product context (users, voice, principles, terminology): `PRODUCT.md`.

## Principles

1. **The timer is the frame, the work is the subject.** The line you're on leads; chrome stays quiet.
2. **One loud thing per view.** At most one amber (`primary`) action on screen.
3. **Keyboard first.** Every action has a shortcut, shown with `shortcut=` / `<Kbd>` and hidden on touch screens.
4. **Both themes, always.** Only semantic tokens, so dark and light both work without extra effort.

## Tokens

Use the Tailwind class (`bg-surface`, `text-muted`, `border-line`…), never the hex value.

| Token | Use for |
| --- | --- |
| `ground` | Page background |
| `surface` | Cards, raised controls |
| `well` | Sunken areas: game stages, number inputs |
| `line` | Borders of controls and cards |
| `line-soft` | Dividers, progress tracks |
| `fg` | Primary text; the fill of `solid` buttons |
| `muted` | Secondary text |
| `faint` | Hints, metadata, placeholders, shortcuts |
| `lamp` | Amber fill (see below) |
| `lamp-fg` | Text on amber |
| `lamp-ink` | Amber as text. It's ink on light because yellow text fails contrast |
| `prop`, `prop-soft` | Objects in the hamster scene |

Shadow: `shadow-card`, only on things that arrive (`Card raised`).

**Amber (`lamp`) is rare on purpose.** Use it only for progress (`ProgressBar`, pomodoro dots, the clock on the
current line) and the one primary action of a moment (Resume, Done, the game's main button).

The hamster illustrations (`hamster-scene.tsx`, `src/lib/hamster3d/`) have their own fixed palette. They are
artwork and don't change with the theme, so they are the one place hex values are allowed.

## Type

One family, Schibsted Grotesk (`font-sans`). Geist Mono (`font-mono`) is only for code.

| Style | Classes | Used for |
| --- | --- | --- |
| Lead | `leadClass(text)` from `components/lead.ts` | The line you're on; steps down a size for long text |
| Clock | `text-6xl sm:text-[104px] font-medium tracking-[-0.055em] tabular-nums` | The timer |
| Page heading | `<PageHeading>` (`md`, or `lg` on reading pages) | The h1 of a page |
| Body | `text-[15px] text-fg` | Lines, card text, buttons (`lg`) |
| Reading | `text-[17px] leading-relaxed text-muted` | About, blog posts |
| Small | `text-sm` / `text-[13px]` | Controls, secondary numbers |
| Hint | `text-xs text-faint` | Metadata, shortcuts, captions |

Numbers that change (clock, counts, durations) always get `tabular-nums`.

## Components (`src/components/ui`)

Import from `@/components/ui`. Each component gets its look from `variant` / `size` props. Use `className` only
for layout (position, width, margin), never to change colour, padding or radius: classes aren't merged, so an
override isn't guaranteed to win. If you need a new look, add a variant.

### Button / ButtonLink

`<Button variant size shortcut>` for actions; `<ButtonLink href>` for navigation that looks like a button.

| Variant | When | Examples |
| --- | --- | --- |
| `primary` | The one main action of a moment. Max one per view | Resume, Done, Play again |
| `solid` | A strong action that isn't the amber one | Start / Pause, Add, Turn on |
| `secondary` | A real alternative, or a toolbar action | Stop, Export, Back to work |
| `outline` | A quiet alternative sitting next to a primary | Still on it, Finish task (resume card) |
| `ghost` | The least important action | Finish task (timer), No thanks |

| Size | Height | When |
| --- | --- | --- |
| `sm` | 36px | Inside a card or an input |
| `md` | 40px | Toolbars, prompts (default) |
| `lg` | 44px | A screen's main controls |
| `xl` | 48px | Big touch targets (games) |

- `shortcut="R"` shows the key after the label (hidden on touch screens). Give a shortcut to every button that has one.
- Disabled-but-explainable: use `aria-disabled` (stays focusable), not `disabled`.
- Focus ring is built in. Don't remove it.

### Card

A bordered `surface`. Padding is the caller's. `radius`: `md` 12px for inline panels (the "Done with this?" question, the menu),
`lg` 16px for prompts, `xl` 20px for the resume card, `2xl` 24px for media tiles. `raised` adds the shadow, for things
that arrive. `interactive` darkens the border on hover, for whole-card links (use `cardClass()` on a `<Link>`).

### Chip

Pick one from a small set (focus lengths). `selected` controls the look; the caller adds `role="radio"` +
`aria-checked` inside a `role="radiogroup"`.

### TextInput

`md`: a full-width boxed input ("What's next?"). `sm`: a number box inside a sentence ("Focus [50] min").
The big underlined first input and the task title are deliberately bespoke because they lead the screen. Don't copy them elsewhere.

### ProgressBar

Amber on `line-soft`, always decorative (the same information must be in text nearby). `xs` inside cards, `sm`
the full-width line at the top of the timer, `md` games.

### Small pieces

- `Kbd`: a shortcut hint. `tone="on-fill"` inside filled buttons, else `faint`. Hidden on touch.
- `TextLink`: a link inside running text.
- `PageHeading`: the page h1 + optional one-line description.
- `Stat`: "label value" in a `<dl>` row.
- `cn()`: joins class names (doesn't merge conflicting utilities).

## Product components

These are built from the primitives and tied to the product, so they live in `src/components/`, not `ui/`:
`ResumeCard`, `TaskView` (lines, line input, "Done with this?"), `Pomodoros` (dots), `PresetPicker`,
`CommandMenu`, `UndoToast`, `NotifyPrompt`, `AppHeader`, `SiteFooter`, `HamsterStage`. Reuse them rather than rebuilding them.

## Layout

- Page gutter `px-6` (`px-3` under 350px), `sm:px-10` for the header.
- Content widths: `max-w-xl` (task, about), `max-w-2xl` (history, blog, games), `max-w-4xl` (game picker).
- Screens anchor content near the top (`pt-2 sm:pt-6`), not vertically centred.
- Touch: `pointer-coarse:` hides keyboard hints; tap targets are at least 36px (`sm`), 44px for main controls.
- Motion: one animation in the product, `animate-rise-in` (things arriving), and it respects reduced motion.

## Adding to the system

1. **Propose:** the designer draws it (Figma "Proposed" page or a prototype branch) with all states and both themes,
   and checks it isn't just a variant of something here.
2. **Spec:** agree on the name, props, states, keyboard behaviour and tokens. The name is the same in code and Figma.
3. **Build:** add it to `src/components/ui/` (and `index.ts`), add it to the `/design-system` page, document it here.
   Then use it in the feature.
4. **Publish:** mirror it in the Figma library, mapped to the component, and remove any local copies.

Nothing ships that exists only in a feature's own markup or only in Figma.
