import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchAll } from "../data/queries";
import { runningDate } from "../engine/daykey";
import { useNavigate } from "./hash-router";
import { useUi } from "./store";

interface Hit {
  key: string;
  label: string;
  meta: string;
  go: () => void;
}

/** ⌘K / Ctrl+K: entries, habits and issues across tables. */
export function QuickFind() {
  const close = useUi((s) => s.close);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    let live = true;
    searchAll(q).then(({ entries, habits, issues }) => {
      if (!live) return;
      setSel(0);
      setHits([
        ...entries.map((e) => ({
          key: `e${e.id}`,
          label: e.title,
          meta: e.status === "done" ? "closed" : e.when ? runningDate(e.when) : "someday",
          go: () => {
            close();
            useUi.getState().open({ kind: "entry", id: e.id });
          },
        })),
        ...habits.map((h) => ({
          key: `h${h.id}`,
          label: h.title,
          meta: "ledger",
          go: () => {
            close();
            navigate("/ledger");
          },
        })),
        ...issues.map((i) => ({
          key: `i${i.dayKey}`,
          label: i.standfirst ?? `Issue No. ${i.issueNo}`,
          meta: `No. ${i.issueNo}`,
          go: () => {
            close();
            navigate(`/issues/${i.dayKey}`);
          },
        })),
      ]);
    });
    return () => {
      live = false;
    };
  }, [q, close, navigate]);

  return createPortal(
    <>
      <div className="scrim" onClick={close} aria-hidden="true" />
      <div className="find" role="dialog" aria-modal="true" aria-label="Find">
        <input
          ref={input}
          className="field"
          value={q}
          placeholder="Find an entry, habit or issue…"
          aria-label="Find"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(hits.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") hits[sel]?.go();
          }}
        />
        <ul aria-label="Results">
          {hits.map((h, i) => (
            <li key={h.key}>
              <button type="button" aria-current={i === sel} onClick={h.go}>
                <span>{h.label}</span>
                <span className="rh">{h.meta}</span>
              </button>
            </li>
          ))}
        </ul>
        {q.trim() && hits.length === 0 && <p className="footnote">Nothing matches.</p>}
      </div>
    </>,
    document.body,
  );
}
