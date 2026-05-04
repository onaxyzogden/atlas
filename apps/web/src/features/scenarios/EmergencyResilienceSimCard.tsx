/**
 * §16 EmergencyResilienceSimCard — fire / emergency, infrastructure
 * failure, and water shortage scenario simulator.
 *
 * Three independent resilience checks against the project's drawn
 * zones, paths, and utilities. Headcounts use the same density family
 * as §5 / §8 / §16 visitor-overflow card so peak-occupancy figures
 * stay coherent across cards.
 *
 *   1. Fire / wildfire evacuation — peak occupancy (retreat + guest
 *      + event utilisation) vs. egress capacity drawn from main road
 *      and emergency-access path metres. Reports evacuation minutes
 *      against a 15-minute target.
 *
 *   2. Water shortage / drought — peak daily demand (residential
 *      + livestock + irrigation placeholder) vs. on-site storage
 *      summed across rain-catchment and water-tank utilities. Reports
 *      days of supply against a 7-day target.
 *
 *   3. Infrastructure failure cascade — for water source, power
 *      source, and wastewater handling, counts independent placed
 *      utilities. Single-source = tight, no source = overflow.
 *
 * Pure derivation — reads zoneStore + pathStore + utilityStore +
 * livestockStore. No map writes, no shared-package math.
 *
 * Closes manifest §16 `fire-emergency-infrastructure-failure-water-
 * shortage` (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useZoneStore,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import {
  usePathStore,
  type DesignPath,
  type PathType,
} from '../../store/pathStore.js';
import {
  useUtilityStore,
  type Utility,
  type UtilityType,
} from '../../store/utilityStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './EmergencyResilienceSimCard.module.css';

interface Props {
  project: LocalProject;
}

type Tone = 'ok' | 'tight' | 'overflow' | 'na';

// ── Density family — mirrors VisitorEventOverflowSimCard so headcounts agree.
interface ProgramSpec {
  categories: ZoneCategory[];
  keyword: RegExp;
  density: number; // people / m²
}

const PEOPLE_PROGRAMS = {
  guest: {
    categories: ['access', 'commons'] as ZoneCategory[],
    keyword: /\b(guest|visitor|reception|orient|welcome|arrival)\b/i,
    density: 0.05,
  },
  retreat: {
    categories: ['retreat', 'habitation'] as ZoneCategory[],
    keyword: /\b(retreat|cabin|guesthouse|lodging|stay|sleep|dorm)\b/i,
    density: 0.04,
  },
  education: {
    categories: ['education'] as ZoneCategory[],
    keyword: /\b(class|teach|workshop|learn|demo|interpret|school|course)\b/i,
    density: 0.2,
  },
  event: {
    categories: ['commons', 'spiritual'] as ZoneCategory[],
    keyword: /\b(event|gather|ceremony|meal|feast|celebration|wedding|festival|stage)\b/i,
    density: 0.5,
  },
} as const satisfies Record<string, ProgramSpec>;

type PeopleProgramKind = keyof typeof PEOPLE_PROGRAMS;
const PEOPLE_KINDS: PeopleProgramKind[] = ['guest', 'retreat', 'education', 'event'];

function classifyZone(zone: LandZone, spec: ProgramSpec): boolean {
  if (spec.categories.includes(zone.category)) return true;
  const haystack = [
    zone.name ?? '',
    zone.primaryUse ?? '',
    zone.secondaryUse ?? '',
    zone.notes ?? '',
  ].join(' ');
  return spec.keyword.test(haystack);
}

interface PeopleRollup {
  /** Capacity at full utilisation. */
  guest: number;
  retreat: number;
  education: number;
  event: number;
  /** Peak emergency occupancy = guest + retreat + 0.6×event (event rare overlap). */
  peak: number;
}

function buildPeopleRollup(zones: LandZone[]): PeopleRollup {
  const cap = (kind: PeopleProgramKind) => {
    const spec = PEOPLE_PROGRAMS[kind];
    const matched = zones.filter((z) => classifyZone(z, spec));
    const area = matched.reduce((s, z) => s + (z.areaM2 || 0), 0);
    return area * spec.density;
  };
  const guest = cap('guest');
  const retreat = cap('retreat');
  const education = cap('education');
  const event = cap('event');
  const peak = Math.round(guest + retreat + Math.max(education, event * 0.6));
  return {
    guest: Math.round(guest),
    retreat: Math.round(retreat),
    education: Math.round(education),
    event: Math.round(event),
    peak,
  };
}

