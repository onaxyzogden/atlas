/**
 * §16 VisitorEventOverflowSimCard — visitor / event / parking
 * overflow scenario simulator.
 *
 * Runs three load patterns against the project's program zones
 * (guest / retreat / education / event / parking) and the road
 * network (main + secondary roads), reports per-scenario headcount
 * and vehicle count, parking sufficiency, and a coarse access-road
 * strain index. The patterns:
 *
 *   1. Typical Sunday open-house — partial guest + education,
 *      zero overnight or event load.
 *   2. Seasonal event — full guest + full event surge, 0 retreat,
 *      0 education.
 *   3. Peak retreat — full retreat + full guest + most education,
 *      mild event presence.
 *
 * Capacities are area-density heuristics, not engineered seat
 * counts — same density family used in §5 GuestRetreatEducation
 * EventCard so the two cards stay coherent. Parking demand uses a
 * per-scenario carpool ratio (Sunday families carpool less, events
 * carpool more, retreats arrive staggered so per-person vehicle
 * load is lowest).
 *
 * Pure derivation — reads zoneStore + pathStore, no map writes,
 * no shared-package math.
 *
 * Closes manifest §16 `visitor-event-parking-overflow-sim` (P3)
 * planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useZoneStore,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import css from './VisitorEventOverflowSimCard.module.css';

interface Props {
  project: LocalProject;
}

type ProgramKind = 'guest' | 'retreat' | 'education' | 'event' | 'parking';

interface ProgramSpec {
  label: string;
  /** Categories that count as this program. */
  categories: ZoneCategory[];
  /** Keyword fallback regex on name + uses + notes. */
  keyword: RegExp;
  /** Density: people-or-vehicles per m². Parking is vehicles/m². */
  density: number;
  unit: 'people' | 'vehicles';
}

const PROGRAMS: Record<ProgramKind, ProgramSpec> = {
  guest: {
    label: 'Guest',
    categories: ['access', 'commons'],
    keyword: /\b(guest|visitor|reception|orient|welcome|arrival)\b/i,
    density: 0.05,
    unit: 'people',
  },
  retreat: {
    label: 'Retreat',
    categories: ['retreat', 'habitation'],
    keyword: /\b(retreat|cabin|guesthouse|lodging|stay|sleep|dorm)\b/i,
    density: 0.04,
    unit: 'people',
  },
  education: {
    label: 'Education',
    categories: ['education'],
    keyword: /\b(class|teach|workshop|learn|demo|interpret|school|course)\b/i,
    density: 0.2,
    unit: 'people',
  },
  event: {
    label: 'Event',
    categories: ['commons', 'spiritual'],
    keyword: /\b(event|gather|ceremony|meal|feast|celebration|wedding|festival|stage)\b/i,
    density: 0.5,
    unit: 'people',
  },
  parking: {
    label: 'Parking',
    categories: ['infrastructure', 'access'],
    keyword: /\b(park|lot|car|vehicle|trailer|drive|RV)\b/i,
    density: 0.04,
    unit: 'vehicles',
  },
};

const PROGRAM_KINDS: ProgramKind[] = ['guest', 'retreat', 'education', 'event', 'parking'];

interface ScenarioSpec {
  id: 'sunday' | 'event' | 'retreat';
  label: string;
  blurb: string;
  /** Utilisation of each program's total capacity (0..1). */
  util: Record<ProgramKind, number>;
  /** Average people per arriving vehicle. */
  carpoolRatio: number;
}

const SCENARIOS: ScenarioSpec[] = [
  {
    id: 'sunday',
    label: 'Typical Sunday open-house',
    blurb: 'Half-capacity guest tour with a small demo session. No overnight or event surge.',
    util: { guest: 0.6, retreat: 0, education: 0.5, event: 0, parking: 0 },
    carpoolRatio: 2.0,
  },
  {
    id: 'event',
    label: 'Seasonal event surge',
    blurb: 'Single-day gathering with full event capacity and full guest circulation.',
    util: { guest: 1.0, retreat: 0, education: 0, event: 1.0, parking: 0 },
    carpoolRatio: 2.5,
  },
  {
    id: 'retreat',
    label: 'Peak retreat weekend',
    blurb: 'Retreat at full occupancy plus most education and a partial event.',
    util: { guest: 1.0, retreat: 1.0, education: 0.8, event: 0.3, parking: 0 },
    carpoolRatio: 3.0,
  },
];

