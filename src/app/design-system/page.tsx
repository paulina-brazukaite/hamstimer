import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { leadClass } from "@/components/lead";
import { Pomodoros } from "@/components/task-view";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Kbd,
  PageHeading,
  ProgressBar,
  Stat,
  TextInput,
  TextLink,
  type ButtonSize,
  type ButtonVariant,
  type CardRadius,
} from "@/components/ui";
import { TokenValue } from "./token-value";

/**
 * The living reference for the design system: every token and primitive in
 * src/components/ui, in both themes side by side. Designers check here (or on a
 * Vercel preview) what exists before drawing something new; DESIGN.md explains
 * when to use each piece.
 *
 * Available locally and on preview deployments, never in production.
 */
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export const ensureStatic = "navigation";

const TOKENS: { name: string; use: string }[] = [
  { name: "ground", use: "Page background" },
  { name: "surface", use: "Cards, raised controls" },
  { name: "well", use: "Sunken areas: game stages, number inputs" },
  { name: "line", use: "Borders of controls and cards" },
  { name: "line-soft", use: "Dividers, progress track" },
  { name: "fg", use: "Primary text, solid button fill" },
  { name: "muted", use: "Secondary text" },
  { name: "faint", use: "Hints, metadata, placeholders" },
  { name: "lamp", use: "Amber fill. Progress, pomodoros, primary button only" },
  { name: "lamp-fg", use: "Text on amber" },
  { name: "lamp-ink", use: "Amber as text (ink on light: yellow fails contrast)" },
  { name: "prop", use: "Hamster scene objects" },
  { name: "prop-soft", use: "Hamster scene objects, softer" },
];

const VARIANTS: ButtonVariant[] = ["primary", "solid", "secondary", "outline", "ghost"];
const SIZES: ButtonSize[] = ["sm", "md", "lg", "xl"];
const RADII: CardRadius[] = ["md", "lg", "xl", "2xl"];

export default function DesignSystemPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-10">
      <PageHeading size="lg" description="Every token and primitive in src/components/ui, in both themes. When to use each: DESIGN.md.">
        Design system
      </PageHeading>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Theme name="dark" />
        <Theme name="light" />
      </div>
    </main>
  );
}

function Theme({ name }: { name: "dark" | "light" }) {
  return (
    <div data-theme={name} className="min-w-0 rounded-3xl border border-line bg-ground p-6 text-fg sm:p-8">
      <p className="text-xs font-semibold tracking-wide text-faint uppercase">{name}</p>

      <Section title="Colour tokens" note="Use the class, never the hex: bg-surface, text-muted, border-line…">
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {TOKENS.map((t) => (
            <li key={t.name} className="flex items-center gap-3">
              <span
                className="size-9 flex-none rounded-lg border border-line"
                style={{ background: `var(--${t.name})` }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <code className="font-mono text-[13px] text-fg">{t.name}</code>
                  <TokenValue name={t.name} />
                </span>
                <span className="block text-xs leading-snug text-muted">{t.use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type" note="Schibsted Grotesk for everything; Geist Mono only for code.">
        <div className="flex flex-col gap-4">
          <Specimen label="Lead · leadClass()">
            <p className={leadClass("Write the refresh handler")}>Write the refresh handler</p>
          </Specimen>
          <Specimen label="Clock · 104px medium, tabular">
            <p className="text-6xl leading-[0.9] font-medium tracking-[-0.055em] tabular-nums">24:56</p>
          </Specimen>
          <Specimen label="PageHeading lg / md">
            <PageHeading size="lg">About BusyHamster</PageHeading>
            <PageHeading description="Pick a game." className="mt-3">
              Tired?
            </PageHeading>
          </Specimen>
          <Specimen label="Body 15 · muted 15 · reading 17">
            <p className="text-[15px] text-fg">The line you were on is the first thing you see.</p>
            <p className="text-[15px] text-muted">3 of 5 lines done</p>
            <p className="text-[17px] leading-relaxed text-muted">Most timers are good at telling you to stop.</p>
          </Specimen>
          <Specimen label="Small 13 · hint xs faint">
            <p className="text-[13px] text-muted">2h 15m</p>
            <p className="text-xs text-faint">Where you left off · 2 hours ago</p>
          </Specimen>
        </div>
      </Section>

      <Section title="Button" note="variant × size. One primary per view.">
        <div className="flex flex-col gap-3">
          {VARIANTS.map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-2">
              <code className="w-20 flex-none font-mono text-xs text-faint">{v}</code>
              {SIZES.map((s) => (
                <Button key={s} variant={v} size={s}>
                  {s}
                </Button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="lg" shortcut="R">
            Resume
          </Button>
          <Button variant="outline" size="lg" shortcut="Esc">
            Finish task
          </Button>
          <Button variant="primary" aria-disabled>
            Disabled
          </Button>
          <ButtonLink href="/" variant="secondary">
            ButtonLink
          </ButtonLink>
        </div>
      </Section>

      <Section title="Chip" note="Pick one from a set. Caller adds role=radio.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Example">
          <Chip role="radio" aria-checked selected>
            50/10
          </Chip>
          <Chip role="radio" aria-checked={false}>
            25/5
          </Chip>
          <Chip role="radio" aria-checked={false}>
            Custom
          </Chip>
        </div>
      </Section>

      <Section title="Card" note="radius md · lg · xl · 2xl; raised for things that arrive.">
        <div className="grid grid-cols-2 gap-3">
          {RADII.map((r) => (
            <Card key={r} radius={r} className="p-4 text-sm text-muted">
              radius=&quot;{r}&quot;
            </Card>
          ))}
          <Card radius="xl" raised className="col-span-2 p-5 text-sm text-muted">
            raised (resume card, menu, toast)
          </Card>
        </div>
      </Section>

      <Section title="TextInput">
        <div className="flex flex-col gap-3">
          <TextInput placeholder="What's next?" aria-label="Example input" className="w-full" />
          <label className="flex items-center gap-2 text-xs text-muted">
            Focus
            <TextInput size="sm" type="number" defaultValue={50} className="w-16" />
            min
          </label>
        </div>
      </Section>

      <Section title="ProgressBar" note="xs in cards · sm the timer's top line · md games">
        <div className="flex flex-col gap-4">
          <ProgressBar size="xs" value={0.35} />
          <ProgressBar size="sm" value={0.6} />
          <ProgressBar size="md" value={0.8} />
        </div>
      </Section>

      <Section title="Small pieces">
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted">
            Kbd: <Kbd>⌘ K</Kbd> · TextLink: <TextLink href="/history">History</TextLink>
          </p>
          <dl className="flex justify-between gap-4 text-sm text-muted">
            <Stat label="You" value={3} />
            <Stat label="Draws" value={1} />
            <Stat label="Hamster" value={2} />
          </dl>
          <p className="flex items-center gap-4 text-muted">
            Pomodoros: <Pomodoros count={3} lit /> <Pomodoros count={2} lit={false} /> <Pomodoros count={7} lit />
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-line-soft pt-6 first-of-type:mt-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {note && <p className="mt-1 text-xs text-faint">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-faint">{label}</p>
      {children}
    </div>
  );
}
