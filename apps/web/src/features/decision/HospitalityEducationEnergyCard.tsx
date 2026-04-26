/**
 * §21 HospitalityEducationEnergyCard — feasibility notes for the
 * three programmatic facets that don't fit cleanly into the
 * Domain Feasibility checklist: overnight hosting, education/teaching
 * capacity, and energy headroom.
 *
 * Three sub-panels, each with a small headline grid + a one-line
 * verdict ("Comfortable / Tight / Insufficient") so a steward can
 * tell at a glance whether the placed structures and utilities
 * support the project's hospitality/education/energy intent.
 *
 * Pure presentation; reads structureStore + utilityStore + a tiny
 * climate hint. No shared-package math; no AI.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType, type Structure } from '../../store/structureStore.js';
import { useUtilityStore, type Utility } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './HospitalityEducationEnergyCard.module.css';

interface Props {
  project: LocalProject;
}

interface ClimateSummary {
  annual_solar_radiation_kwh_m2?: number;
  peak_sun_hours?: number;
}

// ─── Hospitality: per-type sleeping capacity (heads) ────────────────────
const SLEEP_CAPACITY: Partial<Record<StructureType, number>> = {
  cabin: 4,
  yurt: 4,
  tent_glamping: 2,
  earthship: 6,
};

// ─── Education: per-type seat density (m² per seated learner) ───────────
// Classroom = tight indoor seating; pavilion = looser outdoor circle;
// prayer space = side-program / overflow at half density.
const SEAT_M2_PER_LEARNER: Partial<Record<StructureType, number>> = {
  classroom: 1.5,
  pavilion: 2.5,
  prayer_space: 2.0,
};

// ─── Energy: solar panel array assumption ──────────────────────────────
// Each placed `solar_panel` utility is treated as a 5-kW DC array unless
// the steward sets per-panel capacity (we don't carry that field today).
const SOLAR_KW_PER_PLACEMENT = 5;
const DEFAULT_PEAK_SUN_HOURS = 4.5;
const GENERATOR_KWH_PER_DAY = 12; // backup, runs ~2 hrs at 6 kW

// ─── Bath ratio reference (1 bathhouse per 8 sleeping heads) ───────────
const BATH_RATIO_TARGET = 8;

interface HospitalityFacts {
  beds: number;
  bathhouses: number;
  bathRatio: number; // beds per bathhouse (∞ = 0 bathhouses with beds present)
  pavilionGatherSeats: number;
  verdict: 'comfortable' | 'tight' | 'absent';
  verdictNote: string;
}

interface EducationFacts {
  classroomSeats: number;
  pavilionSeats: number;
  prayerSeats: number;
  totalSeats: number;
  verdict: 'comfortable' | 'tight' | 'absent';
  verdictNote: string;
}

interface EnergyFacts {
  solarKw: number;
  peakSunHours: number;
  estimatedGenKwhPerDay: number;
  generators: number;
  declaredDemandKwhPerDay: number;
  beds: number;
  inferredDemandKwhPerDay: number;
  verdict: 'surplus' | 'balanced' | 'deficit' | 'no-data';
  verdictNote: string;
}

function area(s: Structure): number {
  return Math.max(0, s.widthM) * Math.max(0, s.depthM);
}

function buildHospitalityFacts(structures: Structure[]): HospitalityFacts {
  let beds = 0;
  let bathhouses = 0;
  let pavilionGatherSeats = 0;
  for (const st of structures) {
    const cap = SLEEP_CAPACITY[st.type];
    if (typeof cap === 'number') {
      beds += cap * (st.storiesCount && st.storiesCount > 1 ? st.storiesCount : 1);
    }
    if (st.type === 'bathhouse') bathhouses += 1;
    if (st.type === 'pavilion') {
      // Stand-up gather density: 1 person per 1 m² (events).
      pavilionGatherSeats += Math.round(area(st));
    }
  }
  const bathRatio = bathhouses > 0 ? beds / bathhouses : Number.POSITIVE_INFINITY;

  let verdict: HospitalityFacts['verdict'] = 'absent';
  let verdictNote = 'No overnight structures placed yet.';
  if (beds > 0) {
    if (bathhouses === 0) {
      verdict = 'tight';
      verdictNote = `${beds} beds with no bathhouse placed — sanitation gap.`;
    } else if (bathRatio > BATH_RATIO_TARGET * 1.5) {
      verdict = 'tight';
      verdictNote = `Bath ratio 1:${bathRatio.toFixed(0)} — target is 1:${BATH_RATIO_TARGET}.`;
    } else {
      verdict = 'comfortable';
      verdictNote = `${beds} beds across ${bathhouses} bathhouse${bathhouses === 1 ? '' : 's'} (1:${bathRatio.toFixed(1)}).`;
    }
  }

  return { beds, bathhouses, bathRatio, pavilionGatherSeats, verdict, verdictNote };
}

function buildEducationFacts(structures: Structure[]): EducationFacts {
  let classroomSeats = 0;
  let pavilionSeats = 0;
  let prayerSeats = 0;
  for (const st of structures) {
    const density = SEAT_M2_PER_LEARNER[st.type];
    if (typeof density !== 'number') continue;
    const seats = Math.floor(area(st) / density);
    if (st.type === 'classroom') classroomSeats += seats;
    else if (st.type === 'pavilion') pavilionSeats += Math.floor(seats * 0.8);
    else if (st.type === 'prayer_space') prayerSeats += Math.floor(seats * 0.5);
  }
  const totalSeats = classroomSeats + pavilionSeats + prayerSeats;

  let verdict: EducationFacts['verdict'] = 'absent';
  let verdictNote = 'No teaching surfaces placed yet.';
  if (totalSeats > 0) {
    if (classroomSeats === 0) {
      verdict = 'tight';
      verdictNote = `${totalSeats} seats outdoors-only — weather-dependent program.`;
    } else if (classroomSeats < 8) {
      verdict = 'tight';
      verdictNote = `${classroomSeats} indoor seats — small-cohort only.`;
    } else {
      verdict = 'comfortable';
      verdictNote = `${classroomSeats} indoor + ${pavilionSeats + prayerSeats} flex seats.`;
    }
  }
  return { classroomSeats, pavilionSeats, prayerSeats, totalSeats, verdict, verdictNote };
}

function buildEnergyFacts(
  utilities: Utility[],
  beds: number,
  peakSunHours: number,
): EnergyFacts {
  let solarPanels = 0;
  let generators = 0;
  let declaredDemand = 0;
  for (const u of utilities) {
    if (u.type === 'solar_panel') solarPanels += 1;
    else if (u.type === 'generator') generators += 1;
    if (typeof u.demandKwhPerDay === 'number' && Number.isFinite(u.demandKwhPerDay)) {
      declaredDemand += u.demandKwhPerDay;
    }
  }
  const solarKw = solarPanels * SOLAR_KW_PER_PLACEMENT;
  const estimatedGenKwhPerDay = solarKw * peakSunHours;
  // Per-bed inferred household load: ~6 kWh/bed/day (lights, fridge share,
  // pump cycles, small appliances) — rough heuristic.
  const inferredDemandKwhPerDay = beds * 6;
  const effectiveDemand = Math.max(declaredDemand, inferredDemandKwhPerDay);

  let verdict: EnergyFacts['verdict'] = 'no-data';
  let verdictNote = 'No solar panels or demand declared yet.';
  if (solarPanels === 0 && effectiveDemand === 0) {
    verdict = 'no-data';
    verdictNote = 'No solar panels or demand declared yet.';
  } else if (solarPanels === 0) {
    verdict = 'deficit';
    verdictNote = `~${effectiveDemand.toFixed(0)} kWh/day need with no solar placed.`;
  } else if (effectiveDemand === 0) {
    verdict = 'surplus';
    verdictNote = `${solarKw.toFixed(0)} kW array placed; declare loads to validate.`;
  } else {
    const ratio = estimatedGenKwhPerDay / effectiveDemand;
    if (ratio >= 1.4) {
      verdict = 'surplus';
      verdictNote = `${(ratio * 100 - 100).toFixed(0)}% headroom over estimated demand.`;
    } else if (ratio >= 0.95) {
      verdict = 'balanced';
      verdictNote = `Generation matches demand within ${Math.abs(ratio * 100 - 100).toFixed(0)}%.`;
    } else {
      verdict = 'deficit';
      verdictNote = `${((1 - ratio) * 100).toFixed(0)}% short — add ${Math.ceil((effectiveDemand - estimatedGenKwhPerDay) / (peakSunHours * SOLAR_KW_PER_PLACEMENT))} more panel${effectiveDemand - estimatedGenKwhPerDay > peakSunHours * SOLAR_KW_PER_PLACEMENT ? 's' : ''} or trim load.`;
    }
  }

  return {
    solarKw,
    peakSunHours,
    estimatedGenKwhPerDay,
    generators,
    declaredDemandKwhPerDay: declaredDemand,
    beds,
    inferredDemandKwhPerDay,
    verdict,
    verdictNote,
  };
}

function verdictClass(v: string): string {
  if (v === 'comfortable' || v === 'surplus') return css.verdictGood ?? '';
  if (v === 'balanced') return css.verdictNeutral ?? '';
  if (v === 'tight' || v === 'deficit') return css.verdictWarn ?? '';
  return css.verdictMuted ?? '';
}

function verdictLabel(v: string): string {
  switch (v) {
    case 'comfortable':
      return 'Comfortable';
    case 'surplus':
      return 'Surplus';
    case 'balanced':
      return 'Balanced';
    case 'tight':
      return 'Tight';
    case 'deficit':
      return 'Deficit';
    case 'absent':
      return 'Absent';
    default:
      return 'No data';
  }
}

export default function HospitalityEducationEnergyCard({ project }: Props): React.ReactElement {
  const allStructures = useStructureStore((st) => st.structures);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const siteData = useSiteData(project.id);

  const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
  const peakSunHours =
    climate?.peak_sun_hours ??
    (typeof climate?.annual_solar_radiation_kwh_m2 === 'number'
      ? climate.annual_solar_radiation_kwh_m2 / 365
      : DEFAULT_PEAK_SUN_HOURS);

  const { hospitality, education, energy } = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const h = buildHospitalityFacts(structures);
    const e = buildEducationFacts(structures);
    const en = buildEnergyFacts(utilities, h.beds, peakSunHours);
    return { hospitality: h, education: e, energy: en };
  }, [allStructures, allUtilities, project.id, peakSunHours]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Hospitality, education {'\u00B7'} energy feasibility</h3>
          <p className={css.cardHint}>
            Three programmatic facets the rest of the decision stack does not surface in one place:
            overnight capacity vs. sanitation, teaching seat counts indoor vs. flex, and solar headroom
            vs. household-load estimates. Heuristics {'\u2014'} not engineered specs.
          </p>
        </div>
        <span className={css.modeBadge}>§21 {'\u00B7'} Programmatic fit</span>
      </header>

      {/* ── Hospitality ─────────────────────────────────────────── */}
      <div className={css.facet}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Hospitality</span>
          <span className={`${css.verdict} ${verdictClass(hospitality.verdict)}`}>
            {verdictLabel(hospitality.verdict)}
          </span>
        </div>
        <div className={css.statGrid}>
          <div className={css.stat}>
            <div className={css.statLabel}>Beds</div>
            <div className={css.statValue}>{hospitality.beds}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Bathhouses</div>
            <div className={css.statValue}>{hospitality.bathhouses}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Bath ratio</div>
            <div className={css.statValue}>
              {Number.isFinite(hospitality.bathRatio) && hospitality.bathhouses > 0
                ? `1:${hospitality.bathRatio.toFixed(1)}`
                : '\u2014'}
            </div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Gather seats</div>
            <div className={css.statValue}>{hospitality.pavilionGatherSeats}</div>
          </div>
        </div>
        <p className={css.facetNote}>{hospitality.verdictNote}</p>
      </div>

      {/* ── Education ───────────────────────────────────────────── */}
      <div className={css.facet}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Education</span>
          <span className={`${css.verdict} ${verdictClass(education.verdict)}`}>
            {verdictLabel(education.verdict)}
          </span>
        </div>
        <div className={css.statGrid}>
          <div className={css.stat}>
            <div className={css.statLabel}>Classroom seats</div>
            <div className={css.statValue}>{education.classroomSeats}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Pavilion seats</div>
            <div className={css.statValue}>{education.pavilionSeats}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Prayer flex</div>
            <div className={css.statValue}>{education.prayerSeats}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Total</div>
            <div className={css.statValue}>{education.totalSeats}</div>
          </div>
        </div>
        <p className={css.facetNote}>{education.verdictNote}</p>
      </div>

      {/* ── Energy ──────────────────────────────────────────────── */}
      <div className={css.facet}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Energy</span>
          <span className={`${css.verdict} ${verdictClass(energy.verdict)}`}>
            {verdictLabel(energy.verdict)}
          </span>
        </div>
        <div className={css.statGrid}>
          <div className={css.stat}>
            <div className={css.statLabel}>Solar (kW)</div>
            <div className={css.statValue}>{energy.solarKw.toFixed(0)}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Gen est. (kWh/day)</div>
            <div className={css.statValue}>{energy.estimatedGenKwhPerDay.toFixed(0)}</div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Demand (kWh/day)</div>
            <div className={css.statValue}>
              {Math.max(energy.declaredDemandKwhPerDay, energy.inferredDemandKwhPerDay).toFixed(0)}
            </div>
          </div>
          <div className={css.stat}>
            <div className={css.statLabel}>Backup gens</div>
            <div className={css.statValue}>{energy.generators}</div>
          </div>
        </div>
        <p className={css.facetNote}>
          {energy.verdictNote}
          {energy.declaredDemandKwhPerDay === 0 && energy.beds > 0 ? (
            <>
              {' '}
              <span className={css.muted}>
                ({energy.beds} bed{energy.beds === 1 ? '' : 's'} {'\u00D7'} 6 kWh inferred {'\u2014'} declare per-utility loads to refine.)
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className={css.footnote}>
        Heuristics: {SOLAR_KW_PER_PLACEMENT} kW per placed solar array {'\u00B7'} {peakSunHours.toFixed(1)} peak sun
        hours/day {'\u00B7'} {GENERATOR_KWH_PER_DAY} kWh/day per backup generator {'\u00B7'} 1 bathhouse per
        {' '}{BATH_RATIO_TARGET} beds {'\u00B7'} 1.5 m{'\u00B2'}/seat indoor, 2.5 m{'\u00B2'} outdoor.
      </div>
    </section>
  );
}
