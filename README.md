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
    manifest.ts     PWA manifest (/manifest.webmanifest)
    timer/[preset]/ one template for /timer/50-10, /timer/25-5, /timer/90-minute
    about/          "/about"
    sitemap.ts, robots.ts, opengraph-image.tsx   SEO (all static at build time)
    icon.svg, apple-icon.png   favicons (Next file conventions)
  components/       UI pieces ("use client" where they need the browser)
                    focus-screen.tsx is "/": resume card or timer view
  lib/
    storage.ts      safe localStorage wrapper (never throws)
    timer.ts        timer engine: pure functions over timestamps (+ timer.test.ts)
    timer-store.ts  engine + clock + localStorage, subscribable from React
    use-timer.ts    React hook over the store (useSyncExternalStore)
    history.ts      history entries + backup format (+ history.test.ts)
    use-stored.ts   React hooks: a localStorage key kept live, settings, ⌘/Ctrl
    settings.ts     sound + notification preferences (nextline:settings)
    site.ts         site URL, name, tagline (set NEXT_PUBLIC_SITE_URL for a custom domain)
    timer-pages.ts  content for the /timer/* landing pages (add one = add an entry)
    og.tsx          shared Open Graph image design
    sound.ts        end-of-focus chime (Web Audio, no file)
    theme.ts        light/dark toggle
    backup-actions.ts  export download / import file (browser side)
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

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| ⌘K / Ctrl+K | anywhere | command menu (every action is in here) |
| Enter | intention box | start |
| Space | timer | start / pause / resume |
| E | timer | +15 min (on break: back to focus for 15 min) |
| N | timer | write a "Where was I?" note |
| Enter / Esc | note board | save / skip |
| R / Esc | resume card | resume / start fresh |

## Offline / PWA

- `public/sw.js` is a small hand-written service worker (no library). It precaches `/`, `/history`
  and every JS/CSS/font file they use, so one online visit is enough to work offline.
- It only registers in production builds. To test: `npm run build && npm start`, load the page,
  stop the server, reload.
- After changing what it caches, bump `VERSION` at the top of `sw.js`.
- Icons: edit `scripts/generate-icons.mjs`, then run `node scripts/generate-icons.mjs`.
