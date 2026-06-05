/**
 * seedGoalCompassPlan — dev-only console helper that puts a complete
 * Goal-Compass-generated plan onto the canonical WorkItem spine in one
 * call, so a live preview project can immediately exercise the D2
 * regenerate-preservation contract through the UI.
 *
 * Usage from the browser console:
 *
 *     window.__ogdenSeedGoalCompassPlan()              // defaults to first project
 *     window.__ogdenSeedGoalCompassPlan('<projectId>') // specific project
 *
 * It reproduces `GeneratedPlanTab.handleGenerate`
 * (GeneratedPlanTab.tsx:71-82) argument-for-argument:
 *
 *     runSequencingEngine(goalTree, siteProfile, projectId, INTERVENTION_CATALOG)
 *       → scheduleTasksToCalendar(generatedPhases, generatedTasks, startDate)
 *       → phaseStore.replaceGoalCompassRows(projectId, phases, scheduled)
 *       → pushGoalCompassToSpine(projectId, phases, scheduled)
 *
 * so the seeded plan is byte-identical to a real UI generation.
 *
 * Before generating it ensures the project has a Goal Tree (the store's
 * own `ensureDefault` template) and a Site Profile (the store's
 * `ensureDefault`, then ~25 acres + a few valid facets via the store's
 * `setFacet`) — built from the real stores, never from test fixtures.
 *
 * Idempotent: refuses to seed a project that already has any
 * `goal-compass` WorkItems on the spine (no console-driven clobbering
 * of a plan under live review). Mirrors the "already seeded" refusal
 * style of `seedFertilitySample.ts`.
 *
 * Dev seam ONLY — orchestrates existing functions; no engine/store
 * logic change, no cost/price semantics (hours/quantities only).
 *
 * Exposed unconditionally (matches the existing `__ogden*` debug-handle
 * pattern; function reference only — costs nothing until called).
 */

import { useProjectStore } from '../store/projectStore.js';
import { useGoalTreeStore } from '../store/goalTreeStore.js';
import { useSiteProfileStore } from '../store/siteProfileStore.js';
import { usePhaseStore } from '../store/phaseStore.js';
import { useWorkItemStore } from '../store/workItemStore.js';
import { runSequencingEngine } from '../v3/plan/engine/goalCompass/sequencingEngine.js';
import { scheduleTasksToCalendar } from '../v3/plan/engine/goalCompass/scheduleTasksToCalendar.js';
import { pushGoalCompassToSpine } from '../v3/plan/engine/goalCompass/goalCompassSpineSync.js';
import { INTERVENTION_CATALOG } from '../v3/plan/data/interventionCatalog.js';

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: {
    workItems: number;
    withMaterialsAuto: number;
    withEquipmentAuto: number;
    sampleItemId: string | null;
  };
}

export function seedGoalCompassPlan(projectId?: string): SeedResult {
  const projectState = useProjectStore.getState();
  const projects = projectState.projects;

  const target =
    (projectId &&
      projects.find((p) => p.id === projectId || p.serverId === projectId)) ||
    projects.find((p) => p.isBuiltin) ||
    projects[0];

  if (!target) {
    const reason = 'no project available to seed';
    console.warn('[seedGoalCompassPlan]', reason);
    return { ok: false, reason };
  }

  const pid = target.id;

  // Idempotency: refuse if the project already has goal-compass rows on
  // the spine — a plan may be under live regenerate-preservation review.
  const existingGoalCompass = useWorkItemStore
    .getState()
    .items.filter((it) => it.projectId === pid && it.source === 'goal-compass')
    .length;

  if (existingGoalCompass > 0) {
    const reason = `project "${target.name}" already has ${existingGoalCompass} goal-compass WorkItems on the spine — refusing to seed; clear them first or pass a different projectId`;
    console.warn('[seedGoalCompassPlan]', reason);
    return { ok: false, reason };
  }

  // ── Ensure a Goal Tree (store's own default template). ────────────────
  const goalTreeStore = useGoalTreeStore.getState();
  goalTreeStore.ensureDefault(pid, target.projectType ?? null);
  const goalTree = useGoalTreeStore.getState().getGoalTree(pid);
  if (!goalTree) {
    const reason = `failed to ensure a Goal Tree for "${target.name}"`;
    console.warn('[seedGoalCompassPlan]', reason);
    return { ok: false, reason };
  }

  // ── Ensure a Site Profile (~25 acres + valid defaults). ───────────────
  // Built through the store's real setters, not test fixtures. acres
  // drives the engine's acreage budget; the rest are sensible facets so
  // the generated proposal is meaningful.
  const siteProfileStore = useSiteProfileStore.getState();
  siteProfileStore.ensureDefault(pid);
  const sp = useSiteProfileStore.getState();
  sp.setFacet(pid, 'acres', 25, 'manual');
  sp.setFacet(pid, 'climateZone', '7a', 'manual');
  sp.setFacet(pid, 'primaryLandform', 'rolling', 'manual');
  sp.setFacet(pid, 'avgSlopePct', 6, 'manual');
  sp.setFacet(pid, 'currentLandCover', 'pasture', 'manual');
  sp.setFacet(pid, 'soilCompaction', 'med', 'manual');
  sp.setFacet(pid, 'waterPosture', 'rainfed', 'manual');
  sp.setFacet(pid, 'household', { adults: 2, children: 1 }, 'manual');
  const siteProfile = useSiteProfileStore.getState().getSiteProfile(pid);

  // ── Reproduce GeneratedPlanTab.handleGenerate (lines 71-82). ──────────
  const projectStartDate =
    useProjectStore.getState().projects.find((p) => p.id === pid)?.startDate ??
    null;

  const result = runSequencingEngine(
    goalTree,
    siteProfile,
    pid,
    INTERVENTION_CATALOG,
  );
  const scheduledTasks = scheduleTasksToCalendar(
    result.generatedPhases,
    result.generatedTasks,
    projectStartDate,
  );
  usePhaseStore
    .getState()
    .replaceGoalCompassRows(pid, result.generatedPhases, scheduledTasks);
  pushGoalCompassToSpine(pid, result.generatedPhases, scheduledTasks);

  // ── Success summary so the operator can pick a target item. ───────────
  const gcItems = useWorkItemStore
    .getState()
    .items.filter((it) => it.projectId === pid && it.source === 'goal-compass');
  const withMaterialsAuto = gcItems.filter(
    (it) => (it.materialsAuto?.length ?? 0) > 0,
  ).length;
  const withEquipmentAuto = gcItems.filter(
    (it) => (it.equipmentRequiredAuto?.length ?? 0) > 0,
  ).length;
  const sample =
    gcItems.find(
      (it) =>
        (it.materialsAuto?.length ?? 0) > 0 ||
        (it.equipmentRequiredAuto?.length ?? 0) > 0,
    ) ?? gcItems[0];
  const sampleItemId = sample?.id ?? null;

  console.info(
    `[seedGoalCompassPlan] generated ${gcItems.length} goal-compass WorkItems on "${target.name}" (${pid}) — ${withMaterialsAuto} with materialsAuto, ${withEquipmentAuto} with equipmentRequiredAuto. Sample item id: ${sampleItemId ?? '(none)'}`,
  );

  return {
    ok: true,
    inserted: {
      workItems: gcItems.length,
      withMaterialsAuto,
      withEquipmentAuto,
      sampleItemId,
    },
  };
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedGoalCompassPlan =
    seedGoalCompassPlan;
}
