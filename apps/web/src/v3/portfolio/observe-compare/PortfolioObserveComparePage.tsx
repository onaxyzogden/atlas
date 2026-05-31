/**
 * PortfolioObserveComparePage — cross-project Observe comparison surface
 * (OLOS Portfolio Home Spec §6, plan P6). Strictly READ-ONLY and
 * frontend-only: every value is derived from the client-side Phase-4
 * `useObserveDataPointStore` (the source of truth for numeric measurements +
 * capture timestamps). No backend read, no migration, no mutation (§6).
 *
 * Flow:
 *   1. Project selector chips — pick 2–5 projects that have Observe data
 *      (projects with none are excluded with a notice, §9.3).
 *   2. Domain selector — the INTERSECTION of domains present in every
 *      selected project's active data points (only comparable domains).
 *   3. Comparison chart — one line per project, X = calendar date (NOT
 *      cycle, §9.3), Y = numeric measurement or status ordinal (auto-detected).
 *   4. Summary table — per project baseline / current / change / trend, plus a
 *      climate-context badge (P4 `deriveClimateContext`) so readings are read
 *      in seasonal + hemispheric context.
 *
 * Entry points: per-project Observe domain header ("Compare with other
 * projects" → navigates here with `?from=<projectId>&domain=<domainId>`); the
 * Portfolio surface ("Compare Observe data").
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowUp, Minus } from 'lucide-react';
import {
  UNIVERSAL_DOMAIN_LABELS,
  type ObserveStatusOutput,
  type UniversalDomain,
} from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import { projectCentroid } from '../portfolioModel.js';
import {
  buildComparison,
  domainIntersection,
  selectableProjectIds,
  type CompareProjectMeta,
  type CompareTrend,
} from './observeCompareModel.js';
import ComparisonChart from './ComparisonChart.js';
import css from './PortfolioObserveComparePage.module.css';

const MIN_PROJECTS = 2;
const MAX_PROJECTS = 5;

const STATUS_LABEL_TEXT: Record<ObserveStatusOutput, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Needs investigation',
  major_constraint: 'Major constraint',
  potential_disqualifier: 'Potential disqualifier',
};

const HEMISPHERE_LABEL = { north: 'N. hemisphere', south: 'S. hemisphere' } as const;
const BAND_LABEL = {
  tropical: 'Tropical',
  temperate: 'Temperate',
  polar: 'Polar',
} as const;
const SEASON_LABEL = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
} as const;

function TrendIcon({ trend }: { trend: CompareTrend }) {
  if (trend === 'up') return <ArrowUp size={14} aria-label="increased" />;
  if (trend === 'down') return <ArrowDown size={14} aria-label="decreased" />;
  return <Minus size={14} aria-label="unchanged" />;
}

interface CompareSearch {
  from?: string;
  domain?: string;
}

export default function PortfolioObserveComparePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as CompareSearch;

  const projects = useProjectStore((s) => s.projects);
  const byProject = useObserveDataPointStore((s) => s.byProject);

  // Active projects only; archived ones never enter the portfolio surfaces.
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects],
  );

  const metas: CompareProjectMeta[] = useMemo(
    () =>
      activeProjects.map((p) => ({
        id: p.id,
        name: p.name,
        centroid: projectCentroid(p),
      })),
    [activeProjects],
  );

  // Projects with ≥1 active Observe data point — the only selectable ones.
  const selectableIds = useMemo(
    () =>
      selectableProjectIds(
        byProject,
        activeProjects.map((p) => p.id),
      ),
    [byProject, activeProjects],
  );
  const selectableSet = useMemo(() => new Set(selectableIds), [selectableIds]);

  // Projects excluded because they carry no Observe data (surface a notice).
  const excludedNames = useMemo(
    () =>
      activeProjects
        .filter((p) => !selectableSet.has(p.id))
        .map((p) => p.name),
    [activeProjects, selectableSet],
  );

  const nameById = useMemo(
    () => new Map(metas.map((m) => [m.id, m.name])),
    [metas],
  );

  // Initial selection: the originating project (?from) if it has data, plus
  // the next selectable projects up to MIN_PROJECTS.
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const seed: string[] = [];
    if (search.from && selectableSet.has(search.from)) seed.push(search.from);
    for (const id of selectableIds) {
      if (seed.length >= MIN_PROJECTS) break;
      if (!seed.includes(id)) seed.push(id);
    }
    return seed;
  });

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PROJECTS) return prev; // enforce §6 cap
      return [...prev, id];
    });
  };

  // Comparable domains = intersection across the selected projects.
  const domainOptions = useMemo(
    () =>
      selectedIds.length >= MIN_PROJECTS
        ? domainIntersection(byProject, selectedIds)
        : [],
    [byProject, selectedIds],
  );

  const [domainOverride, setDomainOverride] = useState<UniversalDomain | null>(
    search.domain && domainOptions.includes(search.domain as UniversalDomain)
      ? (search.domain as UniversalDomain)
      : null,
  );

  // Resolve the active domain: explicit override if still valid, else first
  // available comparable domain.
  const selectedDomain: UniversalDomain | null = useMemo(() => {
    if (domainOverride && domainOptions.includes(domainOverride)) {
      return domainOverride;
    }
    return domainOptions[0] ?? null;
  }, [domainOverride, domainOptions]);

  const result = useMemo(
    () =>
      selectedDomain && selectedIds.length >= MIN_PROJECTS
        ? buildComparison(metas, byProject, selectedIds, selectedDomain)
        : null,
    [metas, byProject, selectedIds, selectedDomain],
  );

  const hasPlottableData =
    result !== null && result.series.some((s) => s.points.length >= 2);

  return (
    <div className={css.page}>
      <header className={css.header}>
        <button
          type="button"
          className={css.backBtn}
          onClick={() => navigate({ to: '/v3/portfolio' })}
        >
          <ArrowLeft size={15} aria-hidden /> Portfolio
        </button>
        <div>
          <h1 className={css.title}>Compare Observe data</h1>
          <p className={css.subtitle}>
            Align Observe trends across projects by calendar date. Read-only —
            no project data is changed here.
          </p>
        </div>
      </header>

      {/* ---- Project selector (2–5) ------------------------------------- */}
      <section className={css.section}>
        <div className={css.sectionHead}>
          <span className={css.sectionLabel}>Projects</span>
          <span className={css.sectionMeta}>
            {selectedIds.length}/{MAX_PROJECTS} selected (min {MIN_PROJECTS})
          </span>
        </div>
        {selectableIds.length === 0 ? (
          <p className={css.notice}>
            No projects have Observe data yet. Record observations in a
            project's Observe dashboard to compare them here.
          </p>
        ) : (
          <div className={css.chips}>
            {selectableIds.map((id) => {
              const active = selectedIds.includes(id);
              const atCap = !active && selectedIds.length >= MAX_PROJECTS;
              return (
                <button
                  key={id}
                  type="button"
                  className={`${css.chip} ${active ? css.chipActive : ''}`}
                  aria-pressed={active}
                  disabled={atCap}
                  title={atCap ? `Maximum ${MAX_PROJECTS} projects` : undefined}
                  onClick={() => toggleProject(id)}
                >
                  {nameById.get(id) ?? 'Project'}
                </button>
              );
            })}
          </div>
        )}
        {excludedNames.length > 0 ? (
          <p className={css.notice}>
            Excluded (no Observe data): {excludedNames.join(', ')}
          </p>
        ) : null}
      </section>

      {/* ---- Domain selector -------------------------------------------- */}
      {selectedIds.length >= MIN_PROJECTS ? (
        <section className={css.section}>
          <div className={css.sectionHead}>
            <span className={css.sectionLabel}>Domain</span>
            <span className={css.sectionMeta}>
              shared across selected projects
            </span>
          </div>
          {domainOptions.length === 0 ? (
            <p className={css.notice}>
              The selected projects share no Observe domain. Pick projects that
              have observations in the same domain to compare.
            </p>
          ) : (
            <div className={css.chips}>
              {domainOptions.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={`${css.chip} ${
                    selectedDomain === domain ? css.chipActive : ''
                  }`}
                  aria-pressed={selectedDomain === domain}
                  onClick={() => setDomainOverride(domain)}
                >
                  {UNIVERSAL_DOMAIN_LABELS[domain]}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className={css.notice}>
          Select at least {MIN_PROJECTS} projects to compare.
        </p>
      )}

      {/* ---- Chart + summary -------------------------------------------- */}
      {result && selectedDomain ? (
        <section className={css.section}>
          <div className={css.sectionHead}>
            <span className={css.sectionLabel}>
              {UNIVERSAL_DOMAIN_LABELS[selectedDomain]} ·{' '}
              {result.mode === 'numeric' ? 'measurement' : 'status'}
            </span>
          </div>

          {hasPlottableData ? (
            <div className={css.chartWrap}>
              <ComparisonChart
                result={result}
                statusLabelText={STATUS_LABEL_TEXT}
              />
            </div>
          ) : (
            <p className={css.notice}>
              Trends need at least two readings at the same domain. Add more
              observations to see a comparison line.
            </p>
          )}

          {/* Legend + summary table */}
          <table className={css.table}>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Baseline</th>
                <th scope="col">Current</th>
                <th scope="col">Change</th>
                <th scope="col">Climate</th>
              </tr>
            </thead>
            <tbody>
              {result.series.map((s) => {
                const baselineLabel =
                  s.baseline === null
                    ? '—'
                    : result.mode === 'numeric'
                      ? s.baseline.yValue.toFixed(2)
                      : (STATUS_LABEL_TEXT[s.baseline.point.statusOutput] ??
                        String(s.baseline.yValue));
                const currentLabel =
                  s.current === null
                    ? '—'
                    : result.mode === 'numeric'
                      ? s.current.yValue.toFixed(2)
                      : (STATUS_LABEL_TEXT[s.current.point.statusOutput] ??
                        String(s.current.yValue));
                return (
                  <tr key={s.projectId}>
                    <th scope="row" className={css.projectCell}>
                      <span
                        className={css.swatch}
                        style={{ background: s.color }}
                        aria-hidden
                      />
                      {s.projectName}
                    </th>
                    <td>{baselineLabel}</td>
                    <td>{currentLabel}</td>
                    <td>
                      <span className={css.changeCell}>
                        <TrendIcon trend={s.trend} />
                        {s.change === null
                          ? '—'
                          : result.mode === 'numeric'
                            ? (s.change > 0 ? '+' : '') + s.change.toFixed(2)
                            : s.change === 0
                              ? 'no change'
                              : s.change > 0
                                ? 'worsened'
                                : 'improved'}
                      </span>
                    </td>
                    <td>
                      {s.climate ? (
                        <span
                          className={css.climateBadge}
                          title={`${SEASON_LABEL[s.climate.season]} at the latest reading — ${HEMISPHERE_LABEL[s.climate.hemisphere]}, ${BAND_LABEL[s.climate.latitudeBand]} latitude`}
                        >
                          {SEASON_LABEL[s.climate.season]} ·{' '}
                          {BAND_LABEL[s.climate.latitudeBand]} ·{' '}
                          {HEMISPHERE_LABEL[s.climate.hemisphere]}
                        </span>
                      ) : (
                        <span className={css.climateMuted}>No location</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={css.footnote}>
            Hollow ring marks each project's baseline (earliest reading). Status
            change is read worst-to-best: "improved" means the status moved
            toward Clear.
          </p>
        </section>
      ) : null}
    </div>
  );
}
