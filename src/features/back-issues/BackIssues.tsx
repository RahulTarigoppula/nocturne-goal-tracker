import { Link } from "../../app/hash-router";
import { useUi } from "../../app/store";
import { useIssues } from "../../data/queries";
import { hhmm, isoWeek, MONTHS, parseKey, runningDate, startOfWeek } from "../../engine/daykey";
import type { Issue } from "../../engine/types";

/** Rows come from the `issues` table only — never a scan of entries. */
export function BackIssues() {
  const today = useUi((s) => s.today);
  const issues = useIssues();
  if (!today || !issues) return <div className="page" aria-busy="true" />;
  const past = issues.filter((i) => i.dayKey < today && i.total > 0);

  const blocks: React.ReactNode[] = [];
  let month = "";
  let week = "";
  for (let idx = 0; idx < past.length; idx++) {
    const i = past[idx] as Issue;
    const { y, m } = parseKey(i.dayKey);
    const mk = `${y}-${m}`;
    if (mk !== month) {
      month = mk;
      blocks.push(
        <h2 className="month-head" key={`m${mk}`}>
          {MONTHS[m - 1]}
          {y !== parseKey(today).y ? ` ${y}` : ""}
        </h2>,
      );
    }
    const wk = startOfWeek(i.dayKey);
    if (wk !== week) {
      week = wk;
      const inWeek = past.filter((x) => startOfWeek(x.dayKey) === wk);
      const d = inWeek.reduce((a, x) => a + x.done, 0);
      const t = inWeek.reduce((a, x) => a + x.total, 0);
      const c = inWeek.filter((x) => x.closedAt).length;
      blocks.push(
        <div className="week-head rh" key={`w${wk}`}>
          Week {isoWeek(i.dayKey)} · {d} / {t} · {c} {c === 1 ? "issue" : "issues"} closed
        </div>,
      );
    }
    blocks.push(
      <Link to={`/issues/${i.dayKey}`} className={`issue-row${i.closedAt ? "" : " open"}`} key={i.dayKey}>
        <div className="im">
          No. {i.issueNo} · {runningDate(i.dayKey)} · {i.done} / {i.total} ·{" "}
          {i.closedAt ? `closed ${hhmm(new Date(i.closedAt))}` : "open"}
        </div>
        {i.standfirst && <div className="sf">{i.standfirst}</div>}
      </Link>,
    );
  }

  return (
    <div className="page page-enter">
      <div className="page-head rh">
        <span>Nocturne · Back issues</span>
        <span>
          {past.length} {past.length === 1 ? "issue" : "issues"}
        </span>
      </div>
      {past.length === 0 ? (
        <p className="light-line">No back issues yet. Close today's to start the archive.</p>
      ) : (
        blocks
      )}
    </div>
  );
}
