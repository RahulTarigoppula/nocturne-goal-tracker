import { EntrySheet } from "../features/entry/EntrySheet";
import { WhenSheet } from "../features/entry/WhenSheet";
import { HabitSheet } from "../features/ledger/HabitSheet";
import { QuickFind } from "./QuickFind";
import { useUi } from "./store";

/** Sheets are UI state, never routes (except the #/?entry=<id> deep link, which opens one). */
export function SheetHost() {
  const sheet = useUi((s) => s.openSheet);
  if (!sheet) return null;
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
