/**
 * BuildOrderCard — §9 structure dependency and build-order rollup.
 *
 * Buckets placed structures into a four-phase build order based on their
 * `category` and `infrastructureReqs` from STRUCTURE_TEMPLATES, and
 * checks whether each structure's required utilities (water / power /
 * septic) are satisfied by placed utilities in the project:
 *
 *   Phase 1 — Foundation utilities   (placed utilities themselves,
 *                                     grouped by water / power / septic)
 *   Phase 2 — Core dwellings         (category: 'dwelling')
 *   Phase 3 — Working buildings      (category: 'agricultural' or
 *                                     'infrastructure')
 *   Phase 4 — Program & spiritual    (category: 'gathering' or
 *                                     'spiritual')
 *
 * Each structure pill shows a "✓" / "⚠" status based on whether the
 * project's placed utilities meet its infrastructureReqs. The header
 * surfaces total blocked count so a steward can scan the rollup and
 * answer "which buildings can I actually start construction on?"
 *
 * Pure presentation. Reads structureStore + utilityStore; no new
 * entities, no shared-package math.
 *
 * Spec: §9 `structure-dependency-build-order` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useStructureStore,
  type StructureType,
} from '../../store/structureStore.js';
import {
  useUtilityStore,
  type UtilityType,
} from '../../store/utilityStore.js';
import { STRUCTURE_TEMPLATES } from './footprints.js';
import css from './BuildOrderCard.module.css';

interface Props {
  projectId: string;
}

/* ------------------------------------------------------------------ */
/*  Phase model                                                        */
/* ------------------------------------------------------------------ */

type PhaseId = 1 | 2 | 3 | 4;

interface PhaseConfig {
  id: PhaseId;
  label: string;
  blurb: string;
  /** Categories from STRUCTURE_TEMPLATES that bucket into this phase. */
  categories: ReadonlyArray<
    'dwelling' | 'agricultural' | 'spiritual' | 'utility' | 'gathering' | 'infrastructure'
  >;
}

const PHASES: PhaseConfig[] = [
  { id: 1, label: 'Phase 1 — Foundation', blurb: 'Utilities first: water, power, septic.', categories: [] },
  { id: 2, label: 'Phase 2 — Dwellings',  blurb: 'Cabins, yurts, earthships — depend on Phase 1.', categories: ['dwelling'] },
  { id: 3, label: 'Phase 3 — Working',    blurb: 'Barns, workshops, greenhouses, storage.', categories: ['agricultural', 'infrastructure'] },
  { id: 4, label: 'Phase 4 — Program',    blurb: 'Gathering, spiritual, retreat surfaces.', categories: ['gathering', 'spiritual'] },
];

/* ------------------------------------------------------------------ */
/*  Utility-type → req-key map                                         */
/*  Mirrors the conventions used in `dwelling-needs-*` rules.         */
/* ------------------------------------------------------------------ */

type ReqKey = 'water' | 'power' | 'septic';

const UTILITY_PROVIDES: Partial<Record<UtilityType, ReqKey>> = {
  water_tank: 'water',
  well_pump: 'water',
  rain_catchment: 'water',
  solar_panel: 'power',
  battery_room: 'power',
  generator: 'power',
  septic: 'septic',
  greywater: 'septic',
};

interface PlacedStructureRow {
  id: string;
  type: StructureType;
  label: string;
  icon: string;
  unmetReqs: ReqKey[];
}

interface PhaseRollup {
  phase: PhaseConfig;
  rows: PlacedStructureRow[];
  blockedCount: number;
}

interface FoundationRow {
  reqKey: ReqKey;
  label: string;
  icon: string;
  count: number;
}

const FOUNDATION_ROWS: ReadonlyArray<{ reqKey: ReqKey; label: string; icon: string }> = [
  { reqKey: 'water',  label: 'Water source',  icon: '\u{1F4A7}' },
  { reqKey: 'power',  label: 'Power source',  icon: '\u26A1' },
  { reqKey: 'septic', label: 'Septic system', icon: '\u{1F6BD}' },
];

