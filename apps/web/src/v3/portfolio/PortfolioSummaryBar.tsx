// PortfolioSummaryBar.tsx
//
// At-a-glance portfolio metrics above the Dashboard card grid (OLOS Portfolio
// Home Spec §3). Read-only awareness — never mutates project data. Four metric
// groups: total projects · total area · per-stage counts · open divergences.
//
// The per-stage chips and the divergences metric double as FILTERS: tapping a
// stage chip toggles the grid's stage filter; tapping divergences toggles the
// "diverged only" filter. Filter state is owned by PortfolioDashboardView and
// passed in — no new store (§7.2). Stage colours come from STAGE_PAINT so the
// chips read identically to the map boundaries and the card stage bars.

import { useMemo } from 'react';
import { BentoBox } from '../../components/ui/BentoBox.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { ProjectUrgencyResult } from '@ogden/shared';
import { STAGE_PAINT, type PortfolioStage } from './portfolioModel.js';
import css from './PortfolioSummaryBar.module.css';

// Stage display order for the count chips (setup → plan → act → observe →
// archived), filtered to those actually present in the portfolio.
const STAGE_ORDER: PortfolioStage[] = [
  'setup',
  'plan',
  'act',
  'observe',
  'archived',
];

export interface PortfolioSummaryBarProps {
  projects: LocalProject[];
  stageMap: ReadonlyMap<string, PortfolioStage>;
  urgencyMap: ReadonlyMap<string, ProjectUrgencyResult>;
  /** Active stage filter, or null for "all". */
  stageFilter: PortfolioStage | null;
  /** When true the grid shows only projects with open divergences. */
  divergedOnly: boolean;
  onStageFilter: (stage: PortfolioStage | null) => void;
  onToggleDiverged: () => void;
}

/** Sum project areas, returning a formatted label with the dominant unit. */
function totalAreaLabel(projects: LocalProject[]): string {
  let sum = 0;
  let imperial = 0;
  let metric = 0;
  for (const p of projects) {
    if (typeof p.acreage === 'number' && Number.isFinite(p.acreage) && p.acreage > 0) {
      sum += p.acreage;
      if (p.units === 'imperial') imperial += 1;
      else metric += 1;
    }
  }
  if (sum <= 0) return '—';
  const unit = imperial >= metric ? 'ac' : 'ha';
  const rounded = sum >= 10 ? Math.round(sum) : Math.round(sum * 10) / 10;
  return `${rounded} ${unit}`;
}

export default function PortfolioSummaryBar({
  projects,
  stageMap,
  urgencyMap,
  stageFilter,
  divergedOnly,
  onStageFilter,
  onToggleDiverged,
}: PortfolioSummaryBarProps) {
  const totalProjects = projects.length;
  const areaLabel = useMemo(() => totalAreaLabel(projects), [projects]);

  const stageCounts = useMemo(() => {
    const counts = new Map<PortfolioStage, number>();
    for (const p of projects) {
      const stage = stageMap.get(p.id);
      if (!stage) continue;
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return counts;
  }, [projects, stageMap]);

  const openDivergences = useMemo(() => {
    let total = 0;
    for (const p of projects) {
      const b = urgencyMap.get(p.id)?.breakdown;
      if (b) total += b.divergencesCritical + b.divergencesHigh;
    }
    return total;
  }, [projects, urgencyMap]);

  return (
    <BentoBox outer="flat" padding="md" className={css.bar}>
      <div className={css.metric}>
        <span className={css.value}>{totalProjects}</span>
        <span className={css.label}>{totalProjects === 1 ? 'Project' : 'Projects'}</span>
      </div>

      <div className={css.divider} aria-hidden />

      <div className={css.metric}>
        <span className={css.value}>{areaLabel}</span>
        <span className={css.label}>Total area</span>
      </div>

      <div className={css.divider} aria-hidden />

      <div className={css.stages}>
        {STAGE_ORDER.filter((s) => (stageCounts.get(s) ?? 0) > 0).map((stage) => {
          const paint = STAGE_PAINT[stage];
          const count = stageCounts.get(stage) ?? 0;
          const active = stageFilter === stage;
          return (
            <button
              key={stage}
              type="button"
              className={`${css.stageChip} ${active ? css.stageChipActive : ''}`}
              style={{ ['--stage-color' as string]: paint.color }}
              aria-pressed={active}
              onClick={() => onStageFilter(active ? null : stage)}
            >
              <span className={css.stageDot} aria-hidden />
              <span className={css.stageCount}>{count}</span>
              <span className={css.stageName}>{paint.label}</span>
            </button>
          );
        })}
      </div>

      <div className={css.divider} aria-hidden />

      <button
        type="button"
        className={`${css.metric} ${css.divergence} ${divergedOnly ? css.divergenceActive : ''} ${openDivergences > 0 ? css.divergenceAlert : ''}`}
        aria-pressed={divergedOnly}
        disabled={openDivergences === 0}
        onClick={onToggleDiverged}
      >
        <span className={css.value}>{openDivergences}</span>
        <span className={css.label}>
          Open {openDivergences === 1 ? 'divergence' : 'divergences'}
        </span>
      </button>
    </BentoBox>
  );
}
