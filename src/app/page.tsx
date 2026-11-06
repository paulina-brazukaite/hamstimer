import { ThemeToggle } from "@/components/theme-toggle";

// Step 3 placeholder: the static focus screen from the mockup, so we can check
// fonts, tokens and both themes. Step 4 replaces the middle with the real timer.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-0.5 w-full bg-line-soft" aria-hidden="true">
        <div className="h-0.5 w-[54%] bg-lamp" />
      </div>

      <header className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-lamp" aria-hidden="true" />
          <span className="text-[15px] font-semibold tracking-tight">Nextline</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10">
        <p className="max-w-xl text-center text-[17px] text-muted">
          Fix token refresh in auth middleware
        </p>
        <p className="font-mono text-7xl leading-none tracking-tighter tabular-nums sm:text-[136px]">
          23:14
        </p>
        <p className="font-mono text-[13px] text-faint">of 50:00 · placeholder</p>
      </main>

      <footer className="flex flex-wrap justify-center gap-7 px-6 pb-8 font-mono text-xs text-faint">
        <span><span className="text-fg">Space</span> pause</span>
        <span><span className="text-fg">E</span> +15 min</span>
        <span><span className="text-fg">N</span> note</span>
        <span><span className="text-fg">⌘K</span> menu</span>
      </footer>
    </div>
  );
}