export default function BuildOrderCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((u) => u.utilities);

  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );

  /* Foundation phase — count placed utilities by req key */
  const foundation = useMemo<FoundationRow[]>(() => {
    const counts: Record<ReqKey, number> = { water: 0, power: 0, septic: 0 };
    for (const u of utilities) {
      const provides = UTILITY_PROVIDES[u.type];
      if (provides) counts[provides] += 1;
    }
    return FOUNDATION_ROWS.map((r) => ({ ...r, count: counts[r.reqKey] }));
  }, [utilities]);

  /* Which req keys are satisfied by placed utilities */
  const reqsMet = useMemo<Record<ReqKey, boolean>>(() => {
    return {
      water: foundation.find((f) => f.reqKey === 'water')?.count ? true : false,
      power: foundation.find((f) => f.reqKey === 'power')?.count ? true : false,
      septic: foundation.find((f) => f.reqKey === 'septic')?.count ? true : false,
    };
  }, [foundation]);

  /* Bucket placed structures by phase + check dependency satisfaction */
  const phases = useMemo<PhaseRollup[]>(() => {
    return PHASES.map((phase) => {
      if (phase.categories.length === 0) {
        return { phase, rows: [], blockedCount: 0 };
      }
      const rows: PlacedStructureRow[] = [];
      for (const s of structures) {
        const tmpl = STRUCTURE_TEMPLATES[s.type];
        if (!tmpl || !phase.categories.includes(tmpl.category)) continue;
        const unmet: ReqKey[] = [];
        for (const req of tmpl.infrastructureReqs) {
          if (req === 'water' && !reqsMet.water) unmet.push('water');
          else if (req === 'power' && !reqsMet.power) unmet.push('power');
          else if (req === 'septic' && !reqsMet.septic) unmet.push('septic');
        }
        rows.push({
          id: s.id,
          type: s.type,
          label: tmpl.label,
          icon: tmpl.icon,
          unmetReqs: unmet,
        });
      }
      const blockedCount = rows.filter((r) => r.unmetReqs.length > 0).length;
      return { phase, rows, blockedCount };
    });
  }, [structures, reqsMet]);

  const totalStructures = structures.length;
  const totalBlocked = phases.reduce((acc, p) => acc + p.blockedCount, 0);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Structure Dependency &amp; Build Order</h2>
        <span className={css.cardHint}>
          {totalStructures} structure{totalStructures !== 1 ? 's' : ''}
          {totalBlocked > 0 && (
            <>
              {' '}
              &middot;{' '}
              <span className={css.blockedTag}>
                {totalBlocked} blocked
              </span>
            </>
          )}
        </span>
      </div>

      {totalStructures === 0 && utilities.length === 0 ? (
        <div className={css.empty}>
          No structures or utilities placed yet. Build order is derived
          from category and infrastructure dependencies once features are placed.
        </div>
      ) : (
        <ol className={css.phaseList}>
          {/* Phase 1 — utilities */}
          <li className={css.phaseItem}>
            <div className={css.phaseHead}>
              <span className={css.phaseLabel}>{PHASES[0]!.label}</span>
              <span className={css.phaseBlurb}>{PHASES[0]!.blurb}</span>
            </div>
            <div className={css.foundationGrid}>
              {foundation.map((f) => (
                <div
                  key={f.reqKey}
                  className={`${css.foundationCell} ${
                    f.count > 0 ? css.foundationMet : css.foundationUnmet
                  }`}
                >
                  <span className={css.foundationIcon}>{f.icon}</span>
                  <span className={css.foundationLabel}>{f.label}</span>
                  <span className={css.foundationCount}>
                    {f.count > 0 ? `${f.count} placed` : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </li>

          {/* Phases 2-4 — placed structures bucketed */}
          {phases.slice(1).map(({ phase, rows, blockedCount }) => (
            <li key={phase.id} className={css.phaseItem}>
              <div className={css.phaseHead}>
                <span className={css.phaseLabel}>{phase.label}</span>
                <span className={css.phaseBlurb}>{phase.blurb}</span>
                {rows.length > 0 && (
                  <span className={css.phaseCount}>
                    {rows.length}
                    {blockedCount > 0 && (
                      <span className={css.blockedInline}>
                        {' '}
                        &middot; {blockedCount} blocked
                      </span>
                    )}
                  </span>
                )}
              </div>
              {rows.length === 0 ? (
                <div className={css.phaseEmpty}>
                  No {phase.id === 2 ? 'dwellings' : phase.id === 3 ? 'working buildings' : 'program structures'} placed yet.
                </div>
              ) : (
                <ul className={css.structureList}>
                  {rows.map((r) => (
                    <li
                      key={r.id}
                      className={`${css.structurePill} ${
                        r.unmetReqs.length > 0 ? css.structurePillBlocked : ''
                      }`}
                    >
                      <span className={css.structureIcon}>{r.icon}</span>
                      <span className={css.structureName}>{r.label}</span>
                      {r.unmetReqs.length === 0 ? (
                        <span className={css.statusOk}>{'\u2713'} ready</span>
                      ) : (
                        <span className={css.statusBlocked}>
                          {'\u26A0'} needs {r.unmetReqs.join(' + ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className={css.footnote}>
        Spec ref: §9 structure dependency and build order. Phase buckets are
        derived from the <em>category</em> and <em>infrastructureReqs</em> on
        each structure template; "blocked" means at least one required
        utility (water / power / septic) has not been placed yet. Sequencing
        is heuristic — a steward can build out of order if their site has
        existing utilities.
      </div>
    </div>
  );
}
