/**
 * PermitReadinessCard — §15 per-phase permit-gate rollup.
 *
 * Closes the §15 spec line "Permit dependency warnings, readiness
 * checklist per phase" by enumerating the typical regulatory gates each
 * phase will need to clear before its structures can break ground.
 *
 * Five permit categories cover the regenerative-ag site permitting
 * landscape:
 *
 *   1. Residential building permit  — habitable / working structures
 *   2. Septic perc test             — anything needing septic
 *   3. Well drilling permit         — actual wells, plus structures
 *                                     needing water without on-site
 *                                     storage already placed
 *   4. Electrical service / interconnect — structures needing grid power
 *   5. Agricultural exemption       — eligibility flag when ag-only
 *                                     structures dominate the project
 *
 * Pure heuristic — derives status from structure types,
 * `infrastructureReqs`, and what's already placed in the project. No
 * shared-package math, no new entities, no permit-tracking field
 * persisted (jurisdictional metadata varies enough that we'd need a
 * full schema to do it justice — flagged as a follow-on).
 *
 * Spec: §15 permit-dependencies-readiness-checklist (featureManifest).
 */

import { useMemo } from 'react';
import {
  useStructureStore,
  type Structure,
  type StructureType,
} from '../../store/structureStore.js';
import { usePhaseStore, type BuildPhase } from '../../store/phaseStore.js';
import css from './PermitReadinessCard.module.css';

interface Props {
  projectId: string;
}

/** Structure types that trigger a residential / habitable building permit. */
const HABITABLE_TYPES: ReadonlySet<StructureType> = new Set<StructureType>([
  'cabin',
  'yurt',
  'earthship',
  'classroom',
  'prayer_space',
  'bathhouse',
  'workshop',
  'tent_glamping',
]);

/** Strictly-agricultural structure types — eligible for ag-exemption framing. */
const AGRICULTURAL_TYPES: ReadonlySet<StructureType> = new Set<StructureType>([
  'barn',
  'animal_shelter',
  'greenhouse',
  'compost_station',
  'storage',
]);

type PermitStatus = 'required' | 'eligible' | 'ok' | 'na';

interface PermitGate {
  id: 'building' | 'septic_perc' | 'well' | 'electrical' | 'ag_exemption';
  label: string;
  blurb: string;
}

const PERMITS: PermitGate[] = [
  {
    id: 'building',
    label: 'Residential building permit',
    blurb: 'Habitable / working structures need stamped plans and inspection sign-offs.',
  },
  {
    id: 'septic_perc',
    label: 'Septic perc test',
    blurb: 'Septic systems require a perc test before tank sizing and trench layout.',
  },
  {
    id: 'well',
    label: 'Well drilling permit',
    blurb: 'New wells need a drilling permit from the state water authority.',
  },
  {
    id: 'electrical',
    label: 'Electrical service / interconnect',
    blurb: 'Service entrance, sub-panel, or grid-tie inverter installation needs an inspection.',
  },
  {
    id: 'ag_exemption',
    label: 'Agricultural exemption',
    blurb: 'Ag-only buildings may qualify for an exemption that simplifies permitting.',
  },
];

interface PhaseRow {
  phase: BuildPhase;
  structures: Structure[];
  /** Per-permit status + which structures triggered it. */
  gates: Array<{
    gate: PermitGate;
    status: PermitStatus;
    triggeredBy: Structure[];
    detail: string;
  }>;
}

