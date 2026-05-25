/**
 * B3 — Rotation-sequence plan → WorkItem spine write seam.
 *
 * Mirrors `coverCropSpineSync.pushCoverCropPlanToSpine` 1:1:
 *   1. Project a `MoveCalendarEntry[]` from paddocks + `RotationPlan` via
 *      `computeMoveCalendar` (pure).
 *   2. Build one WorkItem per projected move, carrying composite
 *      `generatedFromRotationMove` provenance and `source:'rotation-sequence'`.
 *   3. Push to the spine via `replaceRotationSequenceRows` (cross-source
 *      preservation gate; overridden rows survive).
 *   4. Seed `precedesAuto` within each cellGroup (sequenceOrder N precedes
 *      sequenceOrder N+1; cycle C last precedes cycle C+1 first) via
 *      `replaceRotationSequenceDependencies`.
 *
 * Phase joining follows the same free-text-`Paddock.phase` → declared-phase
 * rule used by `coverCropSpineSync` (exact id match first, then
 * case-insensitive name match; otherwise `phaseId: null`).
 *
 * Strictly project schedule (D0/D1 territory) — no
 * riba/gharar/CSRA/salam/investor/financing/cost-of-capital semantics.
 */

import type { WorkItem } from '@ogden/shared';
import type { Paddock } from '../../store/livestockStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  computeMoveCalendar,
  type MoveCalendarEntry,
  type RotationPlan,
  type SeasonOpts,
} from './rotationSequenceMath.js';
import { buildRotationMoveKit } from './rotationMoveMaterials.js';
import { isSouthernHemisphere } from './forageSeasonMath.js';
import {
  computeFollowerTiers,
  computeFollowerMoves,
} from './polyfaceFollowerMath.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';

function resolvePhaseId(
  paddockPhase: string,
  declaredPhases: BuildPhase[],
): string | null {
  const trimmed = (paddockPhase ?? '').trim();
  if (!trimmed) return null;
  const byId = declaredPhases.find((p) => p.id === trimmed);
  if (byId) return byId.id;
  const lower = trimmed.toLowerCase();
  const byName = declaredPhases.find(
    (p) => p.name.trim().toLowerCase() === lower,
  );
  return byName ? byName.id : null;
}

/**
 * Stable composite provenance id:
 * `<cellGroup>__<paddockId>__<sequenceOrder>__<cycleIndex>`. cellGroup and
 * paddockId must not contain the `__` separator (existing rotation cell
 * conventions keep them simple kebab-case / uuid; if a future cellGroup
 * carries `__` the seeder still yields a deterministic id — only string
 * equality matters for idempotence).
 */
export function rotationMoveProvenanceId(
  cellGroup: string,
  paddockId: string,
  sequenceOrder: number,
  cycleIndex: number,
): string {
  return `${cellGroup}__${paddockId}__${sequenceOrder}__${cycleIndex}`;
}

/**
 * Follower-move provenance: the lead move's provenance with a `__f<tier>`
 * suffix (S3). Keeps re-push idempotent and lets the dependency seeder strip
 * the suffix to find the lead WorkItem id.
 */
export function rotationFollowerProvenanceId(
  leadProvenance: string,
  tierIndex: number,
): string {
  return `${leadProvenance}__f${tierIndex}`;
}

/**
 * Augment each `MoveCalendarEntry` with the `cycleIndex` it belongs to.
 * `computeMoveCalendar` emits entries in cellGroup-then-cycle-then-cell
 * order; the cycleIndex within a group is the count of prior occurrences
 * of the same `paddockId`.
 */
function withCycleIndex(
  calendar: MoveCalendarEntry[],
): Array<MoveCalendarEntry & { cycleIndex: number }> {
  const seenByGroup = new Map<string, Map<string, number>>();
  return calendar.map((e) => {
    const key = e.cellGroup;
    const inner = seenByGroup.get(key) ?? new Map<string, number>();
    const prior = inner.get(e.paddockId) ?? 0;
    inner.set(e.paddockId, prior + 1);
    seenByGroup.set(key, inner);
    return { ...e, cycleIndex: prior };
  });
}

/**
 * Pure: build the WorkItem set a rotation-sequence push would emit for a
 * project. One WorkItem per projected `MoveCalendarEntry`.
 */
