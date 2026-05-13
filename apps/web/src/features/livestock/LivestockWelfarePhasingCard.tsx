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

import { useMemo, useState } from 'react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
  type FenceType,
  type PastureQuality,
} from '../../store/livestockStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { usePhaseStoreCappedEntities } from '../../v3/plan/usePhaseStoreCappedEntities.js';
import {
  computeShelterAccess,
  computeWaterPointDistance,
  PASTURE_QUALITY_MULTIPLIER,
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

// `PASTURE_QUALITY_MULTIPLIER` is now exported from livestockAnalysis.ts —
// canonical mapping shared with `computePaddockRecommendedStocking`. Imported
// at the top of this file.

const PASTURE_QUALITY_LABEL: Record<PastureQuality, string> = {
  poor: 'Poor (~0.7 AUE/ha)',
  fair: 'Fair (~1.2 AUE/ha)',
  good: 'Good (~2.5 AUE/ha)',
  excellent: 'Excellent (3.7+ AUE/ha)',
};

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
  qualityMultiplierSum: number;
  qualityCount: number;
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
  const allStructures = useAllStructures();
  // Empty-state pasture-quality picker. `typicalStocking` in the catalog is
  // calibrated for good pasture, so 'good' is the natural default — moving
  // the selector rescales the displayed stocking values in real time.
  const [refPastureQuality, setRefPastureQuality] = useState<PastureQuality>('good');

  // Cap by active Plan view via phaseStore.BuildPhase.yeomansCap.
  const paddocksRaw = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const paddocks = usePhaseStoreCappedEntities(paddocksRaw);
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
          qualityMultiplierSum: 0,
          qualityCount: 0,
        };
        row.paddockCount += 1;
        if (ps.shelterOk) row.shelterMet += 1;
        if (ps.waterOk) row.waterMet += 1;
        if (ps.fencingOk) row.fencingMet += 1;
        const q = ps.paddock.pastureQuality;
        row.qualityMultiplierSum += q ? PASTURE_QUALITY_MULTIPLIER[q] : 1.0;
        row.qualityCount += 1;
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

  // Empty state — render the species reference catalog + guidance so the
  // tab has tangible content even before paddocks exist. Per-paddock rollup
  // (gate chips, per-phase needs) populates once paddocks are drawn via the
  // Paddock cell design tab.
  if (paddocks.length === 0) {
    const referenceSpecies = Object.entries(LIVESTOCK_SPECIES) as Array<
      [LivestockSpecies, (typeof LIVESTOCK_SPECIES)[LivestockSpecies]]
    >;
    const multiplier = PASTURE_QUALITY_MULTIPLIER[refPastureQuality];

    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Welfare Notes {'·'} Infrastructure Phasing</h2>
          <span className={css.cardHint}>Reference {'·'} no paddocks yet</span>
        </div>

        <p className={css.emptyMsg}>
          No paddocks drawn yet for this project. Use the{' '}
          <strong>Paddock cell design</strong> tab in this slide-up to draw
          paddocks {'—'} this view will then roll up per-species welfare
          standards (fencing / water / shelter) and per-phase infrastructure
          gates.
        </p>

        <label className={css.qualityPicker}>
          <span className={css.qualityPickerLabel}>Pasture quality</span>
          <select
            className={css.qualitySelect}
            value={refPastureQuality}
            onChange={(e) => setRefPastureQuality(e.target.value as PastureQuality)}
          >
            {(Object.keys(PASTURE_QUALITY_LABEL) as PastureQuality[]).map((q) => (
              <option key={q} value={q}>{PASTURE_QUALITY_LABEL[q]}</option>
            ))}
          </select>
        </label>

        <div className={css.sectionLabel}>Per-species welfare standards (reference)</div>
        <div className={css.speciesGrid}>
          {referenceSpecies.map(([key, info]) => (
            <div key={key} className={css.speciesCard}>
              <div className={css.speciesHead}>
                <span className={css.speciesIcon}>{info.icon}</span>
                <span className={css.speciesName}>{info.label}</span>
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
                <div className={css.speciesNoteRow}>
                  <span className={css.speciesNoteLabel}>Stocking</span>
                  <span className={css.speciesNoteValue}>
                    {Math.round(info.typicalStocking * multiplier * 10) / 10}{' '}
                    {info.stockingUnit} / ha
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={css.sectionLabel}>Per-phase infrastructure status</div>
        <p className={css.emptyMsg}>
          Per-phase infrastructure gates appear once paddocks are drawn.
        </p>

        <div className={css.footnote}>
          Spec ref: §11 welfare-notes-infrastructure-phasing. Species standards
          from <em>LIVESTOCK_SPECIES</em>; per-paddock satisfaction (shelter
          access, water access, fencing) populates after paddocks exist via{' '}
          <em>computeShelterAccess</em> and <em>computeWaterPointDistance</em>.
        </div>
      </div>
    );
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
                <div className={css.speciesNoteRow}>
                  <span className={css.speciesNoteLabel}>Stocking</span>
                  <span className={css.speciesNoteValue}>
                    {Math.round(info.typicalStocking * (row.qualityMultiplierSum / row.qualityCount) * 10) / 10}{' '}
                    {info.stockingUnit} / ha
                  </span>
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