function evaluateGate(
  gate: PermitGate,
  phaseStructures: Structure[],
  allProjectStructures: Structure[],
): { status: PermitStatus; triggeredBy: Structure[]; detail: string } {
  switch (gate.id) {
    case 'building': {
      const triggeredBy = phaseStructures.filter((s) => HABITABLE_TYPES.has(s.type));
      if (triggeredBy.length === 0) {
        return { status: 'na', triggeredBy: [], detail: 'No habitable structures this phase.' };
      }
      return {
        status: 'required',
        triggeredBy,
        detail: `${triggeredBy.length} habitable structure${triggeredBy.length !== 1 ? 's' : ''} need building permits.`,
      };
    }
    case 'septic_perc': {
      const triggeredBy = phaseStructures.filter((s) =>
        s.infrastructureReqs.includes('septic'),
      );
      if (triggeredBy.length === 0) {
        return { status: 'na', triggeredBy: [], detail: 'Nothing this phase needs septic.' };
      }
      // If any earlier-phase structure has a septic system in place, perc test
      // may already exist — flag as "ok" (steward should still confirm).
      const hasPriorSeptic = allProjectStructures.some(
        (s) => s.type === 'compost_station' && !phaseStructures.includes(s),
      );
      if (hasPriorSeptic) {
        return {
          status: 'ok',
          triggeredBy,
          detail: 'Project already has a compost / septic structure placed; confirm the existing perc test covers this phase.',
        };
      }
      return {
        status: 'required',
        triggeredBy,
        detail: `${triggeredBy.length} structure${triggeredBy.length !== 1 ? 's' : ''} need a perc test before septic layout.`,
      };
    }
    case 'well': {
      const wellsThisPhase = phaseStructures.filter((s) => s.type === 'well');
      const wellsAnyPhase = allProjectStructures.filter((s) => s.type === 'well');
      const needsWaterNoTank = phaseStructures.filter(
        (s) =>
          s.infrastructureReqs.includes('water') &&
          !allProjectStructures.some(
            (o) => o.type === 'water_tank' || o.type === 'well',
          ),
      );
      if (wellsThisPhase.length > 0) {
        return {
          status: 'required',
          triggeredBy: wellsThisPhase,
          detail: `${wellsThisPhase.length} new well${wellsThisPhase.length !== 1 ? 's' : ''} this phase \u2014 drilling permit required.`,
        };
      }
      if (needsWaterNoTank.length > 0) {
        return {
          status: 'required',
          triggeredBy: needsWaterNoTank,
          detail: `${needsWaterNoTank.length} structure${needsWaterNoTank.length !== 1 ? 's' : ''} need water but no tank/well placed yet \u2014 plan a well permit or alternative source.`,
        };
      }
      if (wellsAnyPhase.length > 0) {
        return {
          status: 'ok',
          triggeredBy: [],
          detail: 'Existing well already serves the site.',
        };
      }
      return { status: 'na', triggeredBy: [], detail: 'No water-dependent structures this phase.' };
    }
    case 'electrical': {
      const triggeredBy = phaseStructures.filter((s) =>
        s.infrastructureReqs.includes('power'),
      );
      if (triggeredBy.length === 0) {
        return { status: 'na', triggeredBy: [], detail: 'Nothing this phase needs grid power.' };
      }
      return {
        status: 'required',
        triggeredBy,
        detail: `${triggeredBy.length} structure${triggeredBy.length !== 1 ? 's' : ''} need power \u2014 service inspection required (or off-grid solar declaration).`,
      };
    }
    case 'ag_exemption': {
      const agStructures = allProjectStructures.filter((s) => AGRICULTURAL_TYPES.has(s.type));
      const habitable = allProjectStructures.filter((s) => HABITABLE_TYPES.has(s.type));
      const triggeredBy = phaseStructures.filter((s) => AGRICULTURAL_TYPES.has(s.type));
      if (triggeredBy.length === 0 && agStructures.length === 0) {
        return { status: 'na', triggeredBy: [], detail: 'No agricultural structures.' };
      }
      // If ag structures dominate the project (>= habitable count), eligibility is plausible.
      if (agStructures.length >= habitable.length && agStructures.length > 0) {
        return {
          status: 'eligible',
          triggeredBy,
          detail: `${agStructures.length} ag structure${agStructures.length !== 1 ? 's' : ''} project-wide vs ${habitable.length} habitable \u2014 may qualify for ag-exemption (jurisdiction-dependent).`,
        };
      }
      return {
        status: 'na',
        triggeredBy: [],
        detail: 'Habitable structures outnumber ag \u2014 ag-exemption unlikely.',
      };
    }
  }
}

function StatusBadge({ status }: { status: PermitStatus }) {
  const cls =
    status === 'required' ? css.badge_required
    : status === 'eligible' ? css.badge_eligible
    : status === 'ok' ? css.badge_ok
    : css.badge_na;
  const label =
    status === 'required' ? 'Required'
    : status === 'eligible' ? 'May qualify'
    : status === 'ok' ? 'Auto-derived'
    : 'N/A';
  return <span className={`${css.chipBadge} ${cls}`}>{label}</span>;
}

export default function PermitReadinessCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allPhases = usePhaseStore((s) => s.phases);

  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const rows = useMemo<PhaseRow[]>(() => {
    return phases
      .map((phase) => {
        const phaseStructures = projectStructures.filter((s) => s.phase === phase.name);
        const gates = PERMITS.map((gate) => ({
          gate,
          ...evaluateGate(gate, phaseStructures, projectStructures),
        }));
        return { phase, structures: phaseStructures, gates };
      })
      .filter((r) => r.structures.length > 0);
  }, [phases, projectStructures]);

  if (projectStructures.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Permit Readiness</h2>
          <span className={css.cardHint}>0 structures</span>
        </div>
        <div className={css.empty}>
          No structures placed yet. Permit gates surface here once habitable,
          well, or septic-bearing structures are assigned to a phase.
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Permit Readiness</h2>
          <span className={css.cardHint}>{projectStructures.length} structures placed, none assigned to a phase</span>
        </div>
        <div className={css.empty}>
          Structures are placed but none are assigned to a phase. Open a
          structure from the Map view and set a phase to surface its
          permit gates here.
        </div>
      </div>
    );
  }

  const totalRequired = rows.reduce(
    (acc, r) => acc + r.gates.filter((g) => g.status === 'required').length,
    0,
  );

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Permit Readiness</h2>
        <span className={css.cardHint}>
          {totalRequired} gate{totalRequired !== 1 ? 's' : ''} required across {rows.length} phase{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {rows.map(({ phase, structures, gates }) => (
        <div key={phase.id} className={css.phaseBlock}>
          <div className={css.phaseHead}>
            <span className={css.phaseDot} style={{ background: phase.color }} />
            <span className={css.phaseLabel}>
              {phase.name} {'\u00B7'} {phase.timeframe}
            </span>
            <span className={css.phaseStructures}>
              {structures.length} structure{structures.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={css.chipGrid}>
            {gates.map(({ gate, status, detail }) => {
              const chipCls =
                status === 'required' ? css.chip_required
                : status === 'eligible' ? css.chip_eligible
                : status === 'ok' ? css.chip_ok
                : css.chip_na;
              return (
                <div key={gate.id} className={`${css.chip} ${chipCls}`}>
                  <div className={css.chipHead}>
                    <span className={css.chipName}>{gate.label}</span>
                    <StatusBadge status={status} />
                  </div>
                  <span className={css.chipDetail}>{detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className={css.footnote}>
        Spec ref: §15 permit-dependencies / readiness checklist. Heuristic
        derivation from structure type and <em>infrastructureReqs</em> {'\u2014'}{' '}
        a steward-facing pre-flight, not a jurisdictional permit tracker.
        Actual permit nomenclature, fees, and eligibility vary by state and
        county; treat the chips as prompts to chase, not as filed status.
      </div>
    </div>
  );
}
