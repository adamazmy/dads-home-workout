/**
 * Rest-over signal: a soft beep plus a vibration on Android.
 * Chrome only allows audio after a user gesture, so `unlockAudio` is called
 * from the "Start workout" tap (and again on every "Set done" tap).
 */
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // no Web Audio: vibration only
  }
}

function tone(c: AudioContext, at: number, freq: number, length: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

export function restOver(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + 0.02;
    tone(ctx, t, 660, 0.25);
    tone(ctx, t + 0.35, 660, 0.25);
    tone(ctx, t + 0.7, 880, 0.45);
  }
  try {
    navigator.vibrate?.([250, 120, 250, 120, 400]);
  } catch {
    /* vibration unsupported (desktop, iOS) */
  }
}
