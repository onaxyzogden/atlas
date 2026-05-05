#!/usr/bin/env node
// Typography ratchet — fails when CSS reintroduces sub-12px text or sub-12px
// rem equivalents. Hardcoded mid-range sizes (>=12px) are tolerated for now;
// the long-term goal is full token adoption, but the ratchet only enforces
// the floor that the SaaS Design Scholar called out as legibility-critical.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");

const SUB_TWELVE_PX = /font-size:\s*([0-9]|1[01])(\.[0-9]+)?px(?!\s*\*)/g;
const SUB_TWELVE_REM = /font-size:\s*0\.[0-6][0-9]?rem/g; // <0.75rem = <12px
const FORBIDDEN_TOKENS = /font-size:\s*var\(--text-(2xs|xs)\)/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith(".css")) out.push(p);
  }
  return out;
}

let violations = 0;
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (
      SUB_TWELVE_PX.test(line) ||
      SUB_TWELVE_REM.test(line) ||
      FORBIDDEN_TOKENS.test(line)
    ) {
      console.error(`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
      violations++;
    }
    SUB_TWELVE_PX.lastIndex = 0;
    SUB_TWELVE_REM.lastIndex = 0;
    FORBIDDEN_TOKENS.lastIndex = 0;
  });
}

if (violations > 0) {
  console.error(`\n${violations} sub-12px font-size declaration(s) found.`);
  console.error(
    "Use var(--text-sm) (12px) minimum. Differentiate hierarchy with color/weight tokens, not size."
  );
  process.exit(1);
}
console.log("typography ratchet: OK (no sub-12px font-size declarations).");
