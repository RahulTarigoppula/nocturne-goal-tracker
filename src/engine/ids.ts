import type { Id } from "./types";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 12-char base62 id from a caller-supplied source of random bytes (crypto in the app, seeded in tests). */
export function makeId(randomBytes: (n: number) => Uint8Array): Id {
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[(bytes[i] ?? 0) % 62];
  return out;
}

/** Deterministic PRNG (mulberry32) for tests and fixtures. */
export function seededBytes(seed: number): (n: number) => Uint8Array {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (n) => Uint8Array.from({ length: n }, () => Math.floor(next() * 256));
}