// ── Path egress capacity.
interface EgressRollup {
  mainRoadM: number;
  emergencyAccessM: number;
  /** People per minute the egress network can clear, at one person every
   *  2 m of main road and one person every 1 m of dedicated emergency
   *  access (single-file egress, generous spacing). */
  egressPpm: number;
}

function buildEgressRollup(paths: DesignPath[]): EgressRollup {
  const sumByType = (types: PathType[]) =>
    paths
      .filter((p) => types.includes(p.type))
      .reduce((s, p) => s + (p.lengthM || 0), 0);
  const mainRoadM = sumByType(['main_road']);
  const emergencyAccessM = sumByType(['emergency_access']);
  const egressPpm = mainRoadM / 2 + emergencyAccessM / 1;
  return { mainRoadM, emergencyAccessM, egressPpm };
}

// ── Utility rollup.
interface UtilRollup {
  waterStorageL: number;
  waterStorageSources: number; // count of placed rain catchment + water tank
  waterPumpCount: number;
  rainCatchmentCount: number;
  solarCount: number;
  batteryCount: number;
  generatorCount: number;
  septicCount: number;
  greywaterCount: number;
}

function buildUtilRollup(utilities: Utility[]): UtilRollup {
  const countOf = (type: UtilityType) => utilities.filter((u) => u.type === type).length;
  const storageGal = utilities
    .filter((u) => u.type === 'water_tank' || u.type === 'rain_catchment')
    .reduce((s, u) => s + (u.capacityGal || 0), 0);
  return {
    waterStorageL: storageGal * 3.785,
    waterStorageSources:
      countOf('water_tank') + countOf('rain_catchment'),
    waterPumpCount: countOf('well_pump'),
    rainCatchmentCount: countOf('rain_catchment'),
    solarCount: countOf('solar_panel'),
    batteryCount: countOf('battery_room'),
    generatorCount: countOf('generator'),
    septicCount: countOf('septic'),
    greywaterCount: countOf('greywater'),
  };
}

// ── Tone helpers.
function toneFromMinutes(min: number): Tone {
  if (!Number.isFinite(min)) return 'overflow';
  if (min <= 15) return 'ok';
  if (min <= 30) return 'tight';
  return 'overflow';
}
function toneFromDays(days: number): Tone {
  if (!Number.isFinite(days)) return 'overflow';
  if (days >= 7) return 'ok';
  if (days >= 3) return 'tight';
  return 'overflow';
}
function toneFromSourceCount(n: number): Tone {
  if (n >= 2) return 'ok';
  if (n === 1) return 'tight';
  return 'overflow';
}
function worseTone(a: Tone, b: Tone): Tone {
  const order = { na: -1, ok: 0, tight: 1, overflow: 2 } as const;
  return order[a] >= order[b] ? a : b;
}

// ── Scenario computation.
interface ScenarioResult {
  id: 'fire' | 'water' | 'cascade';
  label: string;
  blurb: string;
  tone: Tone;
  /** 4 stats per scenario (varies by scenario). */
  stats: Array<{ value: string | number; label: string; tone?: Tone }>;
  /** Bullet-style sub-rows. */
  rows: Array<{ label: string; meta: string; tone: Tone }>;
}

const FIRE_TARGET_MIN = 15;
const WATER_DEMAND_PER_PERSON_LPD = 200;
const WATER_DEMAND_PER_LIVESTOCK_LPD = 30;
const WATER_TARGET_DAYS = 7;

