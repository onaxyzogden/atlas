// audit-act-objective-coverage.ts
//
// Read-only audit: for every Plan objective resolved across ALL 14 project
// types, report whether the Act stage can let a user COMPLETE and RECORD
// completion of that objective's task set.
//
// It drives the exact same @ogden/shared resolvers the live Act tier shell
// (ActTierShell / ActTierExecutionPanel) consumes, so the verdict matches the
// running UI rather than re-deriving anything:
//
//   - getObjectiveActTools(obj)          -> bottom-rail tools (override -> stratum default -> [])
//   - OBJECTIVE_ACT_TOOLS_OVERRIDE[id]   -> does the objective have an EXPLICIT per-type override?
//   - getPrimaryDomainForObjective(obj)  -> null => "Record observation" button is permanently disabled
//   - getObjectiveEvidence(obj)          -> required-evidence count feeding the Record gate
//   - obj.checklist.length               -> the task set (always present)
//
// Gap taxonomy emitted:
//   Gap A  — objective relies on the coarse stratum default (no explicit override). Universal (s*)
//            and silvopasture (silv-*) are covered; every other type catalogue is not.
//   Gap B  — null primary Observe domain => the Record-observation completion path can never fire.
//   Gap C  — zero bottom-rail tools (empty rail); split intentional (has []-override) vs default-driven.
//
// `@ogden/shared` is NOT symlinked at the repo root (see snapshot-three-streams.ts),
// so this imports the package source by relative path to keep zod + internal
// resolution anchored inside packages/shared.
//
// Run:  npx tsx scripts/audit-act-objective-coverage.ts
// Out:  scripts/audit-out/act-objective-coverage.md

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROJECT_TYPES,
  resolveProjectObjectives,
  getObjectiveActTools,
  OBJECTIVE_ACT_TOOLS_OVERRIDE,
  getObjectiveEvidence,
  getPrimaryDomainForObjective,
  type PlanStratumObjective,
  type ProjectTypeId,
} from '../packages/shared/src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(HERE, 'audit-out/act-objective-coverage.md');

interface ObjectiveCoverage {
  id: string;
  stratumId: string;
  title: string;
  /** types whose resolution includes this objective (universal => all 13 primaries). */
  types: Set<string>;
  toolCount: number;
  hasOverride: boolean;
  primaryDomain: string | null;
  requiredEvidence: number;
  totalEvidence: number;
  checklistLen: number;
}

interface TypeRow {
  id: string;
  label: string;
  status: 'ok' | 'secondary-only' | 'error';
  objectiveCount: number;
  gapA: number; // no explicit override
  gapB: number; // null primary domain
  gapC: number; // zero tools
  note?: string;
}

// ---------------------------------------------------------------------------
// Resolve objectives per type and fold into a per-objective coverage map.
// ---------------------------------------------------------------------------

function signalsFor(obj: PlanStratumObjective): Omit<ObjectiveCoverage, 'types'> {
  const tools = getObjectiveActTools(obj);
  const evidence = getObjectiveEvidence(obj);
  return {
    id: obj.id,
    stratumId: obj.stratumId,
    title: obj.shortTitle ?? obj.title,
    toolCount: tools.length,
    hasOverride: Object.prototype.hasOwnProperty.call(
      OBJECTIVE_ACT_TOOLS_OVERRIDE,
      obj.id,
    ),
    primaryDomain: getPrimaryDomainForObjective(obj),
    requiredEvidence: evidence.filter((d) => d.required).length,
    totalEvidence: evidence.length,
    checklistLen: obj.checklist.length,
  };
}

const coverage = new Map<string, ObjectiveCoverage>();
const typeRows: TypeRow[] = [];

function record(obj: PlanStratumObjective, typeId: string) {
  const existing = coverage.get(obj.id);
  if (existing) {
    existing.types.add(typeId);
    return;
  }
  coverage.set(obj.id, { ...signalsFor(obj), types: new Set([typeId]) });
}

function countGaps(objectives: readonly PlanStratumObjective[]) {
  let gapA = 0;
  let gapB = 0;
  let gapC = 0;
  for (const obj of objectives) {
    const s = signalsFor(obj);
    if (!s.hasOverride) gapA += 1;
    if (s.primaryDomain === null) gapB += 1;
    if (s.toolCount === 0) gapC += 1;
  }
  return { gapA, gapB, gapC };
}

