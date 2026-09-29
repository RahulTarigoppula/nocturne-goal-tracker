import { Preferences } from "@capacitor/preferences";
import { isNative } from "./index";

/**
 * The GitHub token lives on-device only and never enters IndexedDB (so it can never reach an export).
 * Web: AES-GCM ciphertext in localStorage, key non-extractable in its own IndexedDB store.
 * Android: app-private Preferences. "Session only" keeps it in memory.
 */
const STORE_KEY = "nocturne.pat";
const KEY_DB = "nocturne-keys";
let sessionToken: string | null = null;

function keyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(KEY_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("keys");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function cryptoKey(): Promise<CryptoKey> {
  const kdb = await keyStore();
  const existing = await new Promise<CryptoKey | undefined>((resolve) => {
    const g = kdb.transaction("keys").objectStore("keys").get("pat");
    g.onsuccess = () => resolve(g.result as CryptoKey | undefined);
    g.onerror = () => resolve(undefined);
  });
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await new Promise<void>((resolve, reject) => {
    const t = kdb.transaction("keys", "readwrite");
    t.objectStore("keys").put(key, "pat");
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return key;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function saveToken(token: string, sessionOnly: boolean): Promise<void> {
  await forgetToken();
  if (sessionOnly) {
    sessionToken = token;
    return;
  }
  if (isNative()) {
    await Preferences.set({ key: STORE_KEY, value: token });
    return;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(token)),
  );
  localStorage.setItem(STORE_KEY, JSON.stringify({ iv: b64(iv), ct: b64(ct) }));
}

export async function loadToken(): Promise<string | null> {
  if (sessionToken) return sessionToken;
  try {
    if (isNative()) return (await Preferences.get({ key: STORE_KEY })).value;
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const { iv, ct } = JSON.parse(raw) as { iv: string; ct: string };
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await cryptoKey(), unb64(ct));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

export async function forgetToken(): Promise<void> {
  sessionToken = null;
  if (isNative()) await Preferences.remove({ key: STORE_KEY }).catch(() => {});
  else localStorage.removeItem(STORE_KEY);
}

/** "PAT ····· 7f" — the only way a token is ever shown. */
export const maskToken = (t: string): string => `PAT ····· ${t.slice(-2)}`;
