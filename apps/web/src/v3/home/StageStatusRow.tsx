// StageStatusRow.tsx
//
// Per-Project Home (Slice 5.4) Stage Status Row. Three small bento cards
// summarising where each stage stands for this one project:
//
//   - Plan:    complete vs total Plan tier objectives (status engine)
//   - Act:     field action counts by status (verified / in-flight / blocked)
//   - Observe: foundation domain freshness (current / ageing+stale / missing)
//
// Each card is clickable and routes to that stage's primary surface for
// the project. The metric set is intentionally compact — the deeper
// drill-downs live on each stage's own canvas; this row exists so the
// steward can answer "where am I?" without leaving home.

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  computeAllObjectiveStatuses,
  computeDomainFreshness,
  FOUNDATION_DOMAINS_FOR_REVISION,
  OBSERVE_DOMAIN_CATALOG,
  type ObserveFreshness,
} from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import { useObserveDataPointStore } from '../../store/observeDataPointStore.js';
import {
  toProgressMap,
  usePlanTierProgressStore,
} from '../../store/planTierStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useProjectObjectives } from '../plan/tiers/useProjectObjectives.js';
import css from './PerProjectHomePage.module.css';

export interface StageStatusRowProps {
  project: LocalProject;
}

interface StageMetric {
  label: string;
  value: string;
}

function StageCard({
  eyebrow,
  title,
  metrics,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  metrics: StageMetric[];
  onOpen: () => void;
}) {
  return (
    <BentoBox
      outer="default"
      padding="md"
      className={css.stageCard}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open ${title}`}
    >
      <BentoBox.Body>
        <span className={css.stageEyebrow}>{eyebrow}</span>
        <h3 className={css.stageTitle}>{title}</h3>
        <div className={css.stageMetrics}>
          {metrics.map((m) => (
            <div key={m.label} className={css.stageMetric}>
              <span className={css.stageMetricLabel}>{m.label}</span>
              <span className={css.stageMetricValue}>{m.value}</span>
            </div>
          ))}
        </div>
      </BentoBox.Body>
    </BentoBox>
  );
}

export default function StageStatusRow({ project }: StageStatusRowProps) {
  const navigate = useNavigate();
  // Sub-slice D - Plan metrics count THIS project's resolved objective set, not
  // the static skeleton (falls back to it for null-type / pre-slice projects).
  const { objectives } = useProjectObjectives(project.id);
  const planProgress = usePlanTierProgressStore(
    (s) => s.byProject[project.id],
  );
  const fieldActions = useFieldActionStore((s) => s.byProject[project.id]);
  const dataPoints = useObserveDataPointStore(
    (s) => s.byProject[project.id],
  );

  const planMetrics = useMemo<StageMetric[]>(() => {
    const statuses = computeAllObjectiveStatuses(
      objectives,
      toProgressMap(planProgress ?? {}),
    );
    let complete = 0;
    let active = 0;
    let available = 0;
    let locked = 0;
    for (const objective of objectives) {
      const s = statuses[objective.id];
      if (s === 'complete') complete += 1;
      else if (s === 'active') active += 1;
      else if (s === 'available') available += 1;
      else locked += 1;
    }
    return [
      {
        label: 'Objectives complete',
        value: `${complete} / ${objectives.length}`,
      },
      { label: 'Active', value: String(active) },
      { label: 'Available', value: String(available) },
      { label: 'Locked', value: String(locked) },
    ];
  }, [objectives, planProgress]);

  const actMetrics = useMemo<StageMetric[]>(() => {
    const list = fieldActions ?? [];
    let verified = 0;
    let inFlight = 0;
    let blocked = 0;
    let diverged = 0;
    for (const a of list) {
      if (a.status === 'verified') verified += 1;
      else if (a.status === 'in_progress' || a.status === 'submitted')
        inFlight += 1;
      else if (a.status === 'blocked') blocked += 1;
      else if (a.status === 'diverged') diverged += 1;
    }
    return [
      { label: 'Verified', value: String(verified) },
      { label: 'In flight', value: String(inFlight) },
      { label: 'Blocked', value: String(blocked) },
      { label: 'Diverged', value: String(diverged) },
    ];
  }, [fieldActions]);

  const observeMetrics = useMemo<StageMetric[]>(() => {
    const points = dataPoints ?? [];
    const nowMs = Date.now();
    const byDomain = new Map<string, typeof points>();
    for (const p of points) {
      const bucket = byDomain.get(p.domainId) ?? [];
      bucket.push(p);
      byDomain.set(p.domainId, bucket);
    }
    let current = 0;
    let warning = 0;
    let missing = 0;
    for (const domain of FOUNDATION_DOMAINS_FOR_REVISION) {
      const fr: ObserveFreshness = computeDomainFreshness(
        byDomain.get(domain) ?? [],
        nowMs,
        OBSERVE_DOMAIN_CATALOG[domain].freshnessThresholds,
      );
      if (fr === 'current') current += 1;
      else if (fr === 'ageing' || fr === 'stale') warning += 1;
      else missing += 1;
    }
    return [
      {
        label: 'Foundation current',
        value: `${current} / ${FOUNDATION_DOMAINS_FOR_REVISION.length}`,
      },
      { label: 'Ageing + stale', value: String(warning) },
      { label: 'Missing', value: String(missing) },
    ];
  }, [dataPoints]);

  return (
    <div className={css.stageRow}>
      <StageCard
        eyebrow="Plan"
        title="Plan stratum shell"
        metrics={planMetrics}
        onOpen={() =>
          navigate({
            to: '/v3/project/$projectId/plan',
            params: { projectId: project.id },
          })
        }
      />
      <StageCard
        eyebrow="Act"
        title="Field actions"
        metrics={actMetrics}
        onOpen={() =>
          navigate({
            to: '/v3/project/$projectId/act/field-action',
            params: { projectId: project.id },
          })
        }
      />
      <StageCard
        eyebrow="Observe"
        title="Land state"
        metrics={observeMetrics}
        onOpen={() =>
          navigate({
            to: '/v3/project/$projectId/observe/dashboard',
            params: { projectId: project.id },
          })
        }
      />
    </div>
  );
}
