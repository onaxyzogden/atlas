/**
 * PhasingDashboard — P2 entry point for §15 Timeline, Phasing & Staged Buildout.
 *
 * Composes existing phase infrastructure (phaseStore + aggregatePhaseFeatures)
 * into a single dashboard surface that shows the buildout arc: phases, feature
 * rollups per phase, and per-phase cost estimates.
 *
 * Out of scope: Gantt, critical-path solver, inline phase editing — those live
 * in other panels (Phase settings, Economics, Scenarios).
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import {
  aggregatePhaseFeatures,
  checkBuildOrder,
  checkCropBuildOrder,
  checkStructureBuildOrder,
} from '../../../components/panels/timeline/timelineHelpers.js';
import PermitReadinessCard from '../../structures/PermitReadinessCard.js';
import PathModesCard from './PathModesCard.js';
import css from './PhasingDashboard.module.css';

interface PhasingDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function formatCurrency(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function PhasingDashboard({ project, onSwitchToMap }: PhasingDashboardProps) {
  // Ensure default Phase 1–4 exists for this project before reading.
  const ensureDefaults = usePhaseStore((s) => s.ensureDefaults);
  useEffect(() => {
    ensureDefaults(project.id);
  }, [project.id, ensureDefaults]);

  const allPhases = usePhaseStore((s) => s.phases);
  const togglePhaseCompleted = usePhaseStore((s) => s.togglePhaseCompleted);
  const updatePhase = usePhaseStore((s) => s.updatePhase);
  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === project.id),
    [allPaths, project.id],
  );
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  // Reuse the existing aggregator — single source of truth for feature counts.
  const summaries = useMemo(
    () => aggregatePhaseFeatures(structures, paths, utilities),
    [structures, paths, utilities],
  );

  // Per-phase rollup — sums user-entered `costEstimate`, `laborHoursEstimate`,
  // and `materialTonnageEstimate` values (§15 cost-labor-material-per-phase).
  // Structures without a value contribute 0; the empty state is explicit in
  // the UI rather than back-filled with a heuristic.
  const rollupByPhase = useMemo(() => {
    const map = new Map<string, { cost: number; laborHrs: number; materialTons: number }>();
    for (const st of structures) {
      const phaseName = st.phase || 'Unassigned';
      const prev = map.get(phaseName) ?? { cost: 0, laborHrs: 0, materialTons: 0 };
      map.set(phaseName, {
        cost: prev.cost + (st.costEstimate ?? 0),
        laborHrs: prev.laborHrs + (st.laborHoursEstimate ?? 0),
        materialTons: prev.materialTons + (st.materialTonnageEstimate ?? 0),
      });
    }
    return map;
  }, [structures]);

  // Buildout dependency warnings — §15 build-sequence-infrastructure-water-
  // regen-revenue. Three checkers run in parallel:
  //   - Utilities against their prerequisite utilities (existing)
  //   - Crops against water-source utilities / structures (new)
  //   - Structures against drivable paths (new)
  const buildViolations = useMemo(() => checkBuildOrder(utilities), [utilities]);
  const cropViolations = useMemo(
    () => checkCropBuildOrder(cropAreas, utilities, structures),
    [cropAreas, utilities, structures],
  );
  const structureViolations = useMemo(
    () => checkStructureBuildOrder(structures, paths),
    [structures, paths],
  );
  const totalViolations = buildViolations.length + cropViolations.length + structureViolations.length;

  const totalFeatures = structures.length + utilities.length + paths.length;
  const totals = useMemo(() => {
    let cost = 0;
    let laborHrs = 0;
    let materialTons = 0;
    for (const r of rollupByPhase.values()) {
      cost += r.cost;
      laborHrs += r.laborHrs;
      materialTons += r.materialTons;
    }
    return { cost, laborHrs, materialTons };
  }, [rollupByPhase]);
  const totalCost = totals.cost;
  const totalLaborHrs = totals.laborHrs;
  const totalMaterialTons = totals.materialTons;
  const firstPhase = phases[0];
  const lastPhase = phases[phases.length - 1];
  const arcRange =
    firstPhase && lastPhase
      ? `${firstPhase.timeframe} \u2192 ${lastPhase.timeframe}`
      : '—';

  // Phase-completion rollup — drives the Arc-summary progress indicator.
  const completedCount = useMemo(() => phases.filter((p) => p.completed).length, [phases]);
  const completionPct =
    phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

  // §15 temporary-vs-permanent-seasonal — let the steward hide short-lived
  // items (winter-only grazing routes, construction tents, prototype paddocks)
  // so the permanent buildout arc is legible on its own.
  const [hideTemporary, setHideTemporary] = useState(false);
  const temporaryCount = useMemo(() => {
    let n = 0;
    for (const summary of summaries.values()) {
      for (const f of summary.features) if (f.isTemporary) n++;
    }
    return n;
  }, [summaries]);

  return (
    <div className={css.page}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>SECTION 15 · TIMELINE, PHASING &amp; STAGED BUILDOUT</span>
          <h1 className={css.title}>Timeline &amp; Phasing</h1>
          <p className={css.desc}>
            The property's buildout arc — structures, utilities, and paths grouped
            by phase, with rough cost rollups. Edit phase names, timeframes, or
            feature assignments from the map-view Phase settings.
          </p>
        </div>
        <div className={css.headerActions}>
          {temporaryCount > 0 && (
            <label className={css.hideTempToggle}>
              <input
                type="checkbox"
                checked={hideTemporary}
                onChange={(e) => setHideTemporary(e.target.checked)}
              />
              Hide temporary ({temporaryCount})
            </label>
          )}
          <button className={css.mapBtn} onClick={onSwitchToMap}>
            Open Map View
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7H11M8 4L11 7L8 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Buildout Arc summary ────────────────────────────────────── */}
      <div className={css.arc}>
        <div className={css.arcCell}>
          <span className={css.arcLabel}>Phases</span>
          <span className={css.arcValue}>{phases.length}</span>
        </div>
        <div className={css.arcCell}>
          <span className={css.arcLabel}>Features placed</span>
          <span className={css.arcValue}>{totalFeatures}</span>
          <span className={css.arcDetail}>
            {structures.length} structures · {utilities.length} utilities · {paths.length} paths
          </span>
        </div>
        <div className={css.arcCell}>
          <span className={css.arcLabel}>Est. total cost</span>
          <span className={css.arcValue}>{formatCurrency(totalCost)}</span>
          <span className={css.arcDetail}>
            {totalLaborHrs > 0 || totalMaterialTons > 0
              ? `${totalLaborHrs > 0 ? `${Math.round(totalLaborHrs).toLocaleString()} labor hrs` : '\u2014 labor'} \u00B7 ${totalMaterialTons > 0 ? `${totalMaterialTons.toFixed(1)} t material` : '\u2014 material'}`
              : 'Sum of structure estimates'}
          </span>
        </div>
        <div className={css.arcCell}>
          <span className={css.arcLabel}>Arc</span>
          <span className={css.arcValueSmall}>{arcRange}</span>
        </div>
        <div className={css.arcCell}>
          <span className={css.arcLabel}>Completion</span>
          <span className={css.arcValue}>
            {completedCount}<span className={css.arcValueSuffix}>/{phases.length}</span>
          </span>
          <div className={css.arcProgressTrack}>
            <div
              className={css.arcProgressFill}
              style={{ width: `${completionPct}%` }}
              aria-label={`${completionPct}% complete`}
            />
          </div>
          <span className={css.arcDetail}>{completionPct}% of phases marked done</span>
        </div>
      </div>

      {/* ── Phase cards ─────────────────────────────────────────────── */}
      <div className={css.phaseList}>
        {phases.length === 0 ? (
          <div className={css.empty}>
            <p>No phases defined yet. Phase defaults should load automatically — if you see this, try reloading.</p>
          </div>
        ) : (
          phases.map((phase) => {
            const summary = summaries.get(phase.name);
            const allFeatures = summary?.features ?? [];
            const features = hideTemporary
              ? allFeatures.filter((f) => !f.isTemporary)
              : allFeatures;
            const featureCount = features.length;
            const rollup = rollupByPhase.get(phase.name) ?? { cost: 0, laborHrs: 0, materialTons: 0 };
            const { cost, laborHrs, materialTons } = rollup;
            return (
              <div
                key={phase.id}
                className={`${css.phaseCard} ${phase.completed ? css.phaseCardCompleted : ''}`}
              >
                <div className={css.phaseHead}>
                  <button
                    type="button"
                    className={`${css.phaseCheckbox} ${phase.completed ? css.phaseCheckboxChecked : ''}`}
                    onClick={() => togglePhaseCompleted(phase.id)}
                    aria-label={phase.completed ? `Mark ${phase.name} incomplete` : `Mark ${phase.name} complete`}
                    aria-pressed={phase.completed}
                    style={phase.completed ? { borderColor: phase.color, background: phase.color } : undefined}
                  >
                    {phase.completed && (
                      <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 6.5L5 9L9.5 3.5" />
                      </svg>
                    )}
                  </button>
                  <div className={css.phaseCircle} style={{ borderColor: phase.color, color: phase.color }}>
                    {phase.order}
                  </div>
                  <div className={css.phaseMeta}>
                    <div className={css.phaseNameRow}>
                      <span className={css.phaseName}>{phase.name}</span>
                      <span className={css.phaseYears} style={{ color: phase.color }}>
                        {phase.timeframe}
                      </span>
                      {phase.completed && phase.completedAt && (
                        <span className={css.phaseCompletedBadge}>
                          Completed {new Date(phase.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {phase.description && (
                      <div className={css.phaseDesc}>{phase.description}</div>
                    )}
                  </div>
                  <div className={css.phaseStats}>
                    <div className={css.stat}>
                      <span className={css.statValue}>{featureCount}</span>
                      <span className={css.statLabel}>features</span>
                    </div>
                    <div className={css.stat}>
                      <span className={css.statValue}>{formatCurrency(cost)}</span>
                      <span className={css.statLabel}>est. cost</span>
                    </div>
                    <div className={css.stat}>
                      <span className={css.statValue}>
                        {laborHrs > 0 ? `${Math.round(laborHrs).toLocaleString()} hr` : '\u2014'}
                      </span>
                      <span className={css.statLabel}>labor</span>
                    </div>
                    <div className={css.stat}>
                      <span className={css.statValue}>
                        {materialTons > 0 ? `${materialTons.toFixed(1)} t` : '\u2014'}
                      </span>
                      <span className={css.statLabel}>material</span>
                    </div>
                  </div>
                </div>

                {features.length > 0 && (
                  <ul className={css.featureList}>
                    {features.slice(0, 8).map((f) => (
                      <li
                        key={f.id}
                        className={`${css.featureItem} ${f.isTemporary ? css.featureItemTemporary : ''}`}
                        title={f.isTemporary ? 'Temporary / seasonal' : undefined}
                      >
                        <span className={css.featureType}>{f.featureType}</span>
                        <span className={css.featureName}>{f.name}</span>
                        <span className={css.featureSubGroup}>
                          <span className={css.featureSub}>{f.subType}</span>
                          {f.isTemporary && <span className={css.featureTempBadge}>temp</span>}
                        </span>
                      </li>
                    ))}
                    {features.length > 8 && (
                      <li className={css.featureMore}>
                        + {features.length - 8} more
                      </li>
                    )}
                  </ul>
                )}

                {/* Working notes — blockers, vendors, decisions */}
                <div className={css.phaseNotesBlock}>
                  <label className={css.phaseNotesLabel} htmlFor={`phase-notes-${phase.id}`}>
                    Working notes
                  </label>
                  <textarea
                    id={`phase-notes-${phase.id}`}
                    className={css.phaseNotesInput}
                    placeholder="Blockers, vendor contacts, scope adjustments, decisions to revisit&#8230;"
                    value={phase.notes ?? ''}
                    onChange={(e) => updatePhase(phase.id, { notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Build-order warnings ────────────────────────────────────── */}
      {totalViolations > 0 ? (
        <div className={css.card}>
          <div className={css.cardHead}>
            <h2 className={css.cardTitle}>Build-Order Warnings ({totalViolations})</h2>
            <span className={css.cardHint}>
              Infrastructure &rarr; Water &rarr; Regen &rarr; Revenue sequencing
              violations. Features scheduled before their prerequisites.
            </span>
          </div>

          {buildViolations.length > 0 && (
            <>
              <div className={css.warnSubhead}>
                Utility prerequisites ({buildViolations.length})
              </div>
              <ul className={css.warnList}>
                {buildViolations.map((v, i) => (
                  <li key={`u-${i}`} className={css.warnItem}>
                    <span className={css.warnDot} />
                    <div className={css.warnBody}>
                      <span className={css.warnName}>
                        {v.utilityName}{' '}
                        <span className={css.warnPhase}>({v.utilityPhase})</span>
                      </span>
                      <span className={css.warnReason}>
                        Missing <strong>{v.missingType}</strong> &mdash; {v.reason}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {structureViolations.length > 0 && (
            <>
              <div className={css.warnSubhead}>
                Structure access ({structureViolations.length})
              </div>
              <ul className={css.warnList}>
                {structureViolations.map((v, i) => (
                  <li key={`s-${i}`} className={css.warnItem}>
                    <span className={css.warnDot} />
                    <div className={css.warnBody}>
                      <span className={css.warnName}>
                        {v.structureName}{' '}
                        <span className={css.warnPhase}>({v.structurePhase})</span>
                      </span>
                      <span className={css.warnReason}>
                        <strong>{v.structureType.replace(/_/g, ' ')}</strong> &mdash;{' '}
                        {v.reason}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {cropViolations.length > 0 && (
            <>
              <div className={css.warnSubhead}>
                Crop irrigation tie-in ({cropViolations.length})
              </div>
              <ul className={css.warnList}>
                {cropViolations.map((v, i) => (
                  <li key={`c-${i}`} className={css.warnItem}>
                    <span className={css.warnDot} />
                    <div className={css.warnBody}>
                      <span className={css.warnName}>
                        {v.cropAreaName}{' '}
                        <span className={css.warnPhase}>({v.cropAreaPhase})</span>
                      </span>
                      <span className={css.warnReason}>
                        <strong>{v.cropAreaType.replace(/_/g, ' ')}</strong> &mdash;{' '}
                        {v.reason}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        (structures.length + utilities.length + cropAreas.length > 0) && (
          <div className={css.card}>
            <div className={css.cardHead}>
              <h2 className={css.cardTitle}>Build-Order Warnings (0)</h2>
              <span className={css.cardHint}>
                No sequencing violations detected across utilities, structures,
                or irrigated crops.
              </span>
            </div>
          </div>
        )
      )}

      {/* ── §15 Per-phase permit readiness ──────────────────────────── */}
      <PermitReadinessCard projectId={project.id} />

      {/* ── §22 Build path modes (Fastest / Cheapest / Regen / Investor) ── */}
      <PathModesCard project={project} />

      {/* ── Footnote ────────────────────────────────────────────────── */}
      <div className={css.footnote}>
        Spec ref: §15 Timeline, Phasing &amp; Staged Buildout. This is the P2
        visualization; per-year cashflow projection lives under Finance →
        Economics, and scenario modeling under Finance → Scenarios.
      </div>
    </div>
  );
}