interface ProgramRollup {
  kind: ProgramKind;
  zones: LandZone[];
  totalAreaM2: number;
  /** Total capacity at full utilisation (people for non-parking, vehicles for parking). */
  capacityFull: number;
}

interface PathRollup {
  mainRoadM: number;
  secondaryRoadM: number;
  serviceRoadM: number;
  totalAccessM: number;
}

interface ScenarioResult {
  spec: ScenarioSpec;
  perProgram: Array<{
    kind: ProgramKind;
    headcountOrVehicles: number;
    util: number;
  }>;
  totalPeople: number;
  vehiclesNeeded: number;
  parkingCapacity: number;
  parkingRatio: number; // demand / supply
  parkingTone: 'ok' | 'tight' | 'overflow' | 'na';
  /** vehicles per (mainRoadM / 5) — coarse strain index. */
  roadStrain: number;
  roadTone: 'ok' | 'tight' | 'overflow' | 'na';
  worstTone: 'ok' | 'tight' | 'overflow' | 'na';
}

function classifyZone(zone: LandZone, kind: ProgramKind): boolean {
  const spec = PROGRAMS[kind];
  if (spec.categories.includes(zone.category)) return true;
  const haystack = [
    zone.name ?? '',
    zone.primaryUse ?? '',
    zone.secondaryUse ?? '',
    zone.notes ?? '',
  ].join(' ');
  return spec.keyword.test(haystack);
}

function buildProgramRollup(zones: LandZone[]): Record<ProgramKind, ProgramRollup> {
  const out = {} as Record<ProgramKind, ProgramRollup>;
  for (const kind of PROGRAM_KINDS) {
    const matched = zones.filter((z) => classifyZone(z, kind));
    const totalAreaM2 = matched.reduce((s, z) => s + (z.areaM2 || 0), 0);
    const capacityFull = totalAreaM2 * PROGRAMS[kind].density;
    out[kind] = { kind, zones: matched, totalAreaM2, capacityFull };
  }
  return out;
}

function buildPathRollup(paths: DesignPath[]): PathRollup {
  const sumByType = (types: PathType[]) =>
    paths
      .filter((p) => types.includes(p.type))
      .reduce((s, p) => s + (p.lengthM || 0), 0);
  const mainRoadM = sumByType(['main_road']);
  const secondaryRoadM = sumByType(['secondary_road']);
  const serviceRoadM = sumByType(['service_road', 'emergency_access', 'farm_lane']);
  const totalAccessM = mainRoadM + secondaryRoadM + serviceRoadM;
  return { mainRoadM, secondaryRoadM, serviceRoadM, totalAccessM };
}

function toneFromRatio(ratio: number): 'ok' | 'tight' | 'overflow' {
  if (ratio <= 1.0) return 'ok';
  if (ratio <= 1.3) return 'tight';
  return 'overflow';
}

function worseTone(
  a: 'ok' | 'tight' | 'overflow' | 'na',
  b: 'ok' | 'tight' | 'overflow' | 'na',
): 'ok' | 'tight' | 'overflow' | 'na' {
  const order = { na: -1, ok: 0, tight: 1, overflow: 2 } as const;
  return order[a] >= order[b] ? a : b;
}

