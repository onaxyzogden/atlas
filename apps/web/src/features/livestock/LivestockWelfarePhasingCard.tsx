/**
 * LivestockWelfarePhasingCard — §11 welfare-notes-infrastructure-phasing.
 *
 * Closes the §11 spec line "Animal welfare notes, livestock infrastructure
 * phasing" with a two-section rollup that complements the existing
 * project-wide Animal Welfare Summary on LivestockDashboard:
 *
 *   1. Per-species welfare notes — for each species present in the
 *      project's paddocks, surface the LIVESTOCK_SPECIES standards
 *      (fencing recommendation, water demand, shelter type) alongside
 *      the count of paddocks of that species that currently satisfy
 *      shelter / water / appropriate-fencing gates.
 *
 *   2. Per-phase infrastructure status — group paddocks by their `phase`
 *      string, and for each phase show paddock count, shelter coverage,
 *      water coverage, fencing gaps, and an explicit "needed before
 *      this phase can run" list (animal_shelter / water_tank counts the
 *      steward should plan for).
 *
 * Pure heuristic — reuses computeShelterAccess, computeWaterPointDistance
 * (already in livestockAnalysis), the `phase` field on Paddock, and the
 * static LIVESTOCK_SPECIES catalog. No new entity types, no new shared
 * exports, no new endpoints.
 *
 * Spec: §11 welfare-notes-infrastructure-phasing (featureManifest).
 */

import { useMemo } from 'react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
  type FenceType,
} from '../../store/livestockStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import {
  computeShelterAccess,
  computeWaterPointDistance,
} from './livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import css from './LivestockWelfarePhasingCard.module.css';

interface Props {
  projectId: string;
}

/** Fencing types considered "real" for welfare purposes — `none` and
 *  `temporary` flag a gap. */
const REAL_FENCE_TYPES: ReadonlySet<FenceType> = new Set<FenceType>([
  'electric',
  'post_wire',
  'post_rail',
  'woven_wire',
]);

/** Water-bearing structure types. Mirrors the welfare-summary filter
 *  in LivestockDashboard so coverage counts agree. */
const WATER_STRUCTURE_TYPES = new Set<Structure['type']>([
  'water_pump_house',
  'well',
  'water_tank',
]);

interface SpeciesRow {
  species: LivestockSpecies;
  paddockCount: number;
  shelterMet: number;
  waterMet: number;
  fencingMet: number;
}

interface PhaseRow {
  phase: string;
  paddocks: Paddock[];
  shelterMet: number;
  waterMet: number;
  fencingGaps: number;
  needsAnimalShelter: number;
  needsWaterPoint: number;
}

export default function LivestockWelfarePhasingCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useStructureStore((s) => s.structures);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const waterStructures = useMemo(
    () => structures.filter((s) => WATER_STRUCTURE_TYPES.has(s.type)),
    [structures],
  );

  /** Per-paddock derived gates, computed once. */
  const paddockStatus = useMemo(() => {
    return paddocks.map((p) => {
      const shelter = computeShelterAccess(p, structures);
      const water = computeWaterPointDistance(p, waterStructures);
      const fencingOk = REAL_FENCE_TYPES.has(p.fencing);
      return {
        paddock: p,
        shelterOk: shelter.hasShelter,
        waterOk: water.meetsRequirement,
        fencingOk,
      };
    });
  }, [paddocks, structures, waterStructures]);

  /** Per-species rollup — keyed by every species mentioned anywhere
   *  in this project's paddocks. A paddock with multiple species
   *  contributes to each species's row. */
  const speciesRows = useMemo<SpeciesRow[]>(() => {
    const map = new Map<LivestockSpecies, SpeciesRow>();
    for (const ps of paddockStatus) {
      for (const sp of ps.paddock.species) {
        const row = map.get(sp) ?? {
          species: sp,
          paddockCount: 0,
          shelterMet: 0,
          waterMet: 0,
          fencingMet: 0,
        };
        row.paddockCount += 1;
        if (ps.shelterOk) row.shelterMet += 1;
        if (ps.waterOk) row.waterMet += 1;
        if (ps.fencingOk) row.fencingMet += 1;
        map.set(sp, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.paddockCount - a.paddockCount);
  }, [paddockStatus]);

  /** Per-phase rollup — paddocks grouped by their `phase` string.
   *  We don't know the canonical phase ordering here (phaseStore lives
   *  separately and the field on Paddock is a free string), so we sort
   *  alphabetically — close enough for "Phase 1 / Phase 2 / ..." which
   *  is the convention everywhere else in the codebase. */
  const phaseRows = useMemo<PhaseRow[]>(() => {
    const map = new Map<string, PhaseRow>();
    for (const ps of paddockStatus) {
      const key = ps.paddock.phase || 'Unassigned';
      const row = map.get(key) ?? {
        phase: key,
        paddocks: [],
        shelterMet: 0,
        waterMet: 0,
        fencingGaps: 0,
        needsAnimalShelter: 0,
        needsWaterPoint: 0,
      };
      row.paddocks.push(ps.paddock);
      if (ps.shelterOk) row.shelterMet += 1;
      else row.needsAnimalShelter += 1;
      if (ps.waterOk) row.waterMet += 1;
      else row.needsWaterPoint += 1;
      if (!ps.fencingOk) row.fencingGaps += 1;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => a.phase.localeCompare(b.phase));
  }, [paddockStatus]);

  // Empty state
  if (paddocks.length === 0) {
    return null; // Project-wide welfare card already handles the empty case
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Welfare Notes {'\u00B7'} Infrastructure Phasing</h2>
        <span className={css.cardHint}>
          {speciesRows.length} species {'\u00B7'} {phaseRows.length} phase{phaseRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Per-species welfare standards ────────────────────────── */}
      <div className={css.sectionLabel}>Per-species welfare standards</div>
      <div className={css.speciesGrid}>
        {speciesRows.map((row) => {
          const info = LIVESTOCK_SPECIES[row.species];
          if (!info) return null;
          return (
            <div key={row.species} className={css.speciesCard}>
              <div className={css.speciesHead}>
                <span className={css.speciesIcon}>{info.icon}</span>
                <span className={css.speciesName}>{info.label}</span>
                <span className={css.speciesCount}>{row.paddockCount} paddock{row.paddockCount !== 1 ? 's' : ''}</span>
              </div>
              <div className={css.speciesNotesList}>
                <div className={css.speciesNoteRow}>
                  <span className={css.speciesNoteLabel}>Fencing</span>
                  <span className={css.speciesNoteValue}>{info.fencingNote}</span>
                </div>
                <div className={css.speciesNoteRow}>
                  <span className={css.speciesNoteLabel}>Water</span>
                  <span className={css.speciesNoteValue}>{info.waterNote}</span>
                </div>
                <div className={css.speciesNoteRow}>
                  <span className={css.speciesNoteLabel}>Shelter</span>
                  <span className={css.speciesNoteValue}>{info.shelterNote}</span>
                </div>
              </div>
              <div className={css.speciesGates}>
                <GateChip label="Shelter" met={row.shelterMet} total={row.paddockCount} />
                <GateChip label="Water"   met={row.waterMet}   total={row.paddockCount} />
                <GateChip label="Fencing" met={row.fencingMet} total={row.paddockCount} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Per-phase infrastructure rollup ──────────────────────── */}
      <div className={css.sectionLabel}>Per-phase infrastructure status</div>
      {phaseRows.map((row) => {
        const total = row.paddocks.length;
        const allGood = row.needsAnimalShelter === 0 && row.needsWaterPoint === 0 && row.fencingGaps === 0;
        return (
          <div key={row.phase} className={css.phaseRow}>
            <div className={css.phaseHead}>
              <span className={css.phaseName}>{row.phase}</span>
              <span className={css.phaseCount}>{total} paddock{total !== 1 ? 's' : ''}</span>
              {allGood && <span className={css.phaseAllGood}>All gates met</span>}
            </div>
            <div className={css.phaseGates}>
              <GateChip label="Shelter" met={row.shelterMet} total={total} />
              <GateChip label="Water"   met={row.waterMet}   total={total} />
              <GateChip label="Fencing" met={total - row.fencingGaps} total={total} />
            </div>
            {(row.needsAnimalShelter > 0 || row.needsWaterPoint > 0 || row.fencingGaps > 0) && (
              <div className={css.phaseNeeds}>
                <span className={css.phaseNeedsLabel}>Needed before phase runs:</span>
                <ul className={css.phaseNeedsList}>
                  {row.needsAnimalShelter > 0 && (
                    <li>{row.needsAnimalShelter} animal_shelter / barn placement{row.needsAnimalShelter !== 1 ? 's' : ''} (shelter access &le; 300m)</li>
                  )}
                  {row.needsWaterPoint > 0 && (
                    <li>{row.needsWaterPoint} water-point placement{row.needsWaterPoint !== 1 ? 's' : ''} (well / water_tank within species water threshold)</li>
                  )}
                  {row.fencingGaps > 0 && (
                    <li>{row.fencingGaps} paddock{row.fencingGaps !== 1 ? 's' : ''} on temporary or no fencing {'\u2014'} upgrade per species fencing note</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      <div className={css.footnote}>
        Spec ref: §11 welfare-notes-infrastructure-phasing. Fencing,
        water, and shelter standards from <em>LIVESTOCK_SPECIES</em>;
        per-paddock satisfaction from <em>computeShelterAccess</em>{' '}
        (≤300m) and <em>computeWaterPointDistance</em>{' '}
        (species-keyed thresholds, default 150m). Phase grouping uses
        the free-text <em>phase</em> field on each paddock {'\u2014'}{' '}
        adopt the same {'\u201C'}Phase 1 / Phase 2 / {'\u2026'}{'\u201D'}{' '}
        convention as structures and paths so the rollup orders cleanly.
      </div>
    </div>
  );
}

function GateChip({ label, met, total }: { label: string; met: number; total: number }) {
  const ratio = total === 0 ? 1 : met / total;
  const cls =
    ratio >= 0.999 ? css.gate_good
    : ratio >= 0.5 ? css.gate_partial
    : css.gate_poor;
  return (
    <span className={`${css.gateChip} ${cls}`}>
      <span className={css.gateChipLabel}>{label}</span>
      <span className={css.gateChipValue}>{met}/{total}</span>
    </span>
  );
}
