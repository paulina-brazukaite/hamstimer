// The end-of-focus chime, synthesised with the Web Audio API: no audio file to
// download, and it works offline.
//
// Browsers only allow sound after the person has interacted with the page, so
// `unlockAudio()` is called on the first key press or click.

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // no Web Audio: stay silent
  }
}

/** Two soft sine notes, a fifth apart, fading out over ~2 seconds. */
export function playChime(): void {
  unlockAudio();
  if (!ctx) return;
  const start = ctx.currentTime + 0.05;
  note(ctx, 523.25, start, 1.8); // C5
  note(ctx, 783.99, start + 0.35, 2.2); // G5
}

function note(ctx: AudioContext, freq: number, at: number, length: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.12, at + 0.03); // quick, soft attack
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length); // long fade
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}