function runScenario(
  spec: ScenarioSpec,
  programs: Record<ProgramKind, ProgramRollup>,
  paths: PathRollup,
): ScenarioResult {
  const perProgram = PROGRAM_KINDS.map((kind) => {
    const util = spec.util[kind];
    const headcountOrVehicles = Math.round(programs[kind].capacityFull * util);
    return { kind, headcountOrVehicles, util };
  });
  const totalPeople = perProgram
    .filter((p) => PROGRAMS[p.kind].unit === 'people')
    .reduce((s, p) => s + p.headcountOrVehicles, 0);
  const vehiclesNeeded = Math.ceil(totalPeople / Math.max(1, spec.carpoolRatio));
  const parkingCapacity = Math.round(programs.parking.capacityFull);

  let parkingRatio = 0;
  let parkingTone: ScenarioResult['parkingTone'];
  if (parkingCapacity <= 0) {
    parkingRatio = vehiclesNeeded > 0 ? Number.POSITIVE_INFINITY : 0;
    parkingTone = vehiclesNeeded > 0 ? 'overflow' : 'na';
  } else {
    parkingRatio = vehiclesNeeded / parkingCapacity;
    parkingTone = toneFromRatio(parkingRatio);
  }

  // Road strain: 1 main-road metre per 5 vehicles is a comfortable
  // queue-and-pass headroom. Below that, two-way traffic gets sticky.
  const safeRoadCapacity = paths.mainRoadM > 0 ? paths.mainRoadM / 5 : 0;
  let roadStrain = 0;
  let roadTone: ScenarioResult['roadTone'];
  if (safeRoadCapacity <= 0) {
    roadStrain = vehiclesNeeded > 0 ? Number.POSITIVE_INFINITY : 0;
    roadTone = vehiclesNeeded > 0 ? 'overflow' : 'na';
  } else {
    roadStrain = vehiclesNeeded / safeRoadCapacity;
    roadTone = toneFromRatio(roadStrain);
  }

  const worstTone = worseTone(parkingTone, roadTone);

  return {
    spec,
    perProgram,
    totalPeople,
    vehiclesNeeded,
    parkingCapacity,
    parkingRatio,
    parkingTone,
    roadStrain,
    roadTone,
    worstTone,
  };
}

function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return 'no capacity';
  return `${Math.round(ratio * 100)}%`;
}

const TONE_LABEL: Record<'ok' | 'tight' | 'overflow' | 'na', string> = {
  ok: 'OK',
  tight: 'TIGHT',
  overflow: 'OVERFLOW',
  na: 'N/A',
};

export default function VisitorEventOverflowSimCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);

  const programs = useMemo(() => {
    const projectZones = allZones.filter((z) => z.projectId === project.id);
    return buildProgramRollup(projectZones);
  }, [allZones, project.id]);

  const paths = useMemo(() => {
    const projectPaths = allPaths.filter((p) => p.projectId === project.id);
    return buildPathRollup(projectPaths);
  }, [allPaths, project.id]);

  const results = useMemo(
    () => SCENARIOS.map((spec) => runScenario(spec, programs, paths)),
    [programs, paths],
  );

  const totals = useMemo(() => {
    const programZones = PROGRAM_KINDS.reduce(
      (s, k) => s + (programs[k].zones.length > 0 ? 1 : 0),
      0,
    );
    const peakPeople = Math.max(0, ...results.map((r) => r.totalPeople));
    const peakVehicles = Math.max(0, ...results.map((r) => r.vehiclesNeeded));
    const peakParkingRatio = Math.max(
      0,
      ...results
        .map((r) => r.parkingRatio)
        .filter((n) => Number.isFinite(n)),
    );
    return { programZones, peakPeople, peakVehicles, peakParkingRatio };
  }, [programs, results]);

  const verdict = useMemo(() => {
    if (totals.peakPeople === 0 && totals.peakVehicles === 0) {
      return { tone: 'unknown', label: 'No program zones to simulate yet' } as const;
    }
    const worst = results.reduce<'ok' | 'tight' | 'overflow' | 'na'>(
      (acc, r) => worseTone(acc, r.worstTone),
      'na',
    );
    if (worst === 'overflow') {
      return { tone: 'block', label: 'Peak load exceeds parking or access capacity' } as const;
    }
    if (worst === 'tight') {
      return { tone: 'work', label: 'Peak load runs tight — buffer recommended' } as const;
    }
    if (worst === 'ok') {
      return { tone: 'done', label: 'All three scenarios fit comfortably' } as const;
    }
    return { tone: 'unknown', label: 'Insufficient infrastructure to evaluate' } as const;
  }, [results, totals]);

  const caveats = useMemo(() => {
    const out: string[] = [];
    if (programs.parking.zones.length === 0) {
      out.push('No parking zone — scenarios assume zero on-site capacity, every vehicle becomes overflow.');
    }
    if (paths.mainRoadM <= 0) {
      out.push('No main road traced — access strain cannot be estimated; scenarios assume zero capacity.');
    }
    const empties = PROGRAM_KINDS.filter((k) => programs[k].zones.length === 0 && k !== 'parking');
    if (empties.length > 0) {
      const list = empties.map((k) => PROGRAMS[k].label.toLowerCase()).join(' · ');
      out.push(`Missing program zones: ${list} — those rows simulate 0 capacity.`);
    }
    return out;
  }, [programs, paths]);

  return (
    <section className={css.card} aria-label="Visitor / event / parking overflow simulation">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Visitor {'·'} Event {'·'} Parking Overflow Simulation</h3>
          <p className={css.cardHint}>
            Three load patterns run against the program zones and the
            road network. Capacities are area-density heuristics, not
            engineered seat counts — same density family used in the
            §8 program-coverage rollup. Parking demand applies a
            per-scenario carpool ratio. Access strain is a coarse
            "1 main-road metre per 5 vehicles" headroom test.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={totals.programZones} label="program zones" />
        <Headline value={totals.peakPeople} label="peak people" />
        <Headline value={totals.peakVehicles} label="peak vehicles" />
        <Headline value={`${Math.round(totals.peakParkingRatio * 100)}%`} label="peak parking load" />
      </div>

      <div className={css.scenarioList}>
        {results.map((r) => (
          <article key={r.spec.id} className={`${css.scenario} ${css[`tone_${r.worstTone}`]}`}>
            <header className={css.scenarioHead}>
              <div>
                <div className={css.scenarioLabel}>{r.spec.label}</div>
                <div className={css.scenarioBlurb}>{r.spec.blurb}</div>
              </div>
              <div className={`${css.tonePill} ${css[`tonePill_${r.worstTone}`]}`}>
                {TONE_LABEL[r.worstTone]}
              </div>
            </header>

            <div className={css.scenarioStats}>
              <ScenarioStat value={r.totalPeople} label="people" />
              <ScenarioStat value={r.vehiclesNeeded} label="vehicles" />
              <ScenarioStat
                value={`${r.vehiclesNeeded} / ${r.parkingCapacity}`}
                label="park demand / supply"
              />
              <ScenarioStat
                value={Number.isFinite(r.parkingRatio) ? formatRatio(r.parkingRatio) : '—'}
                label="parking load"
                tone={r.parkingTone}
              />
              <ScenarioStat
                value={Number.isFinite(r.roadStrain) ? formatRatio(r.roadStrain) : '—'}
                label="road strain"
                tone={r.roadTone}
              />
            </div>

            <ul className={css.programList}>
              {r.perProgram
                .filter((p) => p.headcountOrVehicles > 0 || p.util > 0)
                .map((p) => (
                  <li key={p.kind} className={css.programRow}>
                    <span className={css.programName}>{PROGRAMS[p.kind].label}</span>
                    <span className={css.programMeta}>
                      {Math.round(p.util * 100)}% util {'·'} {p.headcountOrVehicles}{' '}
                      {PROGRAMS[p.kind].unit}
                    </span>
                  </li>
                ))}
              {r.perProgram.every((p) => p.headcountOrVehicles === 0 && p.util === 0) && (
                <li className={css.programRowEmpty}>No program load in this scenario.</li>
              )}
            </ul>
          </article>
        ))}
      </div>

      {caveats.length > 0 && (
        <div className={css.caveats}>
          <h4 className={css.sectionTitle}>Caveats</h4>
          <ul className={css.caveatList}>
            {caveats.map((c) => (
              <li key={c} className={css.caveatRow}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={css.footnote}>
        Densities mirror the §8 program-coverage card so headcounts stay
        coherent across cards. Vehicles, parking, and road strain are first-pass
        heuristics — they answer "is this clearly off?" rather than "exactly
        how many cars". A traffic study is the right next step before a real
        event surge.
      </p>
    </section>
  );
}

function Headline({ value, label }: { value: number | string; label: string }) {
  return (
    <div className={css.headline}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}

function ScenarioStat({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone?: 'ok' | 'tight' | 'overflow' | 'na';
}) {
  return (
    <div className={`${css.scenarioStat} ${tone ? css[`stat_${tone}`] : ''}`}>
      <div className={css.scenarioStatValue}>{value}</div>
      <div className={css.scenarioStatLabel}>{label}</div>
    </div>
  );
}
