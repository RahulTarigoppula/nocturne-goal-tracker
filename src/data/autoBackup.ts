import { exportAll } from "./backup";
import { pushBackup } from "./gist";
import { getRevision, getSettings, markBackedUp } from "./repo";

const SIX_HOURS = 6 * 3_600_000;

/**
 * Auto-backup to the user's gist: at most once per 6 hours, only when the revision changed,
 * never on a metered connection. Failures are silent here; the Colophon shows the last success.
 */
export async function maybeAutoBackup(loadToken: () => Promise<string | null>, now = Date.now()): Promise<boolean> {
  const s = await getSettings();
  if (!s.backup.auto || !s.backup.gistId) return false;
  if (s.backup.lastBackupAt && now - s.backup.lastBackupAt < SIX_HOURS) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData || navigator.onLine === false) return false;
  const revision = await getRevision();
  if (s.backup.lastBackupRevision === revision) return false;
  const token = await loadToken();
  if (!token) return false;
  try {
    await pushBackup(token, await exportAll(__APP_VERSION__), s.backup.gistId);
    await markBackedUp({ at: now });
    return true;
  } catch {
    return false;
  }
}
