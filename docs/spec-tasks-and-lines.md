# Spec: Tasks and lines

Status: built · 2026-11-07 (P0, plus clicking a line to make it current and removing a line from P1)

**In one line:** type what you're working on, press Enter, run pomodoros on that line. A task is a list of these lines; finish the task and start the next one.

## Problem

Today a Hamstimer session holds one intention and one "next step" note. Real work on a big task moves through many small steps, so the single note is overwritten again and again and the record of what you actually did is lost. Around those two strings sits a lot of timer machinery (presets, a preset picker, the note board, a separate intention input) that makes the app feel heavier than the job it does.

If we do nothing, Hamstimer stays a timer with a sticky note: fine for one session, weak for a task that takes a day.

## Goals

1. **Typing what you're on is one action.** Add a line with one Enter, from the keyboard, without leaving the focus screen.
2. **Every pomodoro belongs to a line.** You can see how many pomodoros each line took.
3. **Coming back shows where you were.** The resume card shows the task and the line you were on, and one key resumes the timer on it.
4. **The screen gets simpler, not busier.** Net fewer controls on the focus screen than today.
5. **A finished task is kept.** History shows finished tasks with their lines and pomodoro counts.

## Non-goals

- **A task list or backlog.** One task is active at a time. A backlog is what turns this into a worse Todoist.
- **Nested subtasks.** Lines are one level deep.
- **Running two timers at once.** There is exactly one timer.
- **Due dates, tags, projects, priorities.** Not what a focus timer is for.
- **Accounts or sync.** Data stays in the browser (Product Principle 3).

## Model

```
Task
  id, title (optional), createdAt, finishedAt | null
  lines: Line[]
  currentLineId | null

Line
  id, text, createdAt, doneAt | null
  pomodoros: number         // completed focus phases while this line was current
  focusedMs: number         // all focus time while this line was current

Timer (one, global, as today)
  phase, startedAt, elapsedMs, focusMs, breakMs, extensions …
  // no intention / note / notePrompt any more
```

- **Current line**: the line the timer counts towards. A new line becomes current; ticking the current line moves to the first undone line from the top. Clicking an undone line makes it current.
- **Pomodoro**: one focus phase that reaches its end. Stopped or abandoned focus time still adds to `focusedMs` but not to `pomodoros`.

## User stories

- As a maker, I want to type what I'm doing and press Enter so that the timer is about that thing without any setup.
- As a maker, I want to start a pomodoro on the line I just typed so that my time is tied to the step I'm on.
- As a maker, I want to tick a line off and type the next one without stopping the timer so that finishing a step doesn't break my rhythm.
- As a maker, I want to see how many pomodoros each line took so that I learn how long steps really take.
- As a maker coming back after a break or the next morning, I want to see the task and the line I was on so that I can resume without re-reading anything.
- As a maker, I want to finish a big task and start a new empty one so that the screen only holds what I'm doing now.
- As a maker, I want finished tasks in History so that I have a record of what I did.
- Edge: as a new user, I want to just start typing with no task title so that naming things isn't a barrier.
- Edge: as a returning user, I want my existing sessions to survive the update so that I don't lose my history.

## Requirements

### P0: must ship

