import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { reorder } from "../../data/repo";
import type { DayKey, Entry } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { EntryRow, type RowHandlers } from "./EntryRow";

interface Props extends RowHandlers {
  label: string;
  open: Entry[];
  done: Entry[];
  /** Folio of the first open entry in this section (sections share one numbering). */
  folioStart: number;
  today: DayKey;
  firstOverdueId: string | null;
  selectedId: string | null;
  pendingDone: ReadonlySet<string>;
  instantIds: ReadonlySet<string>;
}

function ReorderRow(
  props: Omit<Parameters<typeof EntryRow>[0], "reorder"> & {
    onDragStart: () => void;
    onDragEnd: () => void;
    dragging: boolean;
  },
) {
  const controls = useDragControls();
  const { onDragStart, onDragEnd, dragging, ...rest } = props;
  return <EntryRow {...rest} reorder={{ value: props.entry, controls, onDragStart, onDragEnd, dragging }} />;
}

export function EntryList(p: Props) {
  const [items, setItems] = useState(p.open);
  const [dragId, setDragId] = useState<string | null>(null);
  const lastOrder = useRef<string[]>([]);

  useEffect(() => {
    if (!dragId) setItems(p.open);
  }, [p.open, dragId]);

  const onReorder = (next: Entry[]) => {
    const ids = next.map((e) => e.id).join();
    if (ids !== lastOrder.current.join()) haptics.tick();
    lastOrder.current = next.map((e) => e.id);
    setItems(next);
  };

  const onDragEnd = (id: string) => {
    const index = items.findIndex((e) => e.id === id);
    const original = p.open.findIndex((e) => e.id === id);
    if (index >= 0 && index !== original) {
      // Keep the dropped order on screen until the write lands, so the row never jumps back.
      reorder(
        id,
        items.filter((e) => e.id !== id),
        index,
      )
        .catch(() => {})
        .finally(() => setDragId(null));
    } else setDragId(null);
  };

  const row = (e: Entry, folio: number | null) => ({
    entry: e,
    folio,
    today: p.today,
    vermilion: e.id === p.firstOverdueId,
    selected: e.id === p.selectedId,
    showDone: p.pendingDone.has(e.id),
    instant: p.instantIds.has(e.id),
    onStrike: p.onStrike,
    onOpen: p.onOpen,
    onWhen: p.onWhen,
    onSelect: p.onSelect,
  });

  const folios = new Map<string, number>();
  let n = p.folioStart;
  for (const e of items) if (!p.pendingDone.has(e.id)) folios.set(e.id, n++);

  return (
    <>
      <Reorder.Group as="ul" axis="y" values={items} onReorder={onReorder} className="entries" aria-label={p.label}>
        {items.map((e) => (
          <ReorderRow
            key={e.id}
            {...row(e, folios.get(e.id) ?? null)}
            dragging={dragId === e.id}
            onDragStart={() => {
              lastOrder.current = items.map((x) => x.id);
              setDragId(e.id);
            }}
            onDragEnd={() => onDragEnd(e.id)}
          />
        ))}
      </Reorder.Group>
      {p.done.length > 0 && (
        <ul className="entries" aria-label={`${p.label}, closed`}>
          {p.done.map((e) => (
            <EntryRow key={e.id} {...row(e, null)} />
          ))}
        </ul>
      )}
    </>
  );
}
