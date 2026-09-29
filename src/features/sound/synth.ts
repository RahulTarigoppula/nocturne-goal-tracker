import { inQuietHours, scaleHz } from "../../engine/scale";
import type { Settings } from "../../engine/types";

/** All sound is synthesised with Web Audio — zero audio files. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio(): void {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
}

function ready(s: Settings | undefined): { c: AudioContext; m: GainNode } | null {
  if (!s?.sound.enabled || !ctx || !master) return null;
  if (inQuietHours(new Date().getHours(), s.sound.quietFrom, s.sound.quietTo)) return null;
  master.gain.value = s.sound.master;
  return { c: ctx, m: master };
}

function noise(c: AudioContext, m: GainNode, reverse: boolean) {
  const len = Math.floor(c.sampleRate * 0.04);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (reverse ? i / len : 1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = 0.125; // ≈ −18 dBFS
  src.connect(bp).connect(g).connect(m);
  src.start();
}

function tone(c: AudioContext, m: GainNode, hz: number, at: number, decay: number, peak = 0.5) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = hz;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  o.connect(g).connect(m);
  o.start(at);
  o.stop(at + decay + 0.02);
}

export const sound = {
  strike(s: Settings | undefined, n: number) {
    const r = ready(s);
    if (!r) return;
    noise(r.c, r.m, false);
    tone(r.c, r.m, scaleHz(n), r.c.currentTime, 0.6);
  },
  thock(s: Settings | undefined) {
    const r = ready(s);
    if (r) tone(r.c, r.m, 90, r.c.currentTime, 0.07, 0.6);
  },
  chime(s: Settings | undefined) {
    const r = ready(s);
    if (!r) return;
    tone(r.c, r.m, 440, r.c.currentTime, 0.9, 0.35);
    tone(r.c, r.m, 660, r.c.currentTime + 0.3, 1.2, 0.35);
  },
  undo(s: Settings | undefined) {
    const r = ready(s);
    if (r) noise(r.c, r.m, true);
  },
};
