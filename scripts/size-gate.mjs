// CI budget: the initial JS (entry chunk + its static imports) must stay ≤ 200 KB gzip.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const html = readFileSync("dist/index.html", "utf8");
const files = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const f of new Set(files)) {
  const gz = gzipSync(readFileSync(`dist/${f}`)).length;
  total += gz;
  console.log(`${f}  ${(gz / 1024).toFixed(1)} KB gz`);
}
console.log(`initial JS: ${(total / 1024).toFixed(1)} KB gz (budget 200)`);
if (total > 200 * 1024) process.exit(1);