export function seedRotationSequenceWorkItems(args: {
  projectId: string;
  paddocks: Paddock[];
  plan: RotationPlan | null;
  declaredPhases: BuildPhase[];
  startDateISO?: string;
  cycles?: number;
  seasonOpts?: SeasonOpts;
  now?: () => string;
}): WorkItem[] {
  const { projectId, plan, declaredPhases } = args;
  if (!plan || plan.cells.length === 0) return [];

  const projectPaddocks = args.paddocks.filter(
    (p) => p.projectId === projectId,
  );
  if (projectPaddocks.length === 0) return [];

  const startDateISO =
    args.startDateISO ??
    plan.startDateISO ??
    new Date().toISOString().slice(0, 10);
  const cycles = args.cycles ?? plan.horizonCycles ?? 1;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();

  const paddockById = new Map(projectPaddocks.map((p) => [p.id, p]));
  const calendar = computeMoveCalendar(
    projectPaddocks,
    plan,
    startDateISO,
    cycles,
    args.seasonOpts,
  );
  const annotated = withCycleIndex(calendar);

  const out: WorkItem[] = [];
  for (const e of annotated) {
    const paddock = paddockById.get(e.paddockId);
    if (!paddock) continue;
    const phaseId = resolvePhaseId(paddock.phase, declaredPhases);
    const provenance = rotationMoveProvenanceId(
      e.cellGroup,
      e.paddockId,
      e.sequenceOrder,
      e.cycleIndex,
    );
    const kit = buildRotationMoveKit({ paddock, grazeDays: e.grazeDays });
    out.push({
      id: `rs__${provenance}`,
      projectId,
      source: 'rotation-sequence',
      overridden: false,
      generatedFromRotationMove: provenance,
      createdAt: created,
      updatedAt: created,
      title: `Rotation move: ${e.paddockName} (graze ${e.grazeDays}d)`,
      phaseId,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      scheduledStart: e.moveInDateISO,
      scheduledEnd: e.moveOutDateISO,
      materialsAuto: kit.materials,
      equipmentRequiredAuto: kit.equipment,
      linkedFeatureId: paddock.id,
      notes: '',
    });

    // S3 — polyface follower moves: trailing niche tiers graze the same
    // paddock a few days behind the lead. Additive; emitted only when the
    // paddock's species span ≥2 grazing tiers.
    const tiers = computeFollowerTiers(paddock.species);
    const followers = computeFollowerMoves(e, tiers);
    for (const fm of followers) {
      const followerProvenance = rotationFollowerProvenanceId(
        provenance,
        fm.tierIndex,
      );
      const speciesLabel = fm.species
        .map((sp) => LIVESTOCK_SPECIES[sp]?.label ?? sp)
        .join(' + ');
      out.push({
        id: `rs__${followerProvenance}`,
        projectId,
        source: 'rotation-sequence',
        overridden: false,
        generatedFromRotationMove: followerProvenance,
        createdAt: created,
        updatedAt: created,
        title: `Follower move: ${speciesLabel} behind ${e.paddockName} (+${fm.lagDays}d)`,
        phaseId,
        status: 'todo',
        doneAt: null,
        dependsOn: [],
        dependsOnAuto: [],
        precedesAuto: [],
        scheduledStart: fm.moveInDateISO,
        scheduledEnd: fm.moveOutDateISO,
        materialsAuto: [],
        equipmentRequiredAuto: [],
        linkedFeatureId: paddock.id,
        notes: '',
      });
    }
  }
  return out;
}

/**
 * Pure: chain rotation-sequence WorkItems within each cellGroup. Each
 * row's `precedesAuto` lists the single next row in the same cellGroup
 * (by emission order — `computeMoveCalendar` already linearises
 * cycle-then-sequence within a group). The final row in a group emits
 * no edge. Cross-cellGroup edges are deliberately omitted (cells graze
 * independently).
 */
export function seedRotationSequenceDependencies(
  rows: WorkItem[],
): Map<string, string[]> {
  // Group LEAD rows by cellGroup using their provenance prefix (preserves
  // emission order — rows[] arrives in cellGroup-then-cycle-then-sequence
  // order from the seeder). Follower rows (`__f<tier>` provenance) are kept
  // aside; they depend on their lead, not on the lead chain.
  const byGroup = new Map<string, WorkItem[]>();
  const followers: WorkItem[] = [];
  for (const r of rows) {
    if (r.source !== 'rotation-sequence') continue;
    const provenance = r.generatedFromRotationMove;
    if (!provenance) continue;
    if (/__f\d+$/.test(provenance)) {
      followers.push(r);
      continue;
    }
    const sep = provenance.indexOf('__');
    if (sep <= 0) continue;
    const cellGroup = provenance.slice(0, sep);
    const list = byGroup.get(cellGroup) ?? [];
    list.push(r);
    byGroup.set(cellGroup, list);
  }

  const out = new Map<string, string[]>();
  for (const list of byGroup.values()) {
    for (let i = 0; i < list.length - 1; i++) {
      const cur = list[i]!;
      const next = list[i + 1]!;
      out.set(cur.id, [next.id]);
    }
  }

  // Each follower's lead precedes it (lead provenance = follower provenance
  // with the `__f<tier>` suffix stripped). Merge into the lead's existing
  // precedesAuto list so the lead→next-lead chain is preserved.
  for (const f of followers) {
    const provenance = f.generatedFromRotationMove!;
    const leadProvenance = provenance.replace(/__f\d+$/, '');
    const leadId = `rs__${leadProvenance}`;
    const existing = out.get(leadId) ?? [];
    existing.push(f.id);
    out.set(leadId, existing);
  }

  return out;
}

/**
 * Push a fresh rotation-sequence projection onto the spine. Preserves
 * steward-overridden + every non-rotation-sequence row (cross-source
 * preservation gate). Mirrors `pushCoverCropPlanToSpine` shape 1:1.
 */
export function pushRotationSequenceToSpine(projectId: string): void {
  const paddocks = useLivestockStore.getState().paddocks;
  const plan =
    useRotationPlanStore.getState().byProject[projectId] ?? null;
  const declaredPhases = usePhaseStore
    .getState()
    .getProjectPhases(projectId);

  // Hemisphere from the project boundary centroid — same derivation as
  // `ForageQualitySeasonalCard`, so spine dates match the card's curve.
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  const seasonOpts: SeasonOpts = {
    isSouthern: isSouthernHemisphere(project?.parcelBoundaryGeojson),
  };

  const items = seedRotationSequenceWorkItems({
    projectId,
    paddocks,
    plan,
    declaredPhases,
    seasonOpts,
  });
  const store = useWorkItemStore.getState();
  store.replaceRotationSequenceRows(projectId, items);
  const edges = seedRotationSequenceDependencies(items);
  store.replaceRotationSequenceDependencies(projectId, edges);
}