function runFireScenario(people: PeopleRollup, egress: EgressRollup): ScenarioResult {
  const peakPeople = people.peak;
  const egressPpm = egress.egressPpm;
  let evacMin = 0;
  let mainTone: Tone;
  if (peakPeople <= 0) {
    evacMin = 0;
    mainTone = 'na';
  } else if (egressPpm <= 0) {
    evacMin = Number.POSITIVE_INFINITY;
    mainTone = 'overflow';
  } else {
    evacMin = peakPeople / egressPpm;
    mainTone = toneFromMinutes(evacMin);
  }
  const hasEmergencyRoute = egress.emergencyAccessM > 0;
  const redundancyTone: Tone = hasEmergencyRoute ? 'ok' : peakPeople > 0 ? 'tight' : 'na';

  const stats: ScenarioResult['stats'] = [
    { value: peakPeople, label: 'peak people' },
    {
      value: Number.isFinite(evacMin) ? `${Math.round(evacMin)} min` : '—',
      label: 'evac time',
      tone: mainTone,
    },
    {
      value: Math.round(egressPpm),
      label: 'egress ppl/min',
      tone: egressPpm > 0 ? 'ok' : 'overflow',
    },
    {
      value: hasEmergencyRoute ? 'yes' : 'no',
      label: 'emergency route',
      tone: redundancyTone,
    },
  ];

  const rows: ScenarioResult['rows'] = [];
  rows.push({
    label: 'Main road egress',
    meta: `${Math.round(egress.mainRoadM)} m drawn`,
    tone: egress.mainRoadM > 0 ? 'ok' : 'overflow',
  });
  rows.push({
    label: 'Dedicated emergency-access route',
    meta: hasEmergencyRoute
      ? `${Math.round(egress.emergencyAccessM)} m drawn`
      : 'none drawn — single failure point',
    tone: redundancyTone,
  });
  rows.push({
    label: `Evacuation target (${FIRE_TARGET_MIN} min)`,
    meta: Number.isFinite(evacMin)
      ? `${Math.round(evacMin)} min at peak occupancy`
      : 'cannot compute — no egress drawn',
    tone: mainTone,
  });

  return {
    id: 'fire',
    label: 'Fire / wildfire evacuation',
    blurb:
      'Single-event egress: peak retreat + guest occupancy clearing the site through main and emergency access.',
    tone: worseTone(mainTone, redundancyTone),
    stats,
    rows,
  };
}

function runWaterScenario(
  people: PeopleRollup,
  util: UtilRollup,
  livestockHeads: number,
): ScenarioResult {
  const peopleDemand = people.peak * WATER_DEMAND_PER_PERSON_LPD;
  const livestockDemand = livestockHeads * WATER_DEMAND_PER_LIVESTOCK_LPD;
  const dailyDemandL = peopleDemand + livestockDemand;
  const storageL = util.waterStorageL;

  let daysOfSupply = 0;
  let supplyTone: Tone;
  if (dailyDemandL <= 0) {
    daysOfSupply = 0;
    supplyTone = 'na';
  } else if (storageL <= 0) {
    daysOfSupply = 0;
    supplyTone = 'overflow';
  } else {
    daysOfSupply = storageL / dailyDemandL;
    supplyTone = toneFromDays(daysOfSupply);
  }

  const sourceTone = toneFromSourceCount(util.waterStorageSources);
  const passiveTone: Tone =
    util.rainCatchmentCount > 0
      ? 'ok'
      : util.waterPumpCount > 0
      ? 'tight'
      : 'overflow';

  const stats: ScenarioResult['stats'] = [
    {
      value: `${Math.round(dailyDemandL).toLocaleString('en-US')} L`,
      label: 'daily demand',
    },
    {
      value: `${Math.round(storageL).toLocaleString('en-US')} L`,
      label: 'storage placed',
      tone: storageL > 0 ? 'ok' : 'overflow',
    },
    {
      value: Number.isFinite(daysOfSupply) ? `${daysOfSupply.toFixed(1)} d` : '—',
      label: 'days of supply',
      tone: supplyTone,
    },
    {
      value: util.waterStorageSources,
      label: 'storage sources',
      tone: sourceTone,
    },
  ];

  const rows: ScenarioResult['rows'] = [];
  rows.push({
    label: 'On-site storage capacity',
    meta:
      storageL > 0
        ? `${Math.round(storageL).toLocaleString('en-US')} L across ${util.waterStorageSources} placed source${util.waterStorageSources === 1 ? '' : 's'}`
        : 'no water tank or rain catchment placed',
    tone: storageL > 0 ? 'ok' : 'overflow',
  });
  rows.push({
    label: 'Passive resilience (rain catchment)',
    meta:
      util.rainCatchmentCount > 0
        ? `${util.rainCatchmentCount} placed — refill independent of grid`
        : 'no rain catchment — well loss kills the supply chain',
    tone: passiveTone,
  });
  rows.push({
    label: `Drought target (${WATER_TARGET_DAYS}-day buffer at peak demand)`,
    meta: Number.isFinite(daysOfSupply)
      ? `${daysOfSupply.toFixed(1)} days at ${Math.round(dailyDemandL).toLocaleString('en-US')} L/day`
      : 'cannot compute — zero demand or zero storage',
    tone: supplyTone,
  });

  return {
    id: 'water',
    label: 'Water shortage / drought',
    blurb:
      'Storage-buffer test: people + livestock daily demand against placed water-tank and rain-catchment capacity.',
    tone: worseTone(supplyTone, worseTone(sourceTone, passiveTone)),
    stats,
    rows,
  };
}

