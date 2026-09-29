import { makeId } from "../engine/ids";

/** The app's only source of time and randomness; tests replace these. */
export const clock = {
  now: (): number => Date.now(),
};

export const random = {
  bytes: (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n)),
};

export const newId = (): string => makeId(random.bytes);
