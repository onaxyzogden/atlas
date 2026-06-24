/**
 * seedHomesteadSample -- completion seeder for the Homestead -- Atlas Sample
 * (offline demo). This is the second half of the builtin/clone split (see
 * demoSession.ts + seedHomesteadDesign.ts): the canonical builtin ships the
 * project record, metadata, parcel boundary, Observe substrate, and drawn
 * design; THIS module writes all of the Plan / Act / threshold / milestone /
 * review COMPLETION state onto the visitor's editable CLONE so the sample reads
 * as a finished journey the moment it is opened.
 *
 * Why the clone, not the builtin. `duplicateProject` deep-copies metadata and
 * cascade-clones design entities + boundary, but it does NOT copy the six
 * `byProject`-keyed progress stores -- those land empty on the clone. So this
 * seeder fires when a project carrying the template flag
 * (`metadata.instantiatedFromTemplate === 'homestead-sample'`) appears whose id
 * is NOT the canonical builtin id (i.e. the clone), and writes every progress
 * store keyed to that clone id. (Mirrors the proven seedApricotLane auto-run
 * pattern, but keyed on the template flag rather than a fixed id, because the
 * clone id is minted per visitor.)
 *
 * TYPE-AGNOSTIC + DATA-DRIVEN. Nothing here hard-codes the homestead objective
 * set. It resolves the objectives from the clone's own `projectTypeRecord`,
 * asserts a non-empty resolved set, drives completion off the EFFECTIVE-progress
 * diff (so it never fights the wizard-derived S1 items), and evaluates the
 * Coherence audit live (Section-C-only for homestead) rather than presuming a
 * verdict. Adding a second sample type later reuses this whole path -- only the
 * content map + template flag differ.
 *
 * DETERMINISM. Every timestamp is a fixed seed epoch (no Date.now()), so the
 * seeded sample is byte-stable across reloads. All store actions are idempotent;
 * a localStorage sentinel + an in-memory `fired` Set make re-entry a no-op.
 *
 * AMANAH / covenant. The only money-touching objective is
 * `hms-s7-budget-input-reduction`, framed as HOUSEHOLD PROVISION -- never
 * revenue / sales / customers / subscription / advance-sale, and NEVER
 * CSA / CSRA / salam. Every OLOS-authored string here (planning direction,
 * coherence amendments, fallback notes) is covenant-clean by construction. The
 * coherence store silently drops advance-sale / CSA amendment text at its
 * persistence boundary, which would leave the record unsealed -- the self-check
 * asserts `sealedAt` to catch exactly that.
 */

import {
  HOMESTEAD_SAMPLE_PROJECT_ID,
  resolveProjectObjectives,
  computeAllObjectiveStatuses,
  getObjectiveEvidence,
} from '@ogden/shared';
import type { PlanStratumObjective, ProjectMetadata } from '@ogden/shared';

import { useProjectStore } from '../store/projectStore.js';
import { usePlanStratumProgressStore } from '../store/planStratumStore.js';
import { useActEvidenceStore } from '../store/actEvidenceStore.js';
import { useRealityCheckStore } from '../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../store/coherenceCheckStore.js';
import { useLaunchMilestoneStore } from '../store/launchMilestoneStore.js';
import { useCyclicalReviewStore } from '../store/cyclicalReviewStore.js';
import { useActMandateStore } from '../store/actMandateStore.js';

import { computeEffectiveProgress } from '../v3/strata/effectiveProgress.js';
import { deriveIntentElementsFromProfile } from '../v3/plan/threshold/intentElements.js';
import {
  selectDesignObjectives,
  evaluateCoherenceAudit,
} from '../v3/plan/threshold/coherenceCheckModel.js';

import { HOMESTEAD_SAMPLE_CONTENT, type ObjectiveContent } from './content/homesteadSampleContent.js';

// ---------------------------------------------------------------------------
// Determinism: one fixed seed epoch for every stamped timestamp.
// ---------------------------------------------------------------------------

/** Fixed ISO timestamp for every stamped value -- byte-stable across reloads. */
const HOMESTEAD_SEED_ISO = '2026-06-20T00:00:00.000Z';
/** Epoch-ms form (Date.parse is deterministic; allowed in app code). */
const HOMESTEAD_SEED_EPOCH = Date.parse(HOMESTEAD_SEED_ISO);

/** localStorage sentinel prefix -- one entry per seeded clone id. */
const SEEDED_PREFIX = 'homestead-sample-seeded@v1:';

// ---------------------------------------------------------------------------
// Covenant-clean OLOS-authored copy (no advance-sale / CSA / subscription
// framing -- see file header). Used as deterministic fallbacks; Phase-3 content
// overrides the per-objective note.
// ---------------------------------------------------------------------------

