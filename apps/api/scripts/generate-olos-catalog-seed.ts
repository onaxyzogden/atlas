/**
 * generate-olos-catalog-seed.ts — derive 044_olos_catalog_seed.sql from the
 * single source of truth in packages/shared/src/constants/olos/.
 *
 * Re-run this whenever the universal catalogue changes (new overlay,
 * new domain, edited checklist text). Generated SQL is checked in so the
 * migration runner can apply it without depending on the TS source at
 * migrate-time.
 *
 * Usage:
 *   pnpm --filter @ogden/api exec tsx scripts/generate-olos-catalog-seed.ts
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UNIVERSAL_OVERLAYS,
  UNIVERSAL_OVERLAY_IDS,
  UNIVERSAL_OBJECTIVES,
  UNIVERSAL_CHECKLIST_ITEMS,
} from '@ogden/shared';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(
  scriptDir,
  '../src/db/migrations/044_olos_catalog_seed.sql',
);

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlText(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'NULL';
  return sqlString(s);
}

function sqlJsonb(obj: unknown): string {
  return `${sqlString(JSON.stringify(obj))}::jsonb`;
}

function sqlTextArray(items: readonly string[]): string {
  if (items.length === 0) return `ARRAY[]::text[]`;
  return `ARRAY[${items.map(sqlString).join(', ')}]::text[]`;
}

const lines: string[] = [];

lines.push(
  `-- Migration 044 — OLOS catalogue seed (15 overlays + 48 objectives + checklist + m:n).`,
);
lines.push(
  `--`,
);
lines.push(
  `-- DO NOT EDIT BY HAND. This file is generated from packages/shared/src/`,
);
lines.push(
  `-- constants/olos/ via apps/api/scripts/generate-olos-catalog-seed.ts.`,
);
lines.push(
  `-- Re-run that script when the universal catalogue changes.`,
);
lines.push(``);

// ─── overlays ─────────────────────────────────────────────────────────────
lines.push(`-- ─── overlays (${UNIVERSAL_OVERLAY_IDS.length} rows) ─────────`);
for (const id of UNIVERSAL_OVERLAY_IDS) {
  const o = UNIVERSAL_OVERLAYS[id];
  lines.push(
    `INSERT INTO olos_overlays (id, name, description, geometry_type, default_style) VALUES (` +
      `${sqlString(o.id)}, ${sqlString(o.name)}, ${sqlString(o.description)}, ${sqlString(o.geometryType)}, ${sqlJsonb(o.defaultStyle ?? {})});`,
  );
}
lines.push(``);

// ─── objectives ──────────────────────────────────────────────────────────
lines.push(`-- ─── objectives (${UNIVERSAL_OBJECTIVES.length} rows) ────────`);
for (const obj of UNIVERSAL_OBJECTIVES) {
  lines.push(
    `INSERT INTO olos_objectives (id, stage, domain, title, focused_question, completion_criteria, required_inputs, default_overlay_bundle, checklist_item_ids, output_kind, allowed_statuses) VALUES (` +
      [
        sqlString(obj.id),
        sqlString(obj.stage),
        sqlString(obj.domain),
        sqlString(obj.title),
        sqlString(obj.focusedQuestion),
        sqlText(obj.completionCriteria),
        sqlJsonb(obj.requiredInputs),
        sqlTextArray(obj.defaultOverlayBundle),
        sqlTextArray(obj.checklistItemIds),
        sqlString(obj.outputKind),
        sqlTextArray(obj.allowedStatuses),
      ].join(', ') +
      `);`,
  );
}
lines.push(``);

// ─── checklist items ─────────────────────────────────────────────────────
lines.push(
  `-- ─── checklist items (${UNIVERSAL_CHECKLIST_ITEMS.length} rows) ───`,
);
for (const item of UNIVERSAL_CHECKLIST_ITEMS) {
  lines.push(
    `INSERT INTO olos_checklist_items (id, objective_id, ordinal, instruction, linked_overlay_id, required_input_type, required) VALUES (` +
      [
        sqlString(item.id),
        sqlString(item.objectiveId),
        String(item.ordinal),
        sqlString(item.instruction),
        item.linkedOverlayId ? sqlString(item.linkedOverlayId) : 'NULL',
        sqlString(item.requiredInputType),
        item.required ? 'true' : 'false',
      ].join(', ') +
      `);`,
  );
}
lines.push(``);

// ─── objective × overlay (m:n) ───────────────────────────────────────────
const pairs: { objectiveId: string; overlayId: string }[] = [];
for (const obj of UNIVERSAL_OBJECTIVES) {
  for (const overlayId of obj.defaultOverlayBundle) {
    pairs.push({ objectiveId: obj.id, overlayId });
  }
}
lines.push(`-- ─── objective × overlay m:n (${pairs.length} rows) ────────`);
for (const p of pairs) {
  lines.push(
    `INSERT INTO olos_objective_overlays (objective_id, overlay_id) VALUES (${sqlString(p.objectiveId)}, ${sqlString(p.overlayId)});`,
  );
}
lines.push(``);

writeFileSync(outFile, lines.join('\n'), 'utf-8');

process.stdout.write(
  `Wrote ${outFile}\n  overlays:           ${UNIVERSAL_OVERLAY_IDS.length}\n  objectives:         ${UNIVERSAL_OBJECTIVES.length}\n  checklist items:    ${UNIVERSAL_CHECKLIST_ITEMS.length}\n  objective×overlay:  ${pairs.length}\n`,
);
