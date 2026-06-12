/**
 * Item-level completion-path RATCHET.
 *
 * The shared classifier (packages/shared .../objectiveCompletionPaths.ts)
 * answers, for every checklist item on every standalone catalogue objective,
 * "how can a steward complete this in-app?". This test pins the exact gap sets
 * against completionPathGaps.baseline.json so they can only SHRINK:
 *
 *   - noPath               items with NO in-app path (bare manual tick)
 *   - objectiveSpatialOnly items whose only path is an objective-level
 *                          map/log/flow instrument (manual per-item tick)
 *
 * Adding a new catalogue item without a completion path FAILS (no new gaps).
 * Closing a gap also FAILS until the baseline shrinks — the only sanctioned
 * way to move it is regenerating the fixture:
 *
 *   npx tsx scripts/audit-checklist-completion-paths.ts --write-baseline
 *
 * which derives the baseline from the same audit, so report and ratchet can
 * never disagree. (Expect baseline churn on any catalogue / tool edit; that is
 * the point — the diff is reviewed, not silent.)
 *
 * Like actToolCoverage.test.ts, this lives in the app layer because only the
 * app layer can import both the shared catalogues and ACT_TOOL_CATALOG (lucide
 * icons + MapToolId union); the shared classifier takes the arm index injected.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  auditAllCompletionPaths,
  type ActToolArmIndex,
} from '@ogden/shared';
import { ACT_TOOL_CATALOG } from '../actToolCatalog.js';
import { TIER_ZERO_OBJECTIVE_IDS } from '../tierZeroObjectives.js';

interface GapBaseline {
  noPath: Record<string, string[]>;
  objectiveSpatialOnly: Record<string, string[]>;
  /**
   * Form-arm formIds pinned as KNOWN unmatched (the form saves a document but
   * ticks no checklist box). As of 2026-06-11 these are four `*-c6` intent
   * forms (mgd-s1-growing-system-philosophy, orch-s1-production-intent,
   * orch-s1-species-philosophy, silv-s1-land-improvement-philosophy) whose R2
   * wiring assumed a 6-item checklist while the operator catalogue has 5 —
   * pinned pending an operator content decision (add the c6 item vs drop the
   * tool). Anything NOT on this list is new formId/item-id drift: fix it.
   */
  intentionalUnmatchedFormIds: string[];
}

const baseline: GapBaseline = JSON.parse(
  readFileSync(
    new URL('./completionPathGaps.baseline.json', import.meta.url),
    'utf8',
  ),
);

const armIndex: ActToolArmIndex = Object.fromEntries(
  Object.entries(ACT_TOOL_CATALOG).map(([id, tool]) => [
    id,
    tool.arm.kind === 'form'
      ? { kind: tool.arm.kind, formId: tool.arm.formId }
      : { kind: tool.arm.kind },
  ]),
);

// Workbench routing injected from the live Tier-0 membership set: every item
// of a workbench objective records via DecisionWorkingPanel (saveVisionFormData
// + setItemComplete), so those items classify `workbench-capture`, not no-path.
const audit = auditAllCompletionPaths(armIndex, {
  workbenchObjectiveIds: TIER_ZERO_OBJECTIVE_IDS,
});

/** Flatten an objectiveId -> itemIds map into "objectiveId :: itemId" keys. */
function flatten(map: Record<string, string[]>): Set<string> {
  const out = new Set<string>();
  for (const [objectiveId, itemIds] of Object.entries(map)) {
    for (const itemId of itemIds) out.add(`${objectiveId} :: ${itemId}`);
  }
  return out;
}

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((k) => !b.has(k)).sort();
}

describe('checklist completion-path ratchet', () => {
  const actualNoPath = flatten(audit.noPath);
  const baselineNoPath = flatten(baseline.noPath);
  const actualSpatialOnly = flatten(audit.objectiveSpatialOnly);
  const baselineSpatialOnly = flatten(baseline.objectiveSpatialOnly);

  it('no NEW no-path items beyond the baseline', () => {
    // A failure here means a catalogue item was added (or a tool/override was
    // removed) without giving the item any in-app completion path. Either wire
    // a capture for it or — if accepted as a known gap — regenerate the
    // baseline and review the diff.
    expect(diff(actualNoPath, baselineNoPath)).toEqual([]);
  });

  it('no STALE no-path baseline entries (closed gaps must shrink the baseline)', () => {
    expect(diff(baselineNoPath, actualNoPath)).toEqual([]);
  });

  it('no NEW objective-level-only items beyond the baseline', () => {
    expect(diff(actualSpatialOnly, baselineSpatialOnly)).toEqual([]);
  });

  it('no STALE objective-level-only baseline entries', () => {
    expect(diff(baselineSpatialOnly, actualSpatialOnly)).toEqual([]);
  });

  it('every unmatched form-arm formId is pinned as intentional', () => {
    // A resolved form arm whose formId matches no checklist item saves a form
    // that ticks nothing. The known-legacy aggregate forms are pinned in the
    // baseline; anything else is formId/item-id drift and must be fixed, not
    // pinned, unless deliberately accepted.
    const pinned = new Set(baseline.intentionalUnmatchedFormIds);
    const unpinned = audit.unmatchedFormArms
      .filter((u) => !pinned.has(u.formId))
      .map((u) => `${u.objectiveId} :: ${u.toolId} -> ${u.formId}`)
      .sort();
    expect(unpinned).toEqual([]);

    const actualIds = new Set(audit.unmatchedFormArms.map((u) => u.formId));
    const stalePins = baseline.intentionalUnmatchedFormIds
      .filter((id) => !actualIds.has(id))
      .sort();
    expect(stalePins).toEqual([]);
  });
});
