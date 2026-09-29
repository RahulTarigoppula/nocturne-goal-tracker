import { useMemo } from "react";
import { Link, useParams } from "../../app/hash-router";
import { useUi } from "../../app/store";
import { useDayEntries, useIssue, useIssues, useSettings } from "../../data/queries";
import { dayGauge, isDayKey } from "../../engine/daykey";
import { deriveSections } from "../../engine/ordering";
import { longestIssueStreak } from "../../engine/streaks";
import type { DayKey, Entry } from "../../engine/types";
import { ColophonBlock } from "../colophon/ColophonBlock";
import { EntryRow } from "../front-page/EntryRow";
import { Masthead } from "../front-page/Masthead";

const noop = () => {};

/** A past issue's Front Page, frozen: fixed gauge, printed colophon, no composer. */
export function FrozenIssue() {
  const { dayKey } = useParams();
  const key = isDayKey(dayKey) ? (dayKey as DayKey) : null;
  const today = useUi((s) => s.today);
  const settings = useSettings();
  const issue = useIssue(key);
  const issues = useIssues();
  const entries = useDayEntries(key);
  const s = useMemo(() => (entries ? deriveSections(entries) : null), [entries]);

  if (!key || issue === null) {
    return (
      <div className="page">
        <p className="light-line">This issue was never printed.</p>
        <Link className="btn-text" to="/issues">
          Back issues
        </Link>
      </div>
    );
  }
  if (!issue || !s || !settings || !today) return <div className="page" aria-busy="true" />;
  const open = (e: Entry) => useUi.getState().open({ kind: "entry", id: e.id });
  const row = (e: Entry) => (
    <EntryRow
      key={e.id}
      entry={e}
      folio={s.folios.get(e.id) ?? null}
      today={key}
      vermilion={false}
      selected={false}
      showDone={false}
      instant
      onStrike={noop}
      onOpen={open}
      onWhen={noop}
      onSelect={noop}
    />
  );
  return (
    <div className="page page-enter">
      <Link
        to="/issues"
        className="rh"
        style={{ display: "inline-flex", minHeight: 44, alignItems: "center", textDecoration: "none" }}
      >
        ‹ Back issues
      </Link>
      <Masthead
        dayKey={key}
        issueNo={issue.issueNo}
        done={issue.done}
        total={issue.total}
        now={Date.now()}
        rolloverHour={settings.dayRolloverHour}
        greeting=""
        storageError={false}
        frozenGauge={issue.closedAt ? dayGauge(new Date(issue.closedAt), settings.dayRolloverHour) : 1}
      />
      <div className={`issue-body${issue.closedAt ? " closed" : ""}`}>
        {s.today.length > 0 && (
          <>
            <div className="section-head rh">
              <span>I — Today</span>
            </div>
            <ul className="entries">{s.today.map(row)}</ul>
          </>
        )}
        {s.evening.length > 0 && (
          <>
            <div className="section-head rh">
              <span>II — This evening</span>
            </div>
            <ul className="entries">{s.evening.map(row)}</ul>
          </>
        )}
        {s.total === 0 && <p className="light-line">Every entry of this issue has moved on.</p>}
      </div>
      {issue.closedAt ? (
        <ColophonBlock issue={issue} longest={longestIssueStreak(issues ?? [])} animate={false} frozen />
      ) : (
        <p className="footnote">
          Left open · {issue.done} of {issue.total} closed{issue.standfirst ? ` · ${issue.standfirst}` : ""}
        </p>
      )}
    </div>
  );
}