/** The approved Planning Direction Statement (Threshold 1). Household-provision framed. */
const PLANNING_DIRECTION_TEXT =
  'Proceed along the household-provision path: secure water first, then build ' +
  'food production and soil fertility at a scale matched to the household, ' +
  'stewarding the land as an amanah. Every system here provisions the household ' +
  'first; surplus is a blessing to be shared, not a product.';

/** Amendment used to close any open Coherence (Section-C coverage) gap. */
const COHERENCE_AMENDMENT_TEXT =
  'Monitoring protocol confirmed for this objective: at least two observable ' +
  'indicators each carry a measurement cadence, at least one response trigger is ' +
  'defined, and a named Observe-stage feed destination is set.';

/** Deterministic, covenant-clean fallback note for an objective with no curated note. */
function fallbackNote(objective: PlanStratumObjective): string {
  return (
    `Field notes recorded for "${objective.title}" during the homestead ` +
    'walkthrough; the steward confirmed the work against this objective.'
  );
}

// ---------------------------------------------------------------------------
// Result + idempotency
// ---------------------------------------------------------------------------

export interface HomesteadSeedResult {
  ok: boolean;
  reason?: string;
  /** Resolved objective count (asserted non-zero). */
  objectives?: number;
  /** Objectives computing `complete` after seeding (should equal `objectives`). */
  completed?: number;
  approved?: boolean;
  sealed?: boolean;
  mandated?: boolean;
}

/** Clones already seeded this session (in-memory guard, paired with the sentinel). */
const fired = new Set<string>();

function sentinelSet(pid: string): boolean {
  if (fired.has(pid)) return true;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(SEEDED_PREFIX + pid)) {
      return true;
    }
  } catch {
    // localStorage unavailable -- rely on the in-memory Set + store idempotency.
  }
  return false;
}

function markSeeded(pid: string): void {
  fired.add(pid);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SEEDED_PREFIX + pid, HOMESTEAD_SEED_ISO);
    }
  } catch {
    // best-effort sentinel.
  }
}

// ---------------------------------------------------------------------------
// Clone discovery -- a project carrying the template flag whose id is NOT the
// canonical builtin (i.e. the visitor's editable copy).
// ---------------------------------------------------------------------------

/** Read the passthrough `instantiatedFromTemplate` flag (not in the static type). */
function templateFlagOf(metadata: ProjectMetadata | undefined): string | undefined {
  const v = (metadata as Record<string, unknown> | undefined)?.instantiatedFromTemplate;
  return typeof v === 'string' ? v : undefined;
}

/** Find the homestead-sample CLONE in the project store, if present. */
export function findHomesteadClone() {
  return useProjectStore
    .getState()
    .projects.find(
      (p) =>
        p.id !== HOMESTEAD_SAMPLE_PROJECT_ID &&
        templateFlagOf(p.metadata) === 'homestead-sample',
    );
}

// ---------------------------------------------------------------------------
// Per-objective application
// ---------------------------------------------------------------------------

/**
 * Tick every REQUIRED checklist item not already satisfied by effective
 * progress, and write the objective's parameter-group display values. The
 * effective-progress flat map is the union of stored progress with the wizard-
 * derived S1 + answerSpec items, so this never re-ticks an already-derived item.
 */
function completeChecklist(
  pid: string,
  objective: PlanStratumObjective,
  effectiveFlat: Readonly<Record<string, boolean>>,
  content: ObjectiveContent | undefined,
): void {
  const plan = usePlanStratumProgressStore.getState();
  for (const item of objective.checklist ?? []) {
    if (item.optional) continue;
    if (effectiveFlat[item.id]) continue;
    plan.setItemComplete(pid, objective.id, item.id);
  }
  // Parameter-group display values (display-only -- never a completion gate).
  if (content?.itemValues) {
    for (const [itemId, value] of Object.entries(content.itemValues)) {
      plan.setParameterValue(pid, objective.id, itemId, value);
    }
  }
}

/**
 * Satisfy the objective's REQUIRED Act evidence so the execution panel reads
 * complete: photos to their target count, confirms set, and the summary note
 * filled (curated note if present, else a covenant-clean fallback). Explicit
 * content evidence (e.g. an optional descriptor the author chose to fill) is
 * applied additionally. Idempotent per store action.
 */