function runCascadeScenario(util: UtilRollup): ScenarioResult {
  const waterSources = util.waterPumpCount + util.rainCatchmentCount + (util.waterStorageL > 0 ? 1 : 0);
  const powerSources = util.solarCount + util.batteryCount + util.generatorCount;
  const wasteSources = util.septicCount + util.greywaterCount;

  const waterTone = toneFromSourceCount(waterSources);
  const powerTone = toneFromSourceCount(powerSources);
  const wasteTone = toneFromSourceCount(wasteSources);

  const failureCount = [waterTone, powerTone, wasteTone].filter((t) => t === 'overflow').length;
  const tightCount = [waterTone, powerTone, wasteTone].filter((t) => t === 'tight').length;

  const stats: ScenarioResult['stats'] = [
    { value: waterSources, label: 'water sources', tone: waterTone },
    { value: powerSources, label: 'power sources', tone: powerTone },
    { value: wasteSources, label: 'waste sources', tone: wasteTone },
    {
      value: failureCount > 0 ? `${failureCount} fail` : tightCount > 0 ? `${tightCount} thin` : 'all 3',
      label: 'redundancy',
      tone: failureCount > 0 ? 'overflow' : tightCount > 0 ? 'tight' : 'ok',
    },
  ];

  const rows: ScenarioResult['rows'] = [
    {
      label: 'Water (well + rain + storage)',
      meta:
        waterSources === 0
          ? 'no water source — site cannot operate'
          : waterSources === 1
          ? 'single source — well or storage failure stops the project'
          : `${waterSources} independent sources — failure tolerated`,
      tone: waterTone,
    },
    {
      label: 'Power (solar + battery + generator)',
      meta:
        powerSources === 0
          ? 'no power source placed — programs cannot run after dark'
          : powerSources === 1
          ? 'single source — outage stops everything dependent on power'
          : `${powerSources} independent sources — outage tolerated`,
      tone: powerTone,
    },
    {
      label: 'Wastewater (septic + greywater)',
      meta:
        wasteSources === 0
          ? 'no wastewater handling — habitation cannot function legally'
          : wasteSources === 1
          ? 'single system — backup or failure halts habitation'
          : `${wasteSources} systems — fault-tolerant`,
      tone: wasteTone,
    },
  ];

  const tone = worseTone(waterTone, worseTone(powerTone, wasteTone));

  return {
    id: 'cascade',
    label: 'Infrastructure failure cascade',
    blurb:
      'For water, power, and wastewater, count of independent placed utilities. Single-source = a single point of failure.',
    tone,
    stats,
    rows,
  };
}

const TONE_LABEL: Record<Tone, string> = {
  ok: 'OK',
  tight: 'TIGHT',
  overflow: 'CRITICAL',
  na: 'N/A',
};

