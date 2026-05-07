// One-shot transform: OLOS reference styles.css → atlas observe-port.css
//
// Strategy:
//   1. Keep `@import` / `@charset` at top untouched.
//   2. The leading `:root { ... }` block:
//        - strip `font-family`, `color`, `background` declarations (these would
//          leak globally and override atlas chrome).
//        - rewrite the selector to `.observe-port` so --olos-* tokens scope
//          to the wrapper. We also keep a duplicate `:root` shell with ONLY
//          the @property-style native-* aspect tokens? No — Mapbox / shell
//          don't rely on these, so .observe-port-only is safe.
//   3. `*`, `html`, `body` rules → drop entirely (atlas owns the document).
//   4. All other top-level rule blocks → prepend `.observe-port ` to each
//      selector in the list (comma-split, trim).
//   5. `@media` / `@supports` blocks → keep wrapper, recurse over inner rules.
//
// CSS in this file uses no @keyframes/@font-face/@supports, so we only special-
// case @media and @import.

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'C:/Users/MY OWN AXIS/Documents/OGDEN Land Operating System/src/styles.css';
const OUT = 'C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas/apps/web/src/v3/observe/styles/observe-port.css';
const WRAPPER = '.observe-port';

const css = readFileSync(SRC, 'utf8');

// Split top-level into tokens: either an at-rule statement, an at-rule block,
// or a regular rule block. We do this with a manual brace walker.

const out = [];
const stripped = {
  rootDecls: [],
  globalRules: 0, // *, html, body
};

let i = 0;
const len = css.length;

function skipWhitespaceAndComments() {
  while (i < len) {
    const ch = css[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) {
        i = len;
      } else {
        i = end + 2;
      }
    } else {
      break;
    }
  }
}

function readUntilBraceOrSemi() {
  // Reads selector / at-rule prelude, respecting strings & parens.
  let start = i;
  let depth = 0;
  while (i < len) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len && css[i] !== quote) {
        if (css[i] === '\\') i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && (ch === '{' || ch === ';')) break;
    i++;
  }
  return css.slice(start, i);
}

function readBlock() {
  // i points at `{`. Reads matching block, returns inner text. Leaves i past `}`.
  if (css[i] !== '{') throw new Error(`expected { at ${i}`);
  i++;
  const start = i;
  let depth = 1;
  while (i < len && depth > 0) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len && css[i] !== quote) {
        if (css[i] === '\\') i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const inner = css.slice(start, i);
        i++;
        return inner;
      }
    }
    i++;
  }
  throw new Error('unterminated block');
}

function scopeSelectorList(selectorList) {
  // Comma-split, trim, prefix each with `.observe-port `.
  // Skip selectors that are pure pseudo-elements at root or already scoped.
  return selectorList
    .split(',')
    .map((sel) => {
      const trimmed = sel.trim();
      if (!trimmed) return null;
      // Already references html/body? Replace with wrapper.
      if (/^(html|body|\*)\b/.test(trimmed)) {
        return null; // dropped — atlas owns these
      }
      return `${WRAPPER} ${trimmed}`;
    })
    .filter(Boolean)
    .join(',\n');
}

function transformRootBlock(inner) {
  // Strip font-family, color, background declarations (top-level only).
  // Naive line-based filter; the :root block is small (~30 lines) and only
  // has flat declarations, no nested rules.
  const cleaned = [];
  for (const rawLine of inner.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      cleaned.push(rawLine);
      continue;
    }
    if (/^(font-family|color|background)\s*:/.test(line)) {
      stripped.rootDecls.push(line);
      continue;
    }
    cleaned.push(rawLine);
  }
  return cleaned.join('\n');
}

function transformInner(inner) {
  // Walk inner of an @media / @supports block. Recurse over nested rules.
  const saved = { i, css };
  // Use a sub-walker by reassigning globals.
  i = 0;
  const original = css;
  // eslint-disable-next-line no-global-assign
  cssLocalReassign(inner);
  const innerOut = [];
  while (i < len) {
    skipWhitespaceAndComments();
    if (i >= len) break;
    const piece = readPiece();
    if (piece) innerOut.push(piece);
  }
  cssLocalReassign(original);
  i = saved.i;
  return innerOut.join('\n');
}

// Trick: we want to recurse, but the walker uses module-level `css`/`len`/`i`.
// Easiest is to make a function that runs the walker on a given string.
function cssLocalReassign(newCss) {
  // eslint-disable-next-line no-global-assign
  css_ = newCss;
}
let css_ = css;
let len_ = len;
// Refactor: walker uses css_/len_ as the active source.

// --- rewrite walker to use css_/len_/i_ ---