function completeEvidence(
  pid: string,
  objective: PlanStratumObjective,
  content: ObjectiveContent | undefined,
): void {
  const ev = useActEvidenceStore.getState();
  const descriptors = getObjectiveEvidence(objective);

  for (const d of descriptors) {
    if (!d.required) continue;
    if (d.kind === 'photo') {
      const target = d.target ?? 1;
      for (let i = 0; i < target; i++) ev.addPhoto(pid, objective.id, d.id, target);
    } else if (d.kind === 'confirm') {
      ev.setConfirm(pid, objective.id, d.id, true);
    } else if (d.kind === 'note') {
      const text = content?.notes ?? fallbackNote(objective);
      ev.updateNote(pid, objective.id, d.id, text);
      ev.saveNote(pid, objective.id, d.id);
    }
  }

  // Decision rationale, keyed to the objective (the Act decision == objective).
  if (content?.rationale) {
    ev.saveDecisionRationale(pid, objective.id, content.rationale);
  }

  // Explicit content evidence extras (optional descriptors the author filled).
  for (const did of content?.evidence?.confirms ?? []) {
    ev.setConfirm(pid, objective.id, did, true);
  }
  for (const photo of content?.evidence?.photos ?? []) {
    ev.addPhoto(pid, objective.id, photo.itemId, 1);
  }
}

/** Reach every launch milestone the objective declares (display-only progress). */
function completeMilestones(pid: string, objective: PlanStratumObjective): void {
  const milestones = objective.progressTracking?.milestones;
  if (!milestones) return;
  const launch = useLaunchMilestoneStore.getState();
  for (const m of milestones) {
    launch.markReached(pid, objective.id, m.metric, 'act-tier', HOMESTEAD_SEED_ISO);
  }
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export function seedHomesteadSample(
  projectId: string,
  opts: { force?: boolean } = {},
): HomesteadSeedResult {
  if (!opts.force && sentinelSet(projectId)) {
    return { ok: false, reason: `already seeded (sentinel ${SEEDED_PREFIX}${projectId}); pass { force: true } to replay` };
  }

  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  if (!project) {
    return { ok: false, reason: `project ${projectId} not in store` };
  }

  const metadata = project.metadata;
  const ptr = metadata?.projectTypeRecord;
  if (!ptr) {
    return { ok: false, reason: `project ${projectId} has no projectTypeRecord; cannot resolve objectives` };
  }

  // 1. Resolve the objective set from the clone's own type record (honours
  //    excludedFromResolution + the water/animals conditionals). ASSERT non-empty.
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: ptr.primaryTypeId,
    secondaryTypeIds: ptr.secondaryTypeIds ?? [],
  });
  if (objectives.length === 0) {
    return { ok: false, reason: `resolved 0 objectives for ${ptr.primaryTypeId}; nothing to complete` };
  }

  const visionProfile = metadata?.visionProfile ?? null;
  const team = metadata?.team ?? null;

  // 2. Effective progress BEFORE ticking -- so we never re-tick wizard-derived
  //    S1 / answerSpec items (passing metadata enables the answerSpec union).
  const before = computeEffectiveProgress(
    usePlanStratumProgressStore.getState().byProject[projectId] ?? {},
    visionProfile,
    team,
    objectives,
    metadata,
  );

  // 3. Plan completion + Act evidence + launch milestones, per objective.
  for (const objective of objectives) {
    const content = HOMESTEAD_SAMPLE_CONTENT[objective.id];
    completeChecklist(projectId, objective, before.flatMap, content);
    completeEvidence(projectId, objective, content);
    completeMilestones(projectId, objective);
  }

  // 4. Suppress unlock-celebration modals for every stratum touched.
  const plan = usePlanStratumProgressStore.getState();
  for (const stratumId of new Set(objectives.map((o) => o.stratumId))) {
    plan.markStratumCelebrated(projectId, stratumId);
  }

  // 5. Recompute the FINAL effective progress + statuses (post-tick) for the
  //    threshold evaluations and the self-check.
  const after = computeEffectiveProgress(
    usePlanStratumProgressStore.getState().byProject[projectId] ?? {},
    visionProfile,
    team,
    objectives,
    metadata,
  );
  const finalFlat: Record<string, boolean> = { ...after.flatMap };
  const statuses = computeAllObjectiveStatuses(objectives, finalFlat);

  // 6. Threshold 1 -- The Reality Check. Classify every profile-derived intent
  //    element feasible, set the household-provision direction, approve.
  const reality = useRealityCheckStore.getState();
  reality.setPhase1Ready(projectId, true);
  for (const el of deriveIntentElementsFromProfile(visionProfile)) {
    reality.classifyElement(projectId, el.id, 'feasible');
  }
  reality.setPlanningDirectionText(projectId, PLANNING_DIRECTION_TEXT);
  reality.approve(projectId, HOMESTEAD_SEED_EPOCH);

  // 7. Threshold 2 -- The Coherence Check. Data-driven: evaluate the audit
  //    (Section-C-only for homestead -- no A/B registry), resolve any open
  //    coverage gap with covenant-clean text, then seal.
  const coherence = useCoherenceCheckStore.getState();
  const designObjectives = selectDesignObjectives(objectives);
  const audit = evaluateCoherenceAudit({
    primaryTypeId: ptr.primaryTypeId,
    designObjectives,
    statuses,
  });
  for (const item of audit.items) {
    if (item.status === 'open') {
      coherence.resolveItem(projectId, item.id, COHERENCE_AMENDMENT_TEXT, HOMESTEAD_SEED_EPOCH);
    }
  }
  coherence.seal(projectId, HOMESTEAD_SEED_EPOCH);

  // 8. Cyclical review -- mark each objective reviewed (seed-time "just
  //    reviewed, none due"). noteCompletion ONLY -- never confirmDecision
  //    (which would pollute Observe history with a decision-confirm event).
  const review = useCyclicalReviewStore.getState();
  for (const objective of objectives) {
    review.noteCompletion(projectId, objective.id);
  }

  // 9. Threshold 3 -- The Act Mandate. LAST: arms planReadOnly (surface policy
  //    only; the store stays writable so the seed above already landed).
  useActMandateStore.getState().beginAct(projectId, HOMESTEAD_SEED_EPOCH);

  // 10. Self-check (non-fatal -- warns on any gap).
  const completed = Object.values(statuses).filter((s) => s === 'complete').length;
  const approved = useRealityCheckStore.getState().byProject[projectId]?.approvedAt !== undefined;
  const sealed = useCoherenceCheckStore.getState().byProject[projectId]?.sealedAt !== undefined;
  const mandated = useActMandateStore.getState().byProject[projectId]?.mandatedAt !== undefined;

  if (completed !== objectives.length) {
    const incomplete = objectives
      .filter((o) => statuses[o.id] !== 'complete')
      .map((o) => `${o.id}:${statuses[o.id]}`);
    console.warn(
      `[seedHomesteadSample] ${completed}/${objectives.length} objectives complete on ${projectId}. Not complete:`,
      incomplete,
    );
  }
  if (!approved) console.warn('[seedHomesteadSample] Reality Check NOT approved on', projectId);
  if (!sealed) {
    console.warn(
      '[seedHomesteadSample] Coherence Record NOT sealed on',
      projectId,
      '-- check for detectCsaLikeText refusal on amendment text.',
    );
  }
  if (!mandated) console.warn('[seedHomesteadSample] Act Mandate NOT begun on', projectId);

  markSeeded(projectId);

  const result: HomesteadSeedResult = {
    ok: true,
    objectives: objectives.length,
    completed,
    approved,
    sealed,
    mandated,
  };
  console.info(
    `[seedHomesteadSample] seeded "${project.name}" (${projectId}): ` +
      `${completed}/${objectives.length} objectives complete, ` +
      `reality=${approved ? 'approved' : 'OPEN'}, coherence=${sealed ? 'sealed' : 'UNSEALED'}, ` +
      `mandate=${mandated ? 'begun' : 'NOT-BEGUN'}.`,
  );
  return result;
}

