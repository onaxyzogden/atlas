#!/usr/bin/env node
/**
 * One-shot migration: split wiki/log.md (monolith) into per-entry
 * files under wiki/log/YYYY-MM-DD-slug.md, then rewrite wiki/log.md as
 * a reverse-chronological index. See
 * wiki/concepts/parallel-session-coordination.md for rationale.
 *
 * Re-runnable: deletes existing wiki/log/*.md before regenerating.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const logPath = join(repoRoot, 'wiki', 'log.md');
const logDir = join(repoRoot, 'wiki', 'log');

const src = readFileSync(logPath, 'utf8');

// Date prefix YYYY-MM-DD plus optional qualifier (e.g. "(late)", "(latest+3)",
// "(late-late²)", "/ 2026-04-24") up to the em-dash separator.
// Qualifier is greedy-lazy across any chars except newline; separator must be
// an em-dash or en-dash flanked by spaces (we never used a plain hyphen as the
// separator, only em/en, so the qualifier can safely contain hyphens).
const HEADING = /^## (\d{4}-\d{2}-\d{2})([^\n]*?)?\s+[—–]\s+(.+)$/gm;

// Find all heading offsets + text
const headings = [];
let m;
while ((m = HEADING.exec(src)) !== null) {
  const date = m[1];
  const qualifier = (m[2] ?? '').trim();
  const title = m[3].trim();
  headings.push({ date, qualifier, title, start: m.index, line: m[0] });
}

if (headings.length === 0) {
  console.error('No headings found — log.md may already be the index. Aborting.');
  process.exit(1);
}

// Slice bodies (heading line + content up to next heading or EOF)
for (let i = 0; i < headings.length; i++) {
  const end = i + 1 < headings.length ? headings[i + 1].start : src.length;
  // Body excludes the heading line itself — strip from the line break after the heading.
  const headingEnd = headings[i].start + headings[i].line.length;
  let body = src.slice(headingEnd, end).replace(/^\r?\n/, '').replace(/\r?\n+---\r?\n+\s*$/, '\n').replace(/\s+$/, '');
  headings[i].body = body;
}

// Slugify
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

// Wipe existing log/ dir (re-runnable)
if (existsSync(logDir)) {
  for (const f of readdirSync(logDir)) {
    if (f.endsWith('.md')) unlinkSync(join(logDir, f));
  }
} else {
  mkdirSync(logDir, { recursive: true });
}

// Track per-date slug collisions
const used = new Map(); // key: filenameBase, val: count
const written = [];

for (const h of headings) {
  let base = `${h.date}-${slugify(h.title)}`;
  if (!base.endsWith('.md')) base = base; // no-op, naming clarity
  let candidate = base;
  let n = 1;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  used.set(candidate, 1);

  const file = `${candidate}.md`;
  const out = `# ${h.date} — ${h.title}\n\n${h.body}\n`;
  writeFileSync(join(logDir, file), out, 'utf8');
  written.push({ ...h, file });
}

// Sort reverse-chronological (date desc, original order within day so newest top)
// Original log was written top=newest, so preserve that ordering.
const indexLines = written.map((h) => {
  // First non-empty paragraph line of body as hook, trimmed.
  const firstPara = h.body.split(/\r?\n\r?\n/).find((p) => p.trim().length > 0) ?? '';
  const oneLine = firstPara.replace(/\s+/g, ' ').trim();
  const hook = oneLine.length > 140 ? oneLine.slice(0, 137) + '…' : oneLine;
  return `- [${h.date} — ${h.title}](log/${h.file})${hook ? ` — ${hook}` : ''}`;
});

const newLog = `# Operation Log

Chronological record of significant operations. Each entry is its own file under \`log/\`; this page is the reverse-chronological index. See [concepts/parallel-session-coordination.md](concepts/parallel-session-coordination.md) for why.

${indexLines.join('\n')}
`;

writeFileSync(logPath, newLog, 'utf8');

console.log(`Wrote ${written.length} entry files to wiki/log/ and rebuilt wiki/log.md as an index.`);