function transformAll(src) {
  let out = '';
  let cur = 0;
  const N = src.length;

  function ws() {
    while (cur < N) {
      const ch = src[cur];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        cur++;
      } else if (ch === '/' && src[cur + 1] === '*') {
        const e = src.indexOf('*/', cur + 2);
        cur = e === -1 ? N : e + 2;
      } else {
        break;
      }
    }
  }

  function readPrelude() {
    const s = cur;
    while (cur < N) {
      const ch = src[cur];
      if (ch === '"' || ch === "'") {
        const q = ch;
        cur++;
        while (cur < N && src[cur] !== q) {
          if (src[cur] === '\\') cur += 2;
          else cur++;
        }
        cur++;
        continue;
      }
      if (ch === '/' && src[cur + 1] === '*') {
        const e = src.indexOf('*/', cur + 2);
        cur = e === -1 ? N : e + 2;
        continue;
      }
      if (ch === '{' || ch === ';') break;
      cur++;
    }
    return src.slice(s, cur);
  }

  function readBraceBlock() {
    if (src[cur] !== '{') throw new Error(`expected { at ${cur}`);
    cur++;
    const s = cur;
    let depth = 1;
    while (cur < N && depth > 0) {
      const ch = src[cur];
      if (ch === '"' || ch === "'") {
        const q = ch;
        cur++;
        while (cur < N && src[cur] !== q) {
          if (src[cur] === '\\') cur += 2;
          else cur++;
        }
        cur++;
        continue;
      }
      if (ch === '/' && src[cur + 1] === '*') {
        const e = src.indexOf('*/', cur + 2);
        cur = e === -1 ? N : e + 2;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const inner = src.slice(s, cur);
          cur++;
          return inner;
        }
      }
      cur++;
    }
    throw new Error('unterminated block');
  }

  let isFirst = true;

  while (cur < N) {
    ws();
    if (cur >= N) break;

    const prelude = readPrelude();

    if (cur >= N) {
      // trailing junk
      const t = prelude.trim();
      if (t) out += t + '\n';
      break;
    }

    const term = src[cur];
    if (term === ';') {
      // at-rule statement (e.g. @import, @charset)
      cur++;
      out += prelude.trim() + ';\n\n';
      continue;
    }

    // term === '{'
    const inner = readBraceBlock();
    const sel = prelude.trim();

    // Special handling for the first :root block
    if (isFirst && /^:root\s*$/.test(sel)) {
      isFirst = false;
      const cleaned = transformRootBlock(inner);
      out += `${WRAPPER} {\n${cleaned}\n}\n\n`;
      continue;
    }
    isFirst = false;

    // @media / @supports — recurse.
    if (sel.startsWith('@media') || sel.startsWith('@supports')) {
      const innerScoped = transformAll(inner);
      out += `${sel} {\n${innerScoped}\n}\n\n`;
      continue;
    }

    // Other @ at-rules with a block (@keyframes, @font-face) — keep verbatim.
    if (sel.startsWith('@')) {
      out += `${sel} {${inner}}\n\n`;
      continue;
    }

    // Drop universal/html/body rules entirely.
    if (/^(html|body|\*)(\s*[,{]|\s*$)/.test(sel)) {
      stripped.globalRules++;
      // But: if the selector list mixes globals with scoped selectors,
      // re-scope the non-global ones.
      const remaining = sel
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !/^(html|body|\*)\b/.test(s));
      if (remaining.length === 0) continue;
      const scoped = remaining.map((s) => `${WRAPPER} ${s}`).join(',\n');
      out += `${scoped} {${inner}}\n\n`;
      continue;
    }

    // Regular rule: prefix every selector in the list with WRAPPER.
    const scoped = scopeSelectorList(sel);
    if (!scoped) continue;
    out += `${scoped} {${inner}}\n\n`;
  }

  return out;
}

const result = transformAll(css);

const banner = `/*
 * observe-port.css — generated from OLOS reference styles.css.
 *
 * Source: C:/Users/MY OWN AXIS/Documents/OGDEN Land Operating System/src/styles.css
 * Generator: atlas/scripts/scope-observe-styles.mjs
 *
 * All selectors are scoped under .observe-port so that the OLOS visual system
 * can coexist with atlas's own chrome (V3 sidebar, LandOsShell, etc.) without
 * leaking globally. The leading :root block was rewritten to .observe-port so
 * --olos-* tokens cascade only inside the observe surface; html/body/* rules
 * were dropped (atlas owns the document root).
 *
 * Stripped from :root (would have leaked globally):
${stripped.rootDecls.map((d) => ` *   - ${d}`).join('\n')}
 *
 * Dropped rule blocks (global selectors): ${stripped.globalRules}
 *
 * Re-run after any reference-side update:
 *   node atlas/scripts/scope-observe-styles.mjs
 */

`;

writeFileSync(OUT, banner + result, 'utf8');

console.log(`wrote ${OUT}`);
console.log(`stripped ${stripped.rootDecls.length} :root global decls, ${stripped.globalRules} html/body/* rules`);
