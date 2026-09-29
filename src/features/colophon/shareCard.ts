import { loadIssue } from "../../data/queries";
import { colophonLines } from "../../engine/colophon";
import { dayGauge, monthName, parseKey, runningDate } from "../../engine/daykey";
import { deriveSections, pad2 } from "../../engine/ordering";
import type { DayKey } from "../../engine/types";
import { saveBinary } from "../../platform/files";
import bricolageUrl from "../../styles/fonts/bricolage-grotesque-latin-opsz-normal.woff2?url";
import geistUrl from "../../styles/fonts/geist-latin-wght-normal.woff2?url";
import monoUrl from "../../styles/fonts/geist-mono-latin-wght-normal.woff2?url";

const fontCache = new Map<string, string>();
async function fontData(url: string): Promise<string> {
  const hit = fontCache.get(url);
  if (hit) return hit;
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  fontCache.set(url, b64);
  return b64;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Build the 1080 × 1920 card as an SVG string, set in the app's own fonts and tokens. */
export async function buildCardSvg(dayKey: DayKey, withFonts = true): Promise<{ svg: string; issueNo: number }> {
  const data = await loadIssue(dayKey);
  if (!data?.issue) throw new Error("No issue");
  const { issue, entries, longest } = data;
  const [bg, ink, muted, faint, accent, border] = [
    "--bg",
    "--ink",
    "--ink-muted",
    "--ink-faint",
    "--accent",
    "--border",
  ].map(token);
  const fonts = withFonts
    ? `@font-face{font-family:"B";src:url(data:font/woff2;base64,${await fontData(bricolageUrl)})}
       @font-face{font-family:"G";src:url(data:font/woff2;base64,${await fontData(geistUrl)})}
       @font-face{font-family:"M";src:url(data:font/woff2;base64,${await fontData(monoUrl)})}`
    : "";
  const B = withFonts ? "B" : "system-ui";
  const G = withFonts ? "G" : "system-ui";
  const M = withFonts ? "M" : "monospace";
  const s = deriveSections(entries);
  const rows = [...s.today, ...s.evening].slice(0, 14);
  const gauge = issue.closedAt ? dayGauge(new Date(issue.closedAt), 3) : 1;
  const lines = issue.closedAt
    ? colophonLines({
        issueNo: issue.issueNo,
        closedAt: issue.closedAt,
        total: issue.total,
        streak: issue.streakAtClose ?? 1,
        longest,
      })
    : [`Issue No. ${issue.issueNo}`, `${issue.done} of ${issue.total} closed.`];
  let y = 700;
  const entrySvg = rows
    .map((e) => {
      const f = s.folios.get(e.id);
      const done = e.status === "done";
      const title = esc(e.title.length > 38 ? `${e.title.slice(0, 37)}…` : e.title);
      const width = Math.min(820, title.length * 22);
      const out = `<text x="100" y="${y}" font-family="${M}" font-size="26" fill="${done ? faint : muted}">${done ? "—" : pad2(f ?? 0)}</text>
        <text x="190" y="${y}" font-family="${G}" font-weight="500" font-size="40" fill="${ink}" opacity="${done ? 0.4 : 1}">${title}</text>
        ${done ? `<line x1="190" x2="${190 + width}" y1="${y - 13}" y2="${y - 13}" stroke="${accent}" stroke-width="2"/>` : ""}
        <line x1="100" x2="980" y1="${y + 34}" y2="${y + 34}" stroke="${border}" stroke-width="2"/>`;
      y += 84;
      return out;
    })
    .join("");
  const colY = Math.max(y + 80, 1500);
  const col = lines
    .map((l, i) =>
      i === 0
        ? `<text x="100" y="${colY + 90}" font-family="${B}" font-weight="300" font-size="96" fill="${ink}">${esc(l)}</text>`
        : `<text x="100" y="${colY + 90 + i * 52}" font-family="${M}" font-size="30" fill="${i === 3 ? muted : ink}">${esc(l)}</text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <style>${fonts}</style>
    <rect width="1080" height="1920" fill="${bg}"/>
    <text x="100" y="170" font-family="${M}" font-weight="500" font-size="26" letter-spacing="3" fill="${muted}">NOCTURNE · No. ${issue.issueNo} · ${runningDate(dayKey)}</text>
    <text x="980" y="170" text-anchor="end" font-family="${M}" font-weight="500" font-size="26" fill="${muted}">${issue.done} / ${issue.total}</text>
    <rect x="100" y="200" width="880" height="2" fill="${border}"/>
    <rect x="100" y="200" width="${Math.round(880 * gauge)}" height="2" fill="${accent}"/>
    <text x="90" y="520" font-family="${B}" font-weight="300" font-size="300" fill="${ink}">${String(parseKey(dayKey).d).padStart(2, "0")}</text>
    <text x="520" y="520" font-family="${B}" font-weight="200" font-size="60" fill="${ink}">${monthName(dayKey)}</text>
    ${entrySvg}
    ${issue.closedAt ? `<rect x="100" y="${colY}" width="880" height="2" fill="${accent}"/>` : ""}
    ${col}
    ${issue.standfirst ? `<text x="100" y="${colY + 360}" font-family="${B}" font-weight="200" font-size="40" fill="${ink}">${esc(issue.standfirst.slice(0, 48))}</text>` : ""}
  </svg>`;
  return { svg, issueNo: issue.issueNo };
}

async function rasterise(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Render the issue as a PNG and download/share it. Falls back to system fonts if embedded fonts are refused. */
export async function shareIssue(dayKey: DayKey): Promise<void> {
  let card = await buildCardSvg(dayKey, true);
  let png: Blob;
  try {
    png = await rasterise(card.svg);
  } catch {
    card = await buildCardSvg(dayKey, false);
    png = await rasterise(card.svg);
  }
  await saveBinary(`nocturne-issue-${card.issueNo}.png`, png);
}
