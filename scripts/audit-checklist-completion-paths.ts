// audit-checklist-completion-paths.ts
//
// Read-only audit: classify EVERY checklist item on EVERY standalone catalogue
// objective by its in-app completion path (see
// packages/shared/src/relationships/objectiveCompletionPaths.ts for the
// taxonomy). This is the item-level companion to
// audit-act-objective-coverage.ts (which audits objective-level tool wiring).
//
// Classifications:
//   auto-answer / auto-formula / form-capture  -> per-item, evidence-backed
//   objective-map / objective-log / objective-flow -> in-app instrument exists
//        at objective level, but THIS item is a manual tick
//   no-path -> bare manual tick only (the gap-closure backlog)
//
// Unlike the objective-level audit this script must ALSO import the app-layer
// ACT_TOOL_CATALOG (arm shapes: form formIds, map/log/flow kinds), which pulls
// lucide-react — fine under tsx. `@ogden/shared` is NOT symlinked at the repo
// root, so shared is imported by relative path (same convention as
// audit-act-objective-coverage.ts).
//
// Run:              npx tsx scripts/audit-checklist-completion-paths.ts
// Refresh baseline: npx tsx scripts/audit-checklist-completion-paths.ts --write-baseline
//
// Out: scripts/audit-out/checklist-completion-paths.md
//      scripts/audit-out/checklist-completion-paths.json
//      (--write-baseline) apps/web/src/v3/act/tier-shell/__tests__/
//                         completionPathGaps.baseline.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditAllCompletionPaths,
  type ActToolArmIndex,
  type ItemCompletionClass,
  type ItemCompletionPath,
} from '../packages/shared/src/index.js';
import { ACT_TOOL_CATALOG } from '../apps/web/src/v3/act/tier-shell/actToolCatalog.js';
import { TIER_ZERO_OBJECTIVE_IDS } from '../apps/web/src/v3/act/tier-shell/tierZeroObjectives.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_MD = resolve(HERE, 'audit-out/checklist-completion-paths.md');
const OUT_JSON = resolve(HERE, 'audit-out/checklist-completion-paths.json');
const BASELINE_PATH = resolve(
  HERE,
  '../apps/web/src/v3/act/tier-shell/__tests__/completionPathGaps.baseline.json',
);

const writeBaseline = process.argv.includes('--write-baseline');

// ---------------------------------------------------------------------------
// Build the arm index from the real catalogue and run the shared audit.
// ---------------------------------------------------------------------------

const armIndex: ActToolArmIndex = Object.fromEntries(
  Object.entries(ACT_TOOL_CATALOG).map(([id, tool]) => [
    id,
    tool.arm.kind === 'form'
      ? { kind: tool.arm.kind, formId: tool.arm.formId }
      : { kind: tool.arm.kind },
  ]),
);

// Workbench routing injected from the live Tier-0 membership set (same
// injection the ratchet test uses): every item of a workbench objective
// records via DecisionWorkingPanel -> saveVisionFormData + setItemComplete.
const audit = auditAllCompletionPaths(armIndex, {
  workbenchObjectiveIds: TIER_ZERO_OBJECTIVE_IDS,
});

// ---------------------------------------------------------------------------
// Summaries: by classification, by stratum, by type prefix.
// ---------------------------------------------------------------------------

const CLASS_ORDER: ItemCompletionClass[] = [
  'auto-answer',
  'auto-formula',
  'form-capture',
  'workbench-capture',
  'objective-map',
  'objective-log',
  'objective-flow',
  'no-path',
];

/** Operator-composition gap-closure priority (ecovillage + orchards + silvopasture + nursery + homestead). */
const PREFIX_PRIORITY = [
  'universal',
  'ev-',
  'orch-',
  'silv-',
  'nur-',
  'hms-',
] as const;

function prefixOf(objectiveId: string): string {
  const m = /^([a-z]+-(?:sec-)?)/.exec(objectiveId);
  if (!m) return 'universal';
  const head = m[1];
  // Universal ids are s1-..s7-; everything else is a type prefix.
  if (/^s[1-7]-$/.test(head)) return 'universal';
  return head.endsWith('sec-') ? head : head;
}

function priorityRank(prefix: string): number {
  const idx = PREFIX_PRIORITY.findIndex((p) =>
    p === 'universal' ? prefix === 'universal' : prefix.startsWith(p),
  );
  return idx === -1 ? PREFIX_PRIORITY.length : idx;
}

const byClass = new Map<ItemCompletionClass, number>(
  CLASS_ORDER.map((c) => [c, audit.countsByClassification[c]]),
);
const totalItems = audit.items.length;

