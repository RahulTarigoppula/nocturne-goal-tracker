import { lazy, Suspense } from "react";
import { useUi } from "./store";

const EntrySheet = lazy(() => import("../features/entry/EntrySheet").then((m) => ({ default: m.EntrySheet })));
const WhenSheet = lazy(() => import("../features/entry/WhenSheet").then((m) => ({ default: m.WhenSheet })));
const HabitSheet = lazy(() => import("../features/ledger/HabitSheet").then((m) => ({ default: m.HabitSheet })));
const QuickFind = lazy(() => import("./QuickFind").then((m) => ({ default: m.QuickFind })));

/** Sheets are UI state, never routes (except the #/?entry=<id> deep link, which opens one). */
export function SheetHost() {
  const sheet = useUi((s) => s.openSheet);
  if (!sheet) return null;
  return <Suspense fallback={null}>{render(sheet)}</Suspense>;
}

function render(sheet: NonNullable<ReturnType<typeof useUi.getState>["openSheet"]>) {
  switch (sheet.kind) {
    case "entry":
      return <EntrySheet key={sheet.id} id={sheet.id} />;
    case "when":
      return <WhenSheet key={sheet.id} id={sheet.id} />;
    case "habit":
      return <HabitSheet key={sheet.id} id={sheet.id} />;
    case "find":
      return <QuickFind />;
  }
}
