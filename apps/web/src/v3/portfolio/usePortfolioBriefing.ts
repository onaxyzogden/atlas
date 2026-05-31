// usePortfolioBriefing.ts
//
// Read-only composing hook for the Portfolio Home rails (OLOS Portfolio Home
// Spec §2.4 right rail + §2.5 bottom stage rail). Given the *selected* project
// (which may differ from the active project), it assembles a single briefing
// object from the same client stores + shared engines the Per-Project surfaces
// use, so the Portfolio rails never drift from Plan/Act/Observe semantics.
//
// Why a hook that re-reads the stores rather than leaning on useProjectUrgency
// alone: the urgency engine returns a SCORE + alert breakdown, but the rails
// also need the active-stratum label, the objectives fraction, the Act
// outstanding count, the Observe cycle + recent points, and a last-activity
// line. We read the five `byProject` maps once and derive all of it here;
// useProjectUrgency is reused verbatim for the alert breakdown so the alert
// copy/tone matches Portfolio cards + the Attention Rail exactly.
//
// Strictly read-only — no mutators are imported. The hook is always called
// (with an empty project), so React's hook order is stable across selection.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findProjectType,
  PLAN_STRATA,
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  type ObserveDataPoint,
  type ObserveStatusOutput,
  type PlanStratumId,
  type PlanStratumState,
  type ProjectUrgencyResult,
  type UniversalDomain,
} from '@ogden/shared';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import { useObserveDataPointStore } from '../../store/observeDataPointStore.js';
import { useObserveCycleStore } from '../../store/observeCycleStore.js';
import {
  toProgressMap,
  usePlanStratumProgressStore,
} from '../../store/planStratumStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { resolveObjectivesForProject } from '../plan/strata/useProjectObjectives.js';
import { useProjectUrgency } from '../home/useProjectUrgency.js';
import { OUTSTANDING_STATUSES, deriveStageFromSignals } from './portfolioModel.js';

/** A project's coarse lifecycle position, surfaced as the rail header pill +
 *  the bottom rail's filled (active) stage button. Mirrors PortfolioStage in
 *  portfolioModel.ts but is derived with live store data (the model's pure
 *  variant only sees the project record). */
export type BriefingStage = 'setup' | 'plan' | 'act' | 'observe' | 'archived';

export interface BriefingTypeBadge {
  id: string;
  label: string;
}

export interface BriefingActiveStratum {
  id: PlanStratumId;
  /** 1-based ordinal — rendered as "S{ordinal}". */
  ordinal: number;
  title: string;
  state: PlanStratumState;
}

export interface BriefingObservePoint {
  domainId: UniversalDomain;
  domainLabel: string;
  statusOutput: ObserveStatusOutput;
  /** Direction of the most recent status-severity change for this domain.
   *  'up' = improving (severity fell), 'down' = worsening, 'flat' = unchanged
   *  or only one capture. */
  trend: 'up' | 'down' | 'flat';
  capturedAt: string;
}

export interface BriefingLastActivity {
  at: string;
  stage: 'Act' | 'Observe';
  description: string;
  /** Pre-formatted relative label, e.g. "2 days ago". */
  relative: string;
}

export interface PortfolioBriefing {
  project: LocalProject;
  primaryType: BriefingTypeBadge | null;
  secondaryTypes: BriefingTypeBadge[];
  areaLabel: string;
  stage: BriefingStage;

  plan: {
    activeStratum: BriefingActiveStratum | null;
    objectivesComplete: number;
    objectivesTotal: number;
    allComplete: boolean;
    /** Active stratum's prerequisites are unmet (state === 'locked'). */
    gated: boolean;
    /** Where the Plan button should navigate — the active stratum, or the
     *  final stratum when everything is complete (review entry point). */
    navStratumId: PlanStratumId;
  };

  act: {
    outstanding: number;
    inProgress: number;
    blocked: number;
    openDivergences: number;
  };

  observe: {
    hasData: boolean;
    /** "Cycle 2" / "Baseline" / "No data yet". */
    cycleLabel: string;
    reviewDue: boolean;
    recentPoints: BriefingObservePoint[];
  };

  lastActivity: BriefingLastActivity | null;
  urgency: ProjectUrgencyResult | undefined;
}

