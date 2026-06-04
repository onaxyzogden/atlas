// stratum-prose-codemod.mjs — Slice 1 follow-up: renumber residual human-readable
// "Tier N" / "T{n}" references that the slug/symbol codemod did not touch.
//
// SCRATCH / NOT COMMITTED (like stratum-codemod.mjs + the repo's _dump_*.py). The
// first codemod renamed slug TOKENS (t0- -> s1-) + uppercase refs (-T0. -> -S1.) +
// TS symbols. This pass renumbers the PROSE the UI renders (catalogue checklist
// copy) and the section-divider comments: Tier {0-6} -> Stratum {n+1}.
//
// Allowlists are tight and EXCLUDE:
//   - remapSlug.ts (intentional "Tier 0-6" header + t0->s1 examples)
//   - denylisted pipeline-tier files (featureManifest, dataSources, computeScores,
//     layer.schema, project.schema:46 "Tier 1 pipeline") -- NOT in either list
//   - test files (their prose descriptions + invalid fixtures are Slice 4 work)
// Within the 5 catalogues every "Tier N" is a Plan-spine reference (no pipeline
// tiers there), so Rule A is safe. Verify by `git diff` + re-grep + tsc.
import { readFileSync, writeFileSync } from 'node:fs';

const SHARED = 'packages/shared/src';

// Rule A: "Tier N" prose + catalogue "---- Tier 0" dividers + "Tier N" comments.
const A_FILES = [
  `${SHARED}/constants/plan/catalogues/universal.ts`,
  `${SHARED}/constants/plan/catalogues/regenFarm.ts`,
  `${SHARED}/constants/plan/catalogues/ecovillage.ts`,
  `${SHARED}/constants/plan/catalogues/agritourism.ts`,
  `${SHARED}/constants/plan/catalogues/residential.ts`,
];
// Rule B: bare "T{n}" section-divider tokens (the `// ---------- T0 ----------`
// style). After pass 1 the ONLY T0-6 tokens left in these two files are dividers.
const B_FILES = [
  `${SHARED}/constants/plan/tierObjectives.ts`,
  `${SHARED}/relationships/objectiveObserveDomains.ts`,
];

const A_RE = /\bTier ([0-6])\b/g;
const B_RE = /\bT([0-6])\b/g;

function run(files, re, label) {
  let grand = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    let n = 0;
    const out = src.replace(re, (_m, d) => {
      n++;
      return label === 'A' ? `Stratum ${Number(d) + 1}` : `S${Number(d) + 1}`;
    });
    if (out !== src) writeFileSync(f, out, 'utf8');
    grand += n;
    console.log(`${n === 0 ? '  --  ' : 'EDIT  '} [${label}] ${f}  (${n})`);
  }
  return grand;
}

const a = run(A_FILES, A_RE, 'A');
const b = run(B_FILES, B_RE, 'B');
console.log(`TOTAL prose/divider replacements: A=${a} B=${b} (${a + b})`);