const byStratum = new Map<string, Map<ItemCompletionClass, number>>();
const byPrefix = new Map<string, Map<ItemCompletionClass, number>>();
for (const item of audit.items) {
  const stratum = byStratum.get(item.stratumId) ?? new Map();
  stratum.set(item.classification, (stratum.get(item.classification) ?? 0) + 1);
  byStratum.set(item.stratumId, stratum);
  const prefix = prefixOf(item.objectiveId);
  const pm = byPrefix.get(prefix) ?? new Map();
  pm.set(item.classification, (pm.get(item.classification) ?? 0) + 1);
  byPrefix.set(prefix, pm);
}

const noPathItems = audit.items.filter((i) => i.classification === 'no-path');
const objectiveLevelItems = audit.items.filter((i) =>
  i.classification.startsWith('objective-'),
);

// ---------------------------------------------------------------------------
// Suggested capture kind per no-path item (advisory only, for the backlog).
// ---------------------------------------------------------------------------

function suggestCapture(item: ItemCompletionPath): string {
  const label = item.itemLabel.toLowerCase();
  if (/(budget|cost|capital|fund|financ|cash)/.test(label)) {
    return 'financial worksheet (Amanah-clean)';
  }
  if (/(schedule|calendar|timing|sequence|phase|rotation)/.test(label)) {
    return 'schedule/protocol capture';
  }
  if (/(map|zone|site|locat|place|area|boundar)/.test(label)) {
    return 'map arm (per-item bridge)';
  }
  if (/(monitor|review|assess|evaluate|record|log)/.test(label)) {
    return 'log arm / review flow';
  }
  return 'decision form (form arm, formId = item id)';
}

// ---------------------------------------------------------------------------
// Render markdown.
// ---------------------------------------------------------------------------

const lines: string[] = [];
lines.push('# Checklist Completion-Path Audit (item level)');
lines.push('');
lines.push(
  '_Generated by `scripts/audit-checklist-completion-paths.ts` — drives the shared `auditAllCompletionPaths` classifier against the real `ACT_TOOL_CATALOG` arm index (the exact inputs the app-layer ratchet test pins)._',
);
lines.push('');
lines.push(
  `**Totals:** ${totalItems} checklist items across ${new Set(audit.items.map((i) => i.objectiveId)).size} standalone catalogue objectives. ` +
    `Patch-injected items are out of scope this phase (documented in the classifier header).`,
);
lines.push('');

lines.push('## Gap-closure priority (operator composition)');
lines.push('');
lines.push(
  'Order for follow-up sessions, per the approved plan: **universal → ecovillage (`ev-`) → orchard (`orch-`) → silvopasture (`silv-`) → nursery (`nur-`) → homestead (`hms-`) → all others** — the operator is building an ecovillage (intentional community) with orchards, food-forest guilds, silvopasture, and a nursery.',
);
lines.push('');

lines.push('## Summary by classification');
lines.push('');
lines.push('| Classification | Items | Share | Per-item evidence-backed? |');
lines.push('|---|--:|--:|---|');
for (const c of CLASS_ORDER) {
  const n = byClass.get(c) ?? 0;
  const evid =
    c === 'auto-answer' ||
    c === 'auto-formula' ||
    c === 'form-capture' ||
    c === 'workbench-capture'
      ? 'yes'
      : c === 'no-path'
        ? '**no — gap**'
        : 'no (objective-level instrument, manual tick)';
  lines.push(
    `| \`${c}\` | ${n} | ${((n / totalItems) * 100).toFixed(1)}% | ${evid} |`,
  );
}
lines.push('');

lines.push('## Summary by type prefix');
lines.push('');
lines.push('| Prefix | Priority | Items | no-path | objective-level | evidence-backed |');
lines.push('|---|--:|--:|--:|--:|--:|');
const prefixes = [...byPrefix.keys()].sort(
  (a, b) => priorityRank(a) - priorityRank(b) || a.localeCompare(b),
);
for (const p of prefixes) {
  const m = byPrefix.get(p)!;
  const total = [...m.values()].reduce((s, n) => s + n, 0);
  const np = m.get('no-path') ?? 0;
  const ol =
    (m.get('objective-map') ?? 0) +
    (m.get('objective-log') ?? 0) +
    (m.get('objective-flow') ?? 0);
  const rank = priorityRank(p);
  lines.push(
    `| \`${p}\` | ${rank < PREFIX_PRIORITY.length ? `P${rank + 1}` : '—'} | ${total} | ${np} | ${ol} | ${total - np - ol} |`,
  );
}
lines.push('');

