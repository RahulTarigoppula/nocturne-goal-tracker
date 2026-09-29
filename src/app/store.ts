import { create } from "zustand";
import type { Undo } from "../data/repo";
import type { DayKey, Id } from "../engine/types";

export type OpenSheet =
  | { kind: "entry"; id: Id }
  | { kind: "when"; id: Id }
  | { kind: "habit"; id: Id }
  | { kind: "find" }
  | null;

interface UiState {
  now: number;
  today: DayKey | null;
  selectedEntryId: Id | null;
  openSheet: OpenSheet;
  /** Element to return focus to when a sheet closes. */
  returnFocus: HTMLElement | null;
  undo: (Undo & { label: string }) | null;
  strikeCountToday: number;
  /** Issues whose closedAt changed during this session — the colophon draw plays only for these. */
  colophonJustClosed: Record<string, number>;
  announce: string;
  storageError: boolean;
  composerFocusTick: number;
  setNow: (now: number, today: DayKey) => void;
  select: (id: Id | null) => void;
  open: (sheet: OpenSheet) => void;
  close: () => void;
  setUndo: (u: (Undo & { label: string }) | null) => void;
  bumpStrikes: (by: number) => void;
  markClosed: (dayKey: DayKey, closedAt: number) => void;
  say: (text: string) => void;
  focusComposer: () => void;
}

export const useUi = create<UiState>((set, get) => ({
  now: Date.now(),
  today: null,
  selectedEntryId: null,
  openSheet: null,
  returnFocus: null,
  undo: null,
  strikeCountToday: 0,
  colophonJustClosed: {},
  announce: "",
  storageError: false,
  composerFocusTick: 0,
  setNow: (now, today) => {
    const prev = get().today;
    set(prev && prev !== today ? { now, today, strikeCountToday: 0 } : { now, today });
  },
  select: (id) => set({ selectedEntryId: id }),
  open: (sheet) =>
    set((s) => ({
      openSheet: sheet,
      // Opening a sheet from a sheet keeps the original return target (the inner one unmounts).
      returnFocus:
        s.openSheet && s.returnFocus
          ? s.returnFocus
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null,
    })),
  close: () => {
    const el = get().returnFocus;
    set({ openSheet: null, returnFocus: null });
    if (el?.isConnected) requestAnimationFrame(() => el.focus());
  },
  setUndo: (undo) => set({ undo }),
  bumpStrikes: (by) => set((s) => ({ strikeCountToday: Math.max(0, s.strikeCountToday + by) })),
  markClosed: (dayKey, closedAt) =>
    set((s) => ({ colophonJustClosed: { ...s.colophonJustClosed, [dayKey]: closedAt } })),
  say: (text) => {
    set({ announce: "" });
    requestAnimationFrame(() => set({ announce: text }));
  },
  focusComposer: () => set((s) => ({ composerFocusTick: s.composerFocusTick + 1 })),
}));
