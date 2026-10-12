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
  // Motion can hand the drop to a handler from an earlier render; read the live order from refs.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const openRef = useRef(p.open);
  openRef.current = p.open;

  // After a drop, keep the dropped order on screen until the stored order catches up, so the row
  // never snaps back for a frame (props still hold the pre-drop order until the live query refires).
  const pendingOrder = useRef<string | null>(null);
  useEffect(() => {
    if (dragId) return;
    const ids = p.open.map((e) => e.id).join();
    if (pendingOrder.current && pendingOrder.current !== ids) return;
    pendingOrder.current = null;
    setItems(p.open);
  }, [p.open, dragId]);

  const onReorder = (next: Entry[]) => {
    const ids = next.map((e) => e.id).join();
    if (ids !== lastOrder.current.join()) haptics.tick();
    lastOrder.current = next.map((e) => e.id);
    itemsRef.current = next;
    setItems(next);
  };

  const onDragEnd = (id: string) => {
    const live = itemsRef.current;
    const index = live.findIndex((e) => e.id === id);
    const original = openRef.current.findIndex((e) => e.id === id);
    if (index >= 0 && index !== original) {
      pendingOrder.current = live.map((e) => e.id).join();
      // Safety valve: never hold a stale order if the write fails.
      window.setTimeout(() => {
        if (pendingOrder.current) {
          pendingOrder.current = null;
          setItems(openRef.current);
        }
      }, 1500);
    }
    setDragId(null);
    if (index >= 0 && index !== original) {
      reorder(
        id,
        live.filter((e) => e.id !== id),
        index,
      ).catch(() => {});
    }
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
