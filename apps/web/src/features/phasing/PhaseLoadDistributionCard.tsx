/**
 * §15 PhaseLoadDistributionCard — entity-load distribution across
 * build phases.
 *
 * The PhasingDashboard already shows per-phase feature lists with
 * cost / labor / material rollups inside each phase card. What's
 * missing is the cross-phase distribution lens: at a glance, which
 * phases carry most of the build, and which phases are empty
 * placeholders. This card reads every phase-bearing entity store
 * (structures, utilities, paths, crop areas, paddocks), buckets the
 * project's items by `phase` name, and renders a horizontal load
 * bar for each phase plus a per-entity-type breakdown.
 *
 * Tone bands per phase:
 *   - empty     → no entities of any kind assigned (often the
 *                 default Phase 4 "Full Vision")
 *   - light     → 1..3 entities (sketch-level)
 *   - balanced  → 4..15 entities (typical)
 *   - heavy     → 16+ entities or >50% of project total
 *
 * Pure presentation. No engine evaluation, no entity writes, no
 * shared math, no map overlays. Closes manifest §15
 * `timeline-phasing` partial -> done.
 */

import { useMemo } from 'react';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './PhaseLoadDistributionCard.module.css';

/* ------------------------------------------------------------------ */
/*  Tones                                                              */
/* ------------------------------------------------------------------ */

type Tone = 'empty' | 'light' | 'balanced' | 'heavy';

const TONE_LABEL: Record<Tone, string> = {
  empty: 'Empty',
  light: 'Light',
  balanced: 'Balanced',
  heavy: 'Heavy',
};

const TONE_CLASS: Record<Tone, string> = {
  empty: css.toneEmpty!,
  light: css.toneLight!,
  balanced: css.toneBalanced!,
  heavy: css.toneHeavy!,
};

/* ------------------------------------------------------------------ */
/*  Row shape                                                          */
/* ------------------------------------------------------------------ */