for (const type of PROJECT_TYPES) {
  if (!type.canBePrimary) {
    // Secondary-only (residential): resolve as a layer on a working-land
    // primary and diff to isolate its own contributed objectives.
    try {
      const base = resolveProjectObjectives({ primaryTypeId: 'homestead' });
      const baseIds = new Set(base.objectives.map((o) => o.id));
      const withSecondary = resolveProjectObjectives({
        primaryTypeId: 'homestead',
        secondaryTypeIds: [type.id as ProjectTypeId],
      });
      const contributed = withSecondary.objectives.filter(
        (o) => !baseIds.has(o.id),
      );
      for (const obj of contributed) record(obj, type.id);
      const g = countGaps(contributed);
      typeRows.push({
        id: type.id,
        label: type.label,
        status: 'secondary-only',
        objectiveCount: contributed.length,
        ...g,
        note: 'resolved as secondary on homestead; only its own contributed objectives counted',
      });
    } catch (err) {
      typeRows.push({
        id: type.id,
        label: type.label,
        status: 'error',
        objectiveCount: 0,
        gapA: 0,
        gapB: 0,
        gapC: 0,
        note: String(err instanceof Error ? err.message : err),
      });
    }
    continue;
  }

  try {
    const resolved = resolveProjectObjectives({
      primaryTypeId: type.id as ProjectTypeId,
    });
    for (const obj of resolved.objectives) record(obj, type.id);
    const g = countGaps(resolved.objectives);
    typeRows.push({
      id: type.id,
      label: type.label,
      status: 'ok',
      objectiveCount: resolved.objectives.length,
      ...g,
    });
  } catch (err) {
    typeRows.push({
      id: type.id,
      label: type.label,
      status: 'error',
      objectiveCount: 0,
      gapA: 0,
      gapB: 0,
      gapC: 0,
      note: String(err instanceof Error ? err.message : err),
    });
  }
}

// ---------------------------------------------------------------------------
// Derive the gap sets (deduped by objective id).
// ---------------------------------------------------------------------------

const all = [...coverage.values()].sort(
  (a, b) => a.stratumId.localeCompare(b.stratumId) || a.id.localeCompare(b.id),
);

const gapA = all.filter((c) => !c.hasOverride);
const gapB = all.filter((c) => c.primaryDomain === null);
const gapCIntentional = all.filter((c) => c.toolCount === 0 && c.hasOverride);
const gapCDefault = all.filter((c) => c.toolCount === 0 && !c.hasOverride);

// Universal objectives appear under every primary; type-specific ones do not.
const PRIMARY_COUNT = PROJECT_TYPES.filter((t) => t.canBePrimary).length;
const isUniversal = (c: ObjectiveCoverage) => c.types.size >= PRIMARY_COUNT;

// ---------------------------------------------------------------------------
// Render the markdown report.
// ---------------------------------------------------------------------------

const typeList = (types: Set<string>) =>
  isUniversal({ types } as ObjectiveCoverage)
    ? 'universal'
    : [...types].sort().join(', ');

const lines: string[] = [];
lines.push('# Act-Stage Objective Coverage Audit');
lines.push('');
lines.push(
  '_Generated by `scripts/audit-act-objective-coverage.ts` — drives the same `@ogden/shared` resolvers as the live `ActTierShell`._',
);
lines.push('');
lines.push(
  `**Totals:** ${all.length} unique objectives across ${typeRows.length} project types ` +
    `(${PRIMARY_COUNT} primary + ${typeRows.length - PRIMARY_COUNT} secondary-only).`,
);
lines.push('');
lines.push('## Completion-recording surfaces (every objective has these)');
lines.push('');
lines.push(
  '- **Checklist** → `planStratumStore.toggleItem` — the objective task set.',
);
lines.push(
  '- **Evidence** (photo/confirm/note) → `actEvidenceStore` (`getObjectiveEvidence`, never empty).',
);
lines.push(
  '- **Record observation** → emits an `ObserveDataPoint`. **Disabled unless** checklist complete AND required evidence satisfied AND `getPrimaryDomainForObjective !== null`.',
);
lines.push('- **Bottom-rail tools** → `getObjectiveActTools` (override → stratum default → []).');
lines.push('');

lines.push('## Gap summary');
lines.push('');
lines.push(
  `- **Gap A — no explicit Act-tool override** (relies on coarse stratum default): **${gapA.length}** objectives.`,
);
lines.push(
  `- **Gap B — null primary Observe domain** (Record-observation can never fire): **${gapB.length}** objectives.`,
);
lines.push(
  `- **Gap C — zero bottom-rail tools** (empty rail): **${
    gapCIntentional.length + gapCDefault.length
  }** objectives (${gapCIntentional.length} intentional []-override, ${gapCDefault.length} default-driven).`,
);
lines.push('');

