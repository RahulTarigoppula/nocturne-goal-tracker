import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "./index";

/** Save a text file: web download, Android cache file + share sheet. */
export async function saveText(name: string, text: string, mime = "application/json"): Promise<void> {
  if (isNative()) {
    const res = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: name, files: [res.uri] });
    return;
  }
  downloadBlob(name, new Blob([text], { type: mime }));
}

export async function saveBinary(name: string, blob: Blob): Promise<void> {
  if (isNative()) {
    const data = await blobToBase64(blob);
    const res = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    await Share.share({ title: name, files: [res.uri] });
    return;
  }
  downloadBlob(name, blob);
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Open a file picker and read the chosen file as text (works in the WebView too). */
export function pickText(accept = "application/json,.json"): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener");
}