lines.push('## Summary by stratum');
lines.push('');
lines.push('| Stratum | Items | no-path | objective-level | evidence-backed |');
lines.push('|---|--:|--:|--:|--:|');
for (const s of [...byStratum.keys()].sort()) {
  const m = byStratum.get(s)!;
  const total = [...m.values()].reduce((sum, n) => sum + n, 0);
  const np = m.get('no-path') ?? 0;
  const ol =
    (m.get('objective-map') ?? 0) +
    (m.get('objective-log') ?? 0) +
    (m.get('objective-flow') ?? 0);
  lines.push(`| ${s} | ${total} | ${np} | ${ol} | ${total - np - ol} |`);
}
lines.push('');

lines.push('## Unmatched form arms (formId matches no checklist item)');
lines.push('');
if (audit.unmatchedFormArms.length === 0) {
  lines.push('_None._');
} else {
  lines.push('| Objective | Tool | formId |');
  lines.push('|---|---|---|');
  for (const u of audit.unmatchedFormArms) {
    lines.push(`| \`${u.objectiveId}\` | \`${u.toolId}\` | \`${u.formId}\` |`);
  }
}
lines.push('');

lines.push('## No-path items (the ratchet set — prioritized)');
lines.push('');
lines.push('| Objective | Ref | Stratum | Item | Label | Optional | Suggested capture |');
lines.push('|---|---|---|---|---|---|---|');
const noPathSorted = [...noPathItems].sort(
  (a, b) =>
    priorityRank(prefixOf(a.objectiveId)) -
      priorityRank(prefixOf(b.objectiveId)) ||
    a.stratumId.localeCompare(b.stratumId) ||
    a.objectiveId.localeCompare(b.objectiveId),
);
for (const i of noPathSorted) {
  lines.push(
    `| \`${i.objectiveId}\` | ${i.objectiveRef ?? ''} | ${i.stratumId} | \`${i.itemId}\` | ${i.itemLabel.replaceAll('|', '\\|')} | ${i.optional ? 'yes' : ''} | ${suggestCapture(i)} |`,
  );
}
lines.push('');

lines.push('## Objective-level-only items (second-tier gap set)');
lines.push('');
lines.push(
  '_The objective has an in-app instrument (map / log / flow), but these items are manual ticks. Listed per objective; closure usually means per-item form arms or capture bridges._',
);
lines.push('');
lines.push('| Objective | Stratum | Items (manual ticks) | Via |');
lines.push('|---|---|--:|---|');
const olByObjective = new Map<string, ItemCompletionPath[]>();
for (const i of objectiveLevelItems) {
  const bucket = olByObjective.get(i.objectiveId) ?? [];
  bucket.push(i);
  olByObjective.set(i.objectiveId, bucket);
}
for (const [objId, items] of [...olByObjective.entries()].sort(
  (a, b) =>
    priorityRank(prefixOf(a[0])) - priorityRank(prefixOf(b[0])) ||
    a[0].localeCompare(b[0]),
)) {
  const kinds = [...new Set(items.map((i) => i.classification))].join(', ');
  lines.push(`| \`${objId}\` | ${items[0].stratumId} | ${items.length} | ${kinds} |`);
}
lines.push('');

mkdirSync(dirname(OUT_MD), { recursive: true });
writeFileSync(OUT_MD, lines.join('\n'), 'utf8');

// Full machine-readable dump (items + gap maps + counts).
writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      generatedBy: 'scripts/audit-checklist-completion-paths.ts',
      totals: {
        items: totalItems,
        countsByClassification: audit.countsByClassification,
      },
      noPath: audit.noPath,
      objectiveSpatialOnly: audit.objectiveSpatialOnly,
      unmatchedFormArms: audit.unmatchedFormArms,
      items: audit.items,
    },
    null,
    2,
  ),
  'utf8',
);

if (writeBaseline) {
  // The ratchet fixture is EXACTLY the audit's gap maps — regenerating it here
  // is the only sanctioned way to move the baseline, so test and report can
  // never disagree.
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        '//': 'Ratchet baseline for completionPathAudit.ratchet.test.ts. Regenerate ONLY via: npx tsx scripts/audit-checklist-completion-paths.ts --write-baseline',
        noPath: audit.noPath,
        objectiveSpatialOnly: audit.objectiveSpatialOnly,
        intentionalUnmatchedFormIds: audit.unmatchedFormArms.map((u) => u.formId).sort(),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`Baseline written to ${BASELINE_PATH}`);
}

const npCount = noPathItems.length;
const olCount = objectiveLevelItems.length;
console.log(
  `Classified ${totalItems} items: ${npCount} no-path, ${olCount} objective-level-only, ` +
    `${totalItems - npCount - olCount} per-item evidence-backed.`,
);
console.log(
  `Unmatched form arms: ${audit.unmatchedFormArms.length}` +
    (audit.unmatchedFormArms.length
      ? ` (${audit.unmatchedFormArms.map((u) => u.formId).join(', ')})`
      : ''),
);
console.log(`Report written to ${OUT_MD}`);