**1. Line input**
- [ ] The focus screen has one input, "What are you working on?", focused on load (unless the resume card is showing).
- [ ] Enter adds the text as a new line at the bottom and makes it the current line. Empty input does nothing.
- [ ] Line text is capped at 120 characters (today's `MAX_INTENTION`).
- [ ] If no task exists, adding the first line creates one with no title.

**2. One timer on the current line**
- [ ] Space starts or pauses the timer for the current line (same as today). With no lines, Space does nothing and the input stays focused.
- [ ] Focus time while running adds to the current line's `focusedMs`.
- [ ] When a focus phase ends, the current line's `pomodoros` goes up by 1, the chime plays (as today) and the break starts.
- [ ] Only one timer exists; starting work on another line moves the timer to it, it does not start a second one.

**3. Ticking lines off**
- [ ] Each line has a done toggle. Ticking the current line makes the newest undone line current and **does not reset or pause the timer**.
- [ ] A focus phase that ends counts towards whichever line is current at that moment.
- [ ] Done lines stay in the list, struck through, with their pomodoro count.

**4. Pomodoro count per line**
- [ ] Each line shows its completed pomodoros (e.g. dots, or `×3` past 4). Lines with 0 show nothing.
- [ ] The current line is clearly marked, and shows the running clock next to it while in focus.

**5. End-of-focus prompt replaces the note board**
- [ ] When focus ends, show one prompt: *"Done with ‘{current line}’?"* with `Done` and `Still on it`.
- [ ] `Done` ticks the line and focuses the input for the next one. `Still on it` leaves it current.
- [ ] Pausing or stopping no longer opens a note board. Typing a new line is how you write "the next step".

**6. Finish task**
- [ ] A "Finish task" action (button and command menu entry) sets `finishedAt`, stops the timer, moves the task to History and shows an empty focus screen.
- [ ] Finishing is undoable for a few seconds, like "Start fresh" today.
- [ ] Task title is optional and editable inline at any time.

**7. Resume card**
- [ ] Shown under the same conditions as today (`shouldOfferResume`).
- [ ] Shows the task title (if any), the current line as the lead, and its pomodoro count.
- [ ] R resumes the timer on that line. Esc keeps today's behaviour (start fresh, undoable): it finishes the task.

**8. History**
- [ ] History lists tasks, newest first: title (or first line), lines with their done state and pomodoros, total focus time, dates.
- [ ] JSON export and import keep working, including tasks.

**9. Migration**
- [ ] Old saves are converted when read (no one-off migration step). With a note, the intention becomes the task title and the note its one line; without one, the intention is the line. `focusedMs` is kept on that line.
- [ ] An in-progress `nextline:timer` session becomes the active task the same way, so the resume card still works. History entries are converted the same way.
- [ ] Old backups (version 1) can still be imported and go through the same conversion.

**10. Removed**
- [ ] Intention input, note board and the separate "next" note are removed.
- [ ] The preset picker stays under the clock, but only while no focus block or break is running. `/timer/[preset]` pages and the command menu still set it.

### P1: soon after

- **Edit and delete lines** (double-click or a menu), and drag to reorder.
- **Pick the current line** by clicking an undone line or with ↑/↓.
- **Pomodoro count in the tab title**, e.g. `18:42 · Write refresh handler (2)`.
- **"Today" total** of pomodoros across tasks, shown quietly in the header.

### P2: later, design for it now

- **Parked tasks**: keep up to 2–3 unfinished tasks to switch between. Store tasks as an array with an `activeTaskId` so this needs no second migration.
- **Line notes**: a short note on a line. Leave room in `Line` for it.
- **Estimates**: "this will take 2 pomodoros", compared with the actual count.

## Keyboard

| Key | Action |
|---|---|
| Enter (in input) | Add line, make it current |
| Space | Start / pause timer on current line |
| D | Tick current line done |
| E | +15 min (as today) |
| R / Esc | Resume / finish task, on the resume card (as today) |
| ⌘K / Ctrl+K | Command menu, including Finish task and preset |

`N` (note) goes away.

## Success metrics

Hamstimer has no analytics and shouldn't get any (Principle 3), so these are checked by using it and by reading your own History export.

- **Leading (first week):** you add 3 or more lines per task on most days; the end-of-focus prompt gets answered rather than ignored.
- **Leading:** adding a line takes one keystroke after typing (Enter), checked by hand.
- **Lagging (first month):** most days have a task in History with ticked lines; you resume from the resume card rather than starting fresh.
- **Simplicity check:** the focus screen has fewer interactive controls than today (count them before and after).

## Open questions

- **Design:** dots vs `×n` for pomodoro counts, and how the current line looks while on break. *(non-blocking)*
- **Design:** does the lines list scroll, or do done lines collapse after ~5? *(non-blocking)*
- ~~**Engineering:** one storage key or two?~~ Decided: one. The task lives inside `nextline:timer` (version 2), so the clock and the task can't drift apart. History stays in `nextline:history`, now holding finished tasks.
- **Product:** what happens to the first-visit intro and the `/timer/*` landing page copy that talk about "intention" and "Where was I?" notes? *(non-blocking, copy update)*

## Phasing

1. **Model and migration**: `Task` / `Line` types, pure functions, tests, migration of timer and history. Nothing visible changes yet.
2. **Focus screen**: line input, list, current line, end-of-focus prompt, Finish task; remove intention input and note board.
3. **Resume card and History** on the new model; export/import.
4. **Copy pass**: PRODUCT.md terminology, intro, landing pages, about.

No hard deadlines; it's a side project.