const SEVERITY: Record<ObserveStatusOutput, number> = {
  clear: 0,
  unknown: 1,
  needs_investigation: 2,
  major_constraint: 3,
  potential_disqualifier: 4,
};

const LAST_STRATUM_ID = PLAN_STRATA[PLAN_STRATA.length - 1]!.id;

function formatRelativeShort(iso: string, nowMs: number): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const diff = Math.max(0, nowMs - ms);
  const day = 86_400_000;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function deriveAreaLabel(project: LocalProject): string {
  if (project.acreage == null) return 'Area unknown';
  const unit = project.units === 'imperial' ? 'ac' : 'ha';
  const rounded =
    project.acreage >= 100
      ? Math.round(project.acreage)
      : Math.round(project.acreage * 10) / 10;
  return `${rounded.toLocaleString()} ${unit}`;
}

/**
 * Assemble the read-only briefing for the selected project. Pass `null` when no
 * project is selected — the hook still runs (stable hook order) and returns
 * `null`.
 */
export function usePortfolioBriefing(
  project: LocalProject | null,
): PortfolioBriefing | null {
  const fieldActionsByProject = useFieldActionStore((s) => s.byProject);
  const dataPointsByProject = useObserveDataPointStore((s) => s.byProject);
  const cyclesByProject = useObserveCycleStore((s) => s.byProject);
  const planProgressByProject = usePlanStratumProgressStore((s) => s.byProject);

  const projectsForUrgency = useMemo(
    () => (project ? [project] : []),
    [project],
  );
  const urgencyMap = useProjectUrgency(projectsForUrgency);

  const nowMs = useMemo(() => Date.now(), []);

  return useMemo(() => {
    if (!project) return null;
    const id = project.id;
    const urgency = urgencyMap.get(id);

    // --- Project type badges ---
    const primaryDef = project.projectType
      ? findProjectType(project.projectType)
      : undefined;
    const primaryType: BriefingTypeBadge | null = primaryDef
      ? { id: primaryDef.id, label: primaryDef.label }
      : null;
    const secondaryIds =
      project.metadata?.projectTypeRecord?.secondaryTypeIds ?? [];
    const secondaryTypes: BriefingTypeBadge[] = secondaryIds
      .map((sid): BriefingTypeBadge | null => {
        const def = findProjectType(sid);
        return def ? { id: def.id, label: def.label } : null;
      })
      .filter((b): b is BriefingTypeBadge => b !== null);

    // --- Plan: objectives + active stratum ---
    const { objectives } = resolveObjectivesForProject(project);
    const progress = planProgressByProject[id] ?? {};
    const objectiveStatuses = computeAllObjectiveStatuses(
      objectives,
      toProgressMap(progress),
    );
    const objectivesTotal = objectives.length;
    const objectivesComplete = objectives.filter(
      (o) => objectiveStatuses[o.id] === 'complete',
    ).length;
    const allComplete =
      objectivesTotal > 0 && objectivesComplete === objectivesTotal;

    const stratumStates = computeAllStratumStates(
      PLAN_STRATA.map((s) => s.id),
      objectives,
      objectiveStatuses,
    );
    let activeStratum: BriefingActiveStratum | null = null;
    for (const stratum of PLAN_STRATA) {
      const state = stratumStates[stratum.id] ?? 'locked';
      if (state !== 'complete') {
        activeStratum = {
          id: stratum.id,
          ordinal: stratum.ordinal,
          title: stratum.title,
          state,
        };
        break;
      }
    }
    const gated = activeStratum?.state === 'locked';
    const navStratumId: PlanStratumId = activeStratum?.id ?? LAST_STRATUM_ID;

    // --- Act: outstanding / blocked / open divergences ---
    const fieldActions = fieldActionsByProject[id] ?? [];
    let outstanding = 0;
    let inProgress = 0;
    let blocked = 0;
    let openDivergences = 0;
    for (const a of fieldActions) {
      if (OUTSTANDING_STATUSES.has(a.status)) outstanding += 1;
      if (a.status === 'in_progress' || a.status === 'submitted') {
        inProgress += 1;
      }
      if (a.status === 'blocked') blocked += 1;
      if (
        a.status === 'diverged' &&
        a.divergenceFlag?.resolutionStatus === 'open'
      ) {
        openDivergences += 1;
      }
    }

    // --- Observe: data points, cycle, recent snapshot ---
    const dataPoints = dataPointsByProject[id] ?? [];
    const hasData = dataPoints.length > 0;

    const perDomainCycles = cyclesByProject[id] ?? {};
    let maxCycle = 0;
    for (const domain of UNIVERSAL_DOMAINS) {
      const c = perDomainCycles[domain]?.currentCycleId ?? 0;
      if (c > maxCycle) maxCycle = c;
    }
    const cycleLabel = !hasData
      ? 'No data yet'
      : maxCycle === 0
        ? 'Baseline'
        : `Cycle ${maxCycle}`;

    // Most-recent ACTIVE point per domain, top 3 by recency.
    const latestActiveByDomain = new Map<UniversalDomain, ObserveDataPoint>();
    for (const p of dataPoints) {
      if (p.isSuperseded) continue;
      const cur = latestActiveByDomain.get(p.domainId);
      if (!cur || Date.parse(p.capturedAt) > Date.parse(cur.capturedAt)) {
        latestActiveByDomain.set(p.domainId, p);
      }
    }
    const recentPoints: BriefingObservePoint[] = [...latestActiveByDomain
      .values()]
      .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
      .slice(0, 3)
      .map((p) => {
        const sameDomain = dataPoints
          .filter((q) => q.domainId === p.domainId)
          .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
        let trend: 'up' | 'down' | 'flat' = 'flat';
        if (sameDomain.length >= 2) {
          const prev = sameDomain[1]!;
          const delta = SEVERITY[p.statusOutput] - SEVERITY[prev.statusOutput];
          trend = delta < 0 ? 'up' : delta > 0 ? 'down' : 'flat';
        }
        return {
          domainId: p.domainId,
          domainLabel: UNIVERSAL_DOMAIN_LABELS[p.domainId],
          statusOutput: p.statusOutput,
          trend,
          capturedAt: p.capturedAt,
        };
      });

    const reviewDue =
      (urgency?.breakdown.cyclicalReviewsDue ?? 0) > 0 ||
      (urgency?.breakdown.staleFoundationDomains ?? 0) > 0;

    // --- Last activity (latest field-action update or Observe capture) ---
    let lastActivity: BriefingLastActivity | null = null;
    let bestMs = -Infinity;
    for (const a of fieldActions) {
      const ms = Date.parse(a.updatedAt);
      if (Number.isFinite(ms) && ms > bestMs) {
        bestMs = ms;
        lastActivity = {
          at: a.updatedAt,
          stage: 'Act',
          description: a.title,
          relative: formatRelativeShort(a.updatedAt, nowMs),
        };
      }
    }
    for (const p of dataPoints) {
      const ms = Date.parse(p.capturedAt);
      if (Number.isFinite(ms) && ms > bestMs) {
        bestMs = ms;
        lastActivity = {
          at: p.capturedAt,
          stage: 'Observe',
          description: UNIVERSAL_DOMAIN_LABELS[p.domainId],
          relative: formatRelativeShort(p.capturedAt, nowMs),
        };
      }
    }

    // --- Live-data lifecycle stage (shared rule; see portfolioModel) ---
    const stage: BriefingStage = deriveStageFromSignals({
      archived: project.status === 'archived',
      wizardComplete: project.metadata?.wizardStatus === 'complete',
      hasBoundary:
        project.hasParcelBoundary || project.parcelBoundaryGeojson != null,
      outstanding,
      hasData,
      allComplete,
    });

    return {
      project,
      primaryType,
      secondaryTypes,
      areaLabel: deriveAreaLabel(project),
      stage,
      plan: {
        activeStratum,
        objectivesComplete,
        objectivesTotal,
        allComplete,
        gated,
        navStratumId,
      },
      act: { outstanding, inProgress, blocked, openDivergences },
      observe: { hasData, cycleLabel, reviewDue, recentPoints },
      lastActivity,
      urgency,
    };
  }, [
    project,
    urgencyMap,
    fieldActionsByProject,
    dataPointsByProject,
    cyclesByProject,
    planProgressByProject,
    nowMs,
  ]);
}
