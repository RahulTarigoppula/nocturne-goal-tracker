import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { setStandfirst } from "../../data/repo";
import { colophonLines } from "../../engine/colophon";
import type { Issue } from "../../engine/types";
import { shareIssue } from "./shareCard";

interface Props {
  issue: Issue;
  longest: number;
  /** Play the draw (only when closedAt changed this session). */
  animate: boolean;
  /** Frozen back issues show the printed standfirst instead of the input. */
  frozen?: boolean;
}

export function ColophonBlock({ issue, longest, animate, frozen }: Props) {
  const [inState, setIn] = useState(!animate);
  const [draft, setDraft] = useState(issue.standfirst ?? "");
  const [shareState, setShareState] = useState<"idle" | "busy" | "failed">("idle");
  const navigate = useNavigate();

  useEffect(() => {
    if (!animate) return;
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setIn(true)));
    return () => cancelAnimationFrame(t);
  }, [animate]);

  useEffect(() => setDraft(issue.standfirst ?? ""), [issue.standfirst]);

  if (!issue.closedAt) return null;
  const lines = colophonLines({
    issueNo: issue.issueNo,
    closedAt: issue.closedAt,
    total: issue.total,
    streak: issue.streakAtClose ?? 1,
    longest: Math.max(longest, issue.streakAtClose ?? 1),
  });

  const share = async () => {
    setShareState("busy");
    try {
      await shareIssue(issue.dayKey);
      setShareState("idle");
    } catch {
      setShareState("failed");
    }
  };

  return (
    <section className={`colophon${inState ? " in" : ""}${animate ? "" : " instant"}`} aria-label="Colophon">
      <div className="rule" />
      <div className="cl no">{lines[0]}</div>
      <div className="cl l">{lines[1]}</div>
      <div className="cl l">{lines[2]}</div>
      <div className="cl l m">{lines[3]}</div>
      {frozen ? (
        issue.standfirst ? (
          <p className="cl standfirst-printed">{issue.standfirst}</p>
        ) : (
          <span className="cl" />
        )
      ) : (
        <div className="cl standfirst">
          <input
            type="text"
            value={draft}
            placeholder="A line for the record —"
            aria-label="A line for the record"
            maxLength={140}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) setStandfirst(issue.dayKey, draft);
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={() => {
              if (draft.trim() !== (issue.standfirst ?? "")) setStandfirst(issue.dayKey, draft);
            }}
          />
        </div>
      )}
      <div className="cl colophon-actions">
        <button type="button" className="btn-fill" onClick={share} disabled={shareState === "busy"}>
          {shareState === "busy" ? "Setting…" : "Share the issue"}
        </button>
        {!frozen && (
          <button type="button" className="btn-text" onClick={() => navigate("/upcoming")}>
            Set tomorrow
          </button>
        )}
        {shareState === "failed" && <span className="footnote error">Could not set the card — Retry</span>}
      </div>
    </section>
  );
}