interface PhaseRow {
  id: string;
  name: string;
  timeframe: string;
  color: string;
  order: number;
  completed: boolean;
  structures: number;
  utilities: number;
  paths: number;
  crops: number;
  paddocks: number;
  total: number;
  sharePct: number | null;
  tone: Tone;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  projectId: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PhaseLoadDistributionCard({ projectId }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const { rows, projectTotal, unassignedCount } = useMemo(() => {
    const phasesList = (Array.isArray(allPhases) ? allPhases : []).filter(
      (p) => p.projectId === projectId,
    );
    const structuresList = (Array.isArray(allStructures) ? allStructures : []).filter(
      (e) => e.projectId === projectId,
    );
    const utilitiesList = (Array.isArray(allUtilities) ? allUtilities : []).filter(
      (e) => e.projectId === projectId,
    );
    const pathsList = (Array.isArray(allPaths) ? allPaths : []).filter(
      (e) => e.projectId === projectId,
    );
    const cropAreasList = (Array.isArray(allCropAreas) ? allCropAreas : []).filter(
      (e) => e.projectId === projectId,
    );
    const paddocksList = (Array.isArray(allPaddocks) ? allPaddocks : []).filter(
      (e) => e.projectId === projectId,
    );

    const sortedPhases = [...phasesList].sort((a, b) => a.order - b.order);
    const phaseNames = new Set(sortedPhases.map((p) => p.name));

    const countByPhase = (items: { phase: string }[]): Map<string, number> => {
      const map = new Map<string, number>();
      for (const it of items) {
        const k = it.phase;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return map;
    };

    const sCount = countByPhase(structuresList);
    const uCount = countByPhase(utilitiesList);
    const pCount = countByPhase(pathsList);
    const cCount = countByPhase(cropAreasList);
    const pdCount = countByPhase(paddocksList);

    const total =
      structuresList.length +
      utilitiesList.length +
      pathsList.length +
      cropAreasList.length +
      paddocksList.length;

    const rowList: PhaseRow[] = sortedPhases.map((ph) => {
      const s = sCount.get(ph.name) ?? 0;
      const u = uCount.get(ph.name) ?? 0;
      const p = pCount.get(ph.name) ?? 0;
      const c = cCount.get(ph.name) ?? 0;
      const pd = pdCount.get(ph.name) ?? 0;
      const t = s + u + p + c + pd;
      const share = total > 0 ? (t / total) * 100 : null;
      let tone: Tone;
      if (t === 0) tone = 'empty';
      else if (t <= 3) tone = 'light';
      else if (t >= 16 || (share !== null && share > 50)) tone = 'heavy';
      else tone = 'balanced';
      return {
        id: ph.id,
        name: ph.name,
        timeframe: ph.timeframe,
        color: ph.color,
        order: ph.order,
        completed: ph.completed,
        structures: s,
        utilities: u,
        paths: p,
        crops: c,
        paddocks: pd,
        total: t,
        sharePct: share,
        tone,
      };
    });

    const allEntityPhases = [
      ...structuresList.map((e) => e.phase),
      ...utilitiesList.map((e) => e.phase),
      ...pathsList.map((e) => e.phase),
      ...cropAreasList.map((e) => e.phase),
      ...paddocksList.map((e) => e.phase),
    ];
    const unassigned = allEntityPhases.filter((ph) => !phaseNames.has(ph)).length;

    return { rows: rowList, projectTotal: total, unassignedCount: unassigned };
  }, [
    allPhases,
    allStructures,
    allUtilities,
    allPaths,
    allCropAreas,
    allPaddocks,
    projectId,
  ]);

  const emptyCount = rows.filter((r) => r.tone === 'empty').length;
  const heavyCount = rows.filter((r) => r.tone === 'heavy').length;
  const balancedCount = rows.filter((r) => r.tone === 'balanced').length;

  let headlineTone: 'good' | 'fair' | 'poor';
  if (rows.length === 0 || projectTotal === 0) headlineTone = 'poor';
  else if (emptyCount === 0 && heavyCount <= 1) headlineTone = 'good';
  else if (emptyCount <= 1 && heavyCount <= 2) headlineTone = 'fair';
  else headlineTone = 'poor';

  const HEADLINE_TONE_CLASS = {
    good: css.headlineGood!,
    fair: css.headlineFair!,
    poor: css.headlinePoor!,
  } as const;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Phase load distribution
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§15</span>
          </h3>
          <p className={css.cardHint}>
            How the project's placed entities &mdash; structures, utilities,
            paths, crop areas, paddocks &mdash; are distributed across build
            phases. <em>Empty</em> phases hold no entities yet; <em>heavy</em>{' '}
            phases carry an outsized share. A balanced project tends toward all
            phases populated, with no single phase dominating.
          </p>
        </div>
        <div className={`${css.headlinePill} ${HEADLINE_TONE_CLASS[headlineTone]}`}>
          <span className={css.headlineLabel}>Distribution</span>
          <span className={css.headlineScore}>
            {balancedCount}
            <span className={css.headlineScoreDim}> / {rows.length}</span>
          </span>
          <span className={css.headlineSub}>
            {projectTotal === 0
              ? 'no entities placed'
              : `${projectTotal} entities · ${emptyCount} empty`}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className={css.empty}>No phases defined for this project yet.</p>
      ) : (
        <ul className={css.rowList}>
          {rows.map((row) => (
            <li key={row.id} className={`${css.row} ${TONE_CLASS[row.tone]}`}>
              <div className={css.rowHead}>
                <div
                  className={css.phaseDot}
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span className={css.rowName}>{row.name}</span>
                <span className={css.rowYears} style={{ color: row.color }}>
                  {row.timeframe}
                </span>
                <span className={`${css.tonePill} ${TONE_CLASS[row.tone]}`}>
                  {TONE_LABEL[row.tone]}
                </span>
                {row.completed && (
                  <span className={css.donePill}>Marked complete</span>
                )}
              </div>

              <div className={css.barTrack}>
                <div
                  className={css.barFill}
                  style={{
                    width: `${row.sharePct ?? 0}%`,
                    backgroundColor: row.color,
                  }}
                  aria-label={`${row.sharePct?.toFixed(0) ?? 0}% of project entities`}
                />
              </div>

              <div className={css.rowStats}>
                <Stat label="Total" value={row.total} dim={
                  row.sharePct !== null && row.total > 0
                    ? `${row.sharePct.toFixed(0)}% of project`
                    : 'no entities'
                } />
                <Stat label="Structures" value={row.structures} />
                <Stat label="Utilities" value={row.utilities} />
                <Stat label="Paths" value={row.paths} />
                <Stat label="Crops" value={row.crops} />
                <Stat label="Paddocks" value={row.paddocks} />
              </div>

              {row.tone === 'empty' && (
                <p className={css.rowFlag}>
                  No entities assigned to this phase yet &mdash; either expected
                  (Full Vision phase) or a sequencing gap.
                </p>
              )}
              {row.tone === 'heavy' && (
                <p className={css.rowFlag}>
                  This phase carries{' '}
                  {row.sharePct !== null
                    ? `${row.sharePct.toFixed(0)}% of project entities`
                    : 'an outsized share'}{' '}
                  &mdash; consider whether some items can shift to adjacent phases.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        <em>Scope:</em> distribution is across the five entity types that carry a{' '}
        <code>phase</code> field. Zones, which are categorised but not phased,
        are evaluated in sibling cards on the Zones panel.{' '}
        {unassignedCount > 0 && (
          <>
            <em>Unassigned:</em> {unassignedCount} entit
            {unassignedCount === 1 ? 'y references' : 'ies reference'} a phase
            name not in this project's phase list &mdash; likely a renamed or
            deleted phase.
          </>
        )}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  dim,
}: {
  label: string;
  value: number;
  dim?: string;
}) {
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statValue}>
        {value}
        {dim && <span className={css.statDim}> {dim}</span>}
      </span>
    </div>
  );
}
