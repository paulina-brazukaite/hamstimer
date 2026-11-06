# Nextline

A focus timer that remembers where your head was.

## Run it

Requires Node 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Before pushing anything:

```bash
npm run lint
npm run build      # must pass; this is what Vercel runs
npm test           # unit tests (Vitest); npm run test:watch while coding
```

## Where things live

```
src/
  app/
    layout.tsx      fonts, metadata, theme-before-paint script
    globals.css     design tokens (dark default + warm light)
    page.tsx        "/" (renders the focus screen)
    history/        "/history": session list + JSON export/import
  components/       UI pieces ("use client" where they need the browser)
                    focus-screen.tsx is "/": resume card or timer view
  lib/
    storage.ts      safe localStorage wrapper (never throws)
    timer.ts        timer engine: pure functions over timestamps (+ timer.test.ts)
    timer-store.ts  engine + clock + localStorage, subscribable from React
    use-timer.ts    React hook over the store (useSyncExternalStore)
    history.ts      history entries + backup format (+ history.test.ts)
    use-stored.ts   React hook: a localStorage key, kept live
```

## Conventions

- **Colours:** use the semantic classes only (`bg-ground`, `bg-surface`, `border-line`, `text-fg`,
  `text-muted`, `text-faint`, `bg-lamp`, `text-lamp-fg`). Never hard-code a hex in a component;
  both themes come from the variables in `globals.css`.
- **Amber (`lamp`)** is used in three places only: the progress line, the "next" label and the
  Resume button.
- **Storage:** always go through `lib/storage.ts`. Every key starts with `nextline:`.
- **Next.js version:** this is Next 16. Read `node_modules/next/dist/docs/` before reaching for
  an API from memory (see AGENTS.md).
