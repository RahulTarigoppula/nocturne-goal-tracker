export const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
export const ease = { out: [0.2, 0.7, 0.1, 1], inOut: [0.65, 0, 0.35, 1] } as const;
export const dur = { fast: 0.12, base: 0.24, slow: 0.48 } as const;
/** Milliseconds, for timers that must line up with the CSS tokens. */
export const ms = {
  fast: 120,
  base: 240,
  slow: 480,
  strike: 320,
  undo: 5000,
  longPress: 250,
  colophonDelay: 400,
} as const;
export const SWIPE_THRESHOLD = 90;
export const SWIPE_VELOCITY = 600;