// ---------------------------------------------------------------------------
// Manual replay handle.
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedHomesteadSample = (pid?: string) => {
    const target = pid ?? findHomesteadClone()?.id;
    if (!target) return { ok: false, reason: 'no homestead-sample clone found in store' };
    return seedHomesteadSample(target, { force: true });
  };
}

// ---------------------------------------------------------------------------
// Auto-run hook. Subscribes to projectStore once at module-init and fires the
// completion seeder the first time a homestead-sample CLONE appears (created by
// the demo clone loop in demoSession.ts). Keyed on the template flag rather than
// a fixed id, because the clone id is minted per visitor. Guarded by the
// localStorage sentinel + in-memory `fired` Set, and every store action is
// idempotent, so reloads / rehydration never re-seed. Unlike seedApricotLane the
// subscription is NOT torn down after firing -- there is one clone per browser,
// but leaving it attached is cheap and survives a storage-clear re-clone within
// the same session.
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  const runFor = (pid: string) => {
    if (sentinelSet(pid)) return;
    queueMicrotask(() => {
      try {
        seedHomesteadSample(pid);
      } catch (err) {
        console.warn('[seedHomesteadSample] seed failed', err);
      }
    });
  };

  try {
    useProjectStore.subscribe((state) => {
      const clone = state.projects.find(
        (p) =>
          p.id !== HOMESTEAD_SAMPLE_PROJECT_ID &&
          templateFlagOf(p.metadata) === 'homestead-sample',
      );
      if (clone) runFor(clone.id);
    });
    // Fire immediately if the clone is already in the store at module-init
    // (hot-reload, persisted-store rehydration on a returning visitor).
    const already = findHomesteadClone();
    if (already) runFor(already.id);
  } catch (err) {
    console.warn('[seedHomesteadSample] auto-run hook failed to attach', err);
  }
}
