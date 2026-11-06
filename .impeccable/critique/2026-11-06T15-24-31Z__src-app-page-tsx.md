---
target: the / focus screen
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\dev\\nextline\\src\\app\\page.tsx"
target_fingerprint: "sha256:2f55d658b22e173d30a3ae381c27e9bd3e233f0a5ba787327c26889624418afa"
target_path: "C:\\dev\\nextline\\src\\app\\page.tsx"
timestamp: 2026-11-06T15-24-31Z
slug: src-app-page-tsx
---
# Critique: "/" focus screen (src/app/page.tsx)
Method: dual-agent (A: design review, B: detector + browser overlay). Mode: Operate.

## Design Health Score: 28/40 (Good, low end)
1 Visibility 3 (paused vs running look alike) · 2 Real world 3 ("Nice work" + 00:00 after a 30s Stop) · 3 Control 2 (Esc on resume card wipes intention+note, no undo) · 4 Consistency 3 (N hint while typing; touch shows key hints) · 5 Error prevention 2 (single-key destructive Esc; unsaved note dropped on click) · 6 Recognition 3 (+15/note only in Menu on touch) · 7 Flexibility 4 · 8 Minimalist 3 (Start weighs same as chips) · 9 Error recovery 2 (window.alert; no undo for Start fresh) · 10 Help 3 ("Ctrl K" label; R/Esc not taught).

## Design specificity
Core moments (lamp amber, ↳ next, resume card, tab title) are authored; idle/running frame is the generic minimal Pomodoro stack with a 136px mono clock as hero, contradicting "the timer is the frame".
Detector: CLI 0 findings (regex-only on TSX). Browser: overused-font (Geist Mono 78-83% of text) on every app view; /history clean. Partly a deliberate choice, partly confirms the "dev-tool frame" reading.

## Priority issues
- [P1] Esc on resume card runs startFresh (resume-card.tsx:21), deleting intention+note; sessions <60s never reach history (history.ts:25). Fix: non-destructive Start fresh (archive or undo toast), move off bare Esc. -> /impeccable harden
- [P1] Resume card makes the intention the h1 and the note muted 17px (resume-card.tsx:44-56). Fix: ↳ next note is the headline, intention a label. -> /impeccable typeset
- [P2] Stop/complete misreports: 00:00, "Nice work", full progress bar after seconds; "0 of 50 min". Fix: "Stopped after N min", reset bar, praise only on completion, "<1 min". -> /impeccable clarify
- [P2] Touch: no Note/+15 controls, note board has only key hints (note-board.tsx:52). Fix: Note button, real Save/Skip on coarse pointers. -> /impeccable adapt
- [P3] Idle Start is weakest element. Fix: lamp fill like Resume, calm idle clock. -> /impeccable bolder

## Persona red flags
Alex: destructive Esc; no edit-intention shortcut; theme state not shown. Sam: aria-live="off" on timer, no announcements; non-modal role="dialog"; outline-none inputs with faint border focus; window.alert. Jordan: intro vanishes on Enter; "Ctrl K" label; note board unannounced, no Save; Esc gives no delete warning; "50 / 10" unitless. Maya (returning dev): note below topic; "12 of 50 min" reads as quota; Esc wipes note.

## Minor
themeColor hard-coded dark; note || s.note can't clear a stale note (timer.ts:244); light --faint == --muted; layout jumps on note board / intro collapse; slashed zeros; settings only in ⌘K.

## Questions
Next step as largest type, clock as a quiet line? Should Start fresh ever destroy anything? Merge Stop and Pause into one "Step away"?