lines.push('## Per-type coverage');
lines.push('');
lines.push('| Type | Status | Objectives | Gap A (no override) | Gap B (null domain) | Gap C (0 tools) |');
lines.push('|---|---|--:|--:|--:|--:|');
for (const r of typeRows) {
  lines.push(
    `| ${r.label} (\`${r.id}\`) | ${r.status} | ${r.objectiveCount} | ${r.gapA} | ${r.gapB} | ${r.gapC} |`,
  );
}
lines.push('');

lines.push('## Gap B — null-domain objectives (hard Record blockers)');
lines.push('');
if (gapB.length === 0) {
  lines.push('_None — every objective resolves a primary Observe domain._');
} else {
  lines.push('| Objective id | Stratum | #tools | Types |');
  lines.push('|---|---|--:|---|');
  for (const c of gapB) {
    lines.push(`| \`${c.id}\` | ${c.stratumId} | ${c.toolCount} | ${typeList(c.types)} |`);
  }
}
lines.push('');

lines.push('## Gap C — zero-tool objectives (empty bottom rail)');
lines.push('');
lines.push('### Intentional (explicit `[]` override — decision/text objectives)');
lines.push('');
if (gapCIntentional.length === 0) {
  lines.push('_None._');
} else {
  lines.push('| Objective id | Stratum | primaryDomain | Types |');
  lines.push('|---|---|---|---|');
  for (const c of gapCIntentional) {
    lines.push(
      `| \`${c.id}\` | ${c.stratumId} | ${c.primaryDomain ?? '**null**'} | ${typeList(c.types)} |`,
    );
  }
}
lines.push('');
lines.push('### Default-driven (no override, stratum default resolves to `[]`)');
lines.push('');
if (gapCDefault.length === 0) {
  lines.push('_None._');
} else {
  lines.push('| Objective id | Stratum | primaryDomain | Types |');
  lines.push('|---|---|---|---|');
  for (const c of gapCDefault) {
    lines.push(
      `| \`${c.id}\` | ${c.stratumId} | ${c.primaryDomain ?? '**null**'} | ${typeList(c.types)} |`,
    );
  }
}
lines.push('');

lines.push('## Gap A — objectives lacking an explicit Act-tool override');
lines.push('');
lines.push(
  '_Universal (`s*`) and silvopasture (`silv-*`) ids carry explicit overrides; everything below falls through to `STRATUM_ACT_TOOLS_DEFAULT`._',
);
lines.push('');
if (gapA.length === 0) {
  lines.push('_None._');
} else {
  lines.push('| Objective id | Stratum | #tools (from default) | primaryDomain | Types |');
  lines.push('|---|---|--:|---|---|');
  for (const c of gapA) {
    lines.push(
      `| \`${c.id}\` | ${c.stratumId} | ${c.toolCount} | ${c.primaryDomain ?? '**null**'} | ${typeList(c.types)} |`,
    );
  }
}
lines.push('');

lines.push('## Full coverage matrix (deduped by objective id)');
lines.push('');
lines.push(
  '| Objective id | Stratum | #tools | override? | primaryDomain | req.evidence | checklist | Types |',
);
lines.push('|---|---|--:|:--:|---|--:|--:|---|');
for (const c of all) {
  lines.push(
    `| \`${c.id}\` | ${c.stratumId} | ${c.toolCount} | ${c.hasOverride ? 'yes' : 'no'} | ${
      c.primaryDomain ?? '**null**'
    } | ${c.requiredEvidence} | ${c.checklistLen} | ${typeList(c.types)} |`,
  );
}
lines.push('');

const report = lines.join('\n');

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, report, 'utf8');

// Console summary so the run is legible without opening the file.
console.log(`Audited ${all.length} unique objectives across ${typeRows.length} types.`);
console.log(
  `Gap A (no override): ${gapA.length}  |  Gap B (null domain): ${gapB.length}  |  ` +
    `Gap C (0 tools): ${gapCIntentional.length + gapCDefault.length} ` +
    `(${gapCIntentional.length} intentional / ${gapCDefault.length} default-driven)`,
);
for (const r of typeRows) {
  if (r.status === 'error') console.log(`  ! ${r.id}: ERROR ${r.note}`);
}
console.log(`Report written to ${OUT_PATH}`);
