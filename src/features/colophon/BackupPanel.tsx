import { useEffect, useState } from "react";
import {
  BackupError,
  backupFileName,
  exportAll,
  importAll,
  mergeRemote,
  parseBackup,
  toMarkdown,
} from "../../data/backup";
import { GistError, pullBackup, pushBackup, verify } from "../../data/gist";
import { useSettings } from "../../data/queries";
import { getRevision, saveSettings } from "../../data/repo";
import { localKey } from "../../engine/daykey";
import type { Settings } from "../../engine/types";
import { isNative } from "../../platform";
import { pickText, saveText } from "../../platform/files";
import { scheduleSync } from "../../platform/notifications";
import { forgetToken, loadToken, maskToken, saveToken } from "../../platform/secrets";

function ago(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function BackupPanel() {
  const settings = useSettings();
  const [status, setStatus] = useState<{ tone: "muted" | "ok" | "error"; text: string } | null>(null);
  const [storage, setStorage] = useState<string>("…");
  const [token, setToken] = useState<string | null>(null);
  const [pat, setPat] = useState("");
  const [sessionOnly, setSessionOnly] = useState(false);
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    loadToken().then(setToken);
    if (isNative()) setStorage("app-private");
    else if (navigator.storage?.persisted)
      navigator.storage.persisted().then((p) => setStorage(p ? "persistent" : "best-effort"));
    else setStorage("best-effort");
  }, []);

  if (!settings) return null;
  const version = __APP_VERSION__;

  const doExport = async () => {
    const file = await exportAll(version);
    await saveText(backupFileName(Date.now()), JSON.stringify(file));
    setStatus({ tone: "muted", text: `Exported ${file.data.entries.length} entries.` });
  };
  const doMarkdown = async () => {
    const file = await exportAll(version);
    await saveText(`nocturne-${localKey(new Date())}.md`, toMarkdown(file), "text/markdown");
  };
  const doImport = async () => {
    const text = await pickText();
    if (!text) return;
    try {
      const file = parseBackup(text);
      await importAll(file, (d, t) =>
        setStatus({ tone: "muted", text: `Importing ${d.toLocaleString("en")} / ${t.toLocaleString("en")}` }),
      );
      setStatus({ tone: "muted", text: "Imported. Every entry is back in place." });
      scheduleSync();
      const s = file.data.settings[0];
      if (s) localStorage.setItem("nocturne.theme", s.theme);
    } catch (e) {
      setStatus({
        tone: "error",
        text: e instanceof BackupError ? e.message : "Import failed — the file was not changed",
      });
    }
  };

  const gistBackup = async (s: Settings, t: string) => {
    try {
      setStatus({ tone: "muted", text: "Printing to the gist…" });
      const file = await exportAll(version);
      const id = await pushBackup(t, file, s.backup.gistId);
      await saveSettings({
        backup: { ...s.backup, gistId: id, lastBackupAt: Date.now(), lastBackupRevision: await getRevision() },
      });
      setStatus(null);
    } catch (e) {
      setStatus({
        tone: e instanceof GistError && e.kind === "offline" ? "muted" : "error",
        text: e instanceof GistError ? e.message : "Backup failed — Retry",
      });
    }
  };
  const gistRestore = async (s: Settings, t: string) => {
    if (!s.backup.gistId) return;
    try {
      setStatus({ tone: "muted", text: "Reading the gist…" });
      const text = await pullBackup(t, s.backup.gistId);
      await mergeRemote(parseBackup(text));
      await saveSettings({ backup: { ...s.backup, lastBackupAt: Date.now() } });
      scheduleSync();
      setStatus({ tone: "muted", text: "Merged. Newer edits on either side were kept." });
    } catch (e) {
      setStatus({
        tone: "error",
        text: e instanceof GistError || e instanceof BackupError ? e.message : "Restore failed",
      });
    }
  };
  const connect = async () => {
    const t = pat.trim();
    if (!t) return;
    try {
      const who = await verify(t);
      await saveToken(t, sessionOnly);
      setToken(t);
      setLogin(who);
      setPat("");
      setStatus({ tone: "muted", text: `Backing up as @${who}` });
    } catch (e) {
      setStatus({ tone: "error", text: e instanceof GistError ? e.message : "Could not verify the token" });
    }
  };

  const last = settings.backup.lastBackupAt;
  return (
    <section className="set-group" aria-labelledby="backups-head">
      <div className="section-head rh" id="backups-head">
        <span>Backups</span>
      </div>
      {last && settings.backup.gistId && (
        <div className="set-row">
          <span className="lbl">Last printed</span>
          <span className="val ok">
            {ago(last)} · gist {settings.backup.gistId.slice(0, 6)}
          </span>
        </div>
      )}
      <div className="set-row">
        <span className="lbl">Storage</span>
        <span className="val">{storage}</span>
      </div>
      <div className="set-row">
        <span className="lbl">
          Export
          <small>JSON restores · Markdown is for reading</small>
        </span>
        <span className="val">
          <button type="button" className="btn-text" onClick={doExport}>
            JSON
          </button>
          <button type="button" className="btn-text" onClick={doMarkdown}>
            Markdown
          </button>
        </span>
      </div>
      <div className="set-row">
        <span className="lbl">
          Import
          <small>Replaces everything on this device</small>
        </span>
        <span className="val">
          <button type="button" className="btn-text" onClick={doImport}>
            Choose file
          </button>
        </span>
      </div>
      <div className="set-row">
        <span className="lbl">
          GitHub Gist
          <small>
            {token
              ? login
                ? `@${login}`
                : "Token saved on this device"
              : "Fine-grained token · Gists: read and write"}
          </small>
        </span>
        <span className="val">{token ? maskToken(token) : ""}</span>
      </div>
      {token ? (
        <div className="set-row">
          <span className="lbl">
            <small>Whole-record last-writer-wins: the newer edit of an entry survives.</small>
          </span>
          <span className="val">
            <button type="button" className="btn-text" onClick={() => gistBackup(settings, token)}>
              Back up
            </button>
            {settings.backup.gistId && (
              <button type="button" className="btn-text" onClick={() => gistRestore(settings, token)}>
                Restore
              </button>
            )}
            <button
              type="button"
              className="btn-text"
              aria-pressed={settings.backup.auto}
              onClick={() => saveSettings({ backup: { ...settings.backup, auto: !settings.backup.auto } })}
            >
              {settings.backup.auto ? "Auto · on" : "Auto · off"}
            </button>
            <button
              type="button"
              className="btn-text muted"
              onClick={async () => {
                await forgetToken();
                setToken(null);
                setLogin(null);
              }}
            >
              Forget
            </button>
          </span>
        </div>
      ) : (
        <div className="set-row" style={{ gridTemplateColumns: "1fr" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connect();
            }}
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <input
              className="field"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="github_pat_…"
              aria-label="GitHub fine-grained token"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              style={{ flex: "1 1 200px", fontFamily: "var(--font-mono)" }}
            />
            <label className="rh" style={{ display: "inline-flex", gap: 6, alignItems: "center", minHeight: 44 }}>
              <input type="checkbox" checked={sessionOnly} onChange={(e) => setSessionOnly(e.target.checked)} />
              Session only
            </label>
            <button type="submit" className="btn-text">
              Connect
            </button>
          </form>
        </div>
      )}
      {status && (
        <p className={`footnote${status.tone === "error" ? " error" : ""}`} role="status">
          {status.text}
        </p>
      )}
    </section>
  );
}