export default function EmergencyResilienceSimCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const people = useMemo(() => {
    const projectZones = allZones.filter((z) => z.projectId === project.id);
    return buildPeopleRollup(projectZones);
  }, [allZones, project.id]);

  const egress = useMemo(() => {
    const projectPaths = allPaths.filter((p) => p.projectId === project.id);
    return buildEgressRollup(projectPaths);
  }, [allPaths, project.id]);

  const util = useMemo(() => {
    const projectUtilities = allUtilities.filter((u) => u.projectId === project.id);
    return buildUtilRollup(projectUtilities);
  }, [allUtilities, project.id]);

  const livestockHeads = useMemo(() => {
    return allPaddocks
      .filter((p) => p.projectId === project.id)
      .reduce((s, p) => {
        const hectares = (p.areaM2 || 0) / 10_000;
        const density = p.stockingDensity ?? 0;
        return s + hectares * density;
      }, 0);
  }, [allPaddocks, project.id]);

  const fire = useMemo(() => runFireScenario(people, egress), [people, egress]);
  const water = useMemo(
    () => runWaterScenario(people, util, livestockHeads),
    [people, util, livestockHeads],
  );
  const cascade = useMemo(() => runCascadeScenario(util), [util]);

  const results = useMemo(() => [fire, water, cascade], [fire, water, cascade]);

  const verdict = useMemo(() => {
    const peakLow = people.peak === 0 && util.waterStorageSources === 0 && egress.egressPpm === 0;
    if (peakLow) {
      return { tone: 'unknown', label: 'Place zones, paths, and utilities to simulate' } as const;
    }
    const worst = results.reduce<Tone>((acc, r) => worseTone(acc, r.tone), 'na');
    if (worst === 'overflow') {
      return { tone: 'block', label: 'One or more emergency scenarios fail' } as const;
    }
    if (worst === 'tight') {
      return { tone: 'work', label: 'Resilience thin — single point of failure present' } as const;
    }
    if (worst === 'ok') {
      return { tone: 'done', label: 'All three emergency scenarios within target' } as const;
    }
    return { tone: 'unknown', label: 'Insufficient placement to evaluate' } as const;
  }, [people, util, egress, results]);

  const headline = useMemo(() => {
    const failing = results.filter((r) => r.tone === 'overflow').length;
    const thin = results.filter((r) => r.tone === 'tight').length;
    const passing = results.filter((r) => r.tone === 'ok').length;
    return { failing, thin, passing };
  }, [results]);

  return (
    <section className={css.card} aria-label="Fire / emergency / infrastructure failure / water shortage simulation">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Fire {'·'} Water {'·'} Infrastructure Resilience
          </h3>
          <p className={css.cardHint}>
            Three resilience checks against the placement state. Headcount uses the
            same density family as the other §16 sims so peak-occupancy figures stay
            coherent. Targets: ≤15 min evacuation, ≥7 days water buffer, ≥2 independent
            utility sources per critical system.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={people.peak} label="peak people" />
        <Headline value={headline.passing} label="ok" />
        <Headline value={headline.thin} label="thin" />
        <Headline value={headline.failing} label="critical" />
      </div>

      <div className={css.scenarioList}>
        {results.map((r) => (
          <article key={r.id} className={`${css.scenario} ${css[`tone_${r.tone}`]}`}>
            <header className={css.scenarioHead}>
              <div>
                <div className={css.scenarioLabel}>{r.label}</div>
                <div className={css.scenarioBlurb}>{r.blurb}</div>
              </div>
              <div className={`${css.tonePill} ${css[`tonePill_${r.tone}`]}`}>
                {TONE_LABEL[r.tone]}
              </div>
            </header>

            <div className={css.scenarioStats}>
              {r.stats.map((stat) => (
                <ScenarioStat
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  tone={stat.tone}
                />
              ))}
            </div>

            <ul className={css.rowList}>
              {r.rows.map((row) => (
                <li key={row.label} className={`${css.row} ${css[`row_${row.tone}`]}`}>
                  <span className={css.rowLabel}>{row.label}</span>
                  <span className={css.rowMeta}>{row.meta}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className={css.footnote}>
        First-pass heuristics — they answer "is this clearly off?" rather than "exactly
        how long would evacuation take." A real wildfire-egress study, drought-buffer
        sizing exercise, and N+1 redundancy plan are the right next steps before the
        site takes on overnight occupancy.
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
  tone?: Tone;
}) {
  return (
    <div className={`${css.scenarioStat} ${tone ? css[`stat_${tone}`] : ''}`}>
      <div className={css.scenarioStatValue}>{value}</div>
      <div className={css.scenarioStatLabel}>{label}</div>
    </div>
  );
}
