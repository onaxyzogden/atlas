/**
 * §17 PhasedBuildStrategyCard — phased rollouts for the four major
 * build threads a steward orchestrates: build (structures + access),
 * water (catchment, storage, distribution), grazing (paddock
 * subdivision + water + rotation), and orchard (perennial polygon
 * establishment). Each thread surfaces three phases — Year 1 / Years
 * 2-3 / Year 3+ — with concrete next-action lines, "depends on" and
 * "unlocks" pointers, and tone bands for current readiness.
 *
 * Pure deterministic copy keyed on entity composition + site signals
 * (slope, canopy, hydrologic group, wetland, flood zone). Same inputs
 * always produce the same plan. The "AI DRAFT" badge tracks the §17
 * spec language only.
 *
 * Closes manifest §17 `ai-phased-build-water-grazing-orchard-strategies`
 * (P3) planned -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './PhasedBuildStrategyCard.module.css';

interface Props {
  project: LocalProject;
}

interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}
interface SoilSummary {
  hydrologic_group?: string;
}
interface WetlandsSummary {
  wetland_pct?: number;
  flood_zone?: string;
}

type ThreadId = 'build' | 'water' | 'grazing' | 'orchard';
type Readiness = 'not_started' | 'in_progress' | 'mature';

interface PhaseLine {
  phase: 1 | 2 | 3;
  action: string;
  dependsOn?: string;
  unlocks?: string;
}

interface Thread {
  id: ThreadId;
  label: string;
  blurb: string;
  readiness: Readiness;
  readinessLine: string;
  phases: PhaseLine[];
}

const THREAD_ORDER: ThreadId[] = ['build', 'water', 'grazing', 'orchard'];

const PHASE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Year 1',
  2: 'Years 2\u20133',
  3: 'Year 3+',
};

const READINESS_LABEL: Record<Readiness, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  mature: 'Mature',
};

function parseNum(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function PhasedBuildStrategyCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const utilities = useUtilityStore((s) =>
    s.utilities.filter((u) => u.projectId === project.id),
  );
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const siteData = useSiteData(project.id);

  const [openId, setOpenId] = useState<ThreadId | null>(null);

  const threads = useMemo<Thread[]>(() => {
    const elevation = siteData
      ? getLayerSummary<ElevationSummary>(siteData, 'elevation')
      : null;
    const landcover = siteData
      ? getLayerSummary<LandCoverSummary>(siteData, 'landcover')
      : null;
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const wetlands = siteData
      ? getLayerSummary<WetlandsSummary>(siteData, 'wetlands')
      : null;
    const slopeDeg = elevation?.mean_slope_deg;
    const canopyPct = parseNum(landcover?.tree_canopy_pct);
    const hsg = soil?.hydrologic_group;
    const floodZone = wetlands?.flood_zone;
    const isHighFlood =
      typeof floodZone === 'string' &&
      ['A', 'AE', 'AH', 'AO', 'AR', 'V', 'VE'].includes(floodZone.toUpperCase());

    // ── BUILD ─────────────────────────────────────────────────────────
    const hasResidence = structures.some(
      (st) => String(st.type ?? '').toLowerCase() === 'residence',
    );
    const hasBarn = structures.some(
      (st) => String(st.type ?? '').toLowerCase() === 'barn',
    );
    const hasWorkshop = structures.some(
      (st) => String(st.type ?? '').toLowerCase() === 'workshop',
    );
    let buildReadiness: Readiness = 'not_started';
    let buildLine = 'No structures placed.';
    if (hasResidence && hasBarn) {
      buildReadiness = 'mature';
      buildLine = `${structures.length} structure${structures.length === 1 ? '' : 's'} including residence + barn.`;
    } else if (hasResidence || hasBarn) {
      buildReadiness = 'in_progress';
      buildLine = `${structures.length} structure${structures.length === 1 ? '' : 's'} placed; core anchor is partial.`;
    } else if (structures.length > 0) {
      buildReadiness = 'in_progress';
      buildLine = `${structures.length} structure${structures.length === 1 ? '' : 's'} placed; no residence or barn yet.`;
    }
    const buildPhases: PhaseLine[] = [];
    if (!hasResidence) {
      buildPhases.push({
        phase: 1,
        action: isHighFlood
          ? 'Place a residence on high ground outside the FEMA flood polygon and route the access drive.'
          : 'Place a residence on the flattest contour shoulder with road access.',
        dependsOn: 'parcel boundary, septic perc test, well or municipal connection',
        unlocks: 'daily presence on the land — the highest-leverage management input',
      });
    }
    if (!hasBarn) {
      buildPhases.push({
        phase: 1,
        action: 'Site a barn or operations shed near the parcel\u2019s working core, downhill of any pond.',
        dependsOn: 'residence siting (so the chore loop is short)',
        unlocks: 'centralized hay, tools, and livestock shelter',
      });
    }
    if (!hasWorkshop) {
      buildPhases.push({
        phase: 2,
        action: 'Add a workshop with 240V capacity for repair velocity once the operation is running.',
        dependsOn: 'electric service or solar array sizing',
        unlocks: 'on-site repair instead of off-site trips',
      });
    }
    buildPhases.push({
      phase: 3,
      action: 'Add educational or hospitality structures (pavilion, retreat, classroom) once daily ops are stable.',
      dependsOn: 'mature water + access systems',
      unlocks: 'visitor and revenue programs',
    });

    // ── WATER ─────────────────────────────────────────────────────────
    const hasTank = utilities.some(
      (u) => String(u.type ?? '').toLowerCase() === 'water_tank',
    );
    const hasWell = utilities.some(
      (u) => String(u.type ?? '').toLowerCase() === 'well',
    );
    const hasSeptic = utilities.some(
      (u) => String(u.type ?? '').toLowerCase() === 'septic',
    );
    let waterReadiness: Readiness = 'not_started';
    let waterLine = 'No water utilities placed.';
    if (hasTank && hasWell) {
      waterReadiness = 'mature';
      waterLine = 'Storage + supply both placed.';
    } else if (hasTank || hasWell) {
      waterReadiness = 'in_progress';
      waterLine = hasWell
        ? 'Well placed; storage tank still missing.'
        : 'Storage tank placed; supply (well or municipal) not confirmed.';
    }
    const waterPhases: PhaseLine[] = [];
    if (!hasWell) {
      waterPhases.push({
        phase: 1,
        action: 'Confirm water supply — well drilling location or municipal connection point.',
        dependsOn: 'neighbor well logs, USGS records, septic location (50+ ft separation)',
        unlocks: 'every downstream system (residence, livestock, irrigation)',
      });
    }
    if (!hasTank) {
      waterPhases.push({
        phase: 1,
        action: 'Place a storage tank uphill of primary use points for gravity feed.',
        dependsOn: 'roof catchment area or pump capacity',
        unlocks: 'drought buffer + fire suppression + pump-cycle smoothing',
      });
    }
    if (!hasSeptic) {
      waterPhases.push({
        phase: 1,
        action: hsg === 'D'
          ? 'Schedule a perc test — hydrologic group D may require an engineered drainfield.'
          : 'Site a septic system 100+ ft from any well, 50+ ft from streams.',
        dependsOn: 'soil perc test, residence siting',
        unlocks: 'permitted dwelling occupancy',
      });
    }
    waterPhases.push({
      phase: 2,
      action: 'Add catchment routing from roofs into the tank and overflow paths to a swale or pond.',
      dependsOn: 'tank placement + roof areas',
      unlocks: 'lower municipal/well draw, soil hydration during wet seasons',
    });
    waterPhases.push({
      phase: 3,
      action: 'Build a pond or swale network for landscape-scale water retention.',
      dependsOn: 'detailed contour survey, county pond permit',
      unlocks: 'wildfire defensibility, fire-pond, irrigation reserve',
    });

    // ── GRAZING ──────────────────────────────────────────────────────
    let grazingReadiness: Readiness = 'not_started';
    let grazingLine = 'No paddocks placed.';
    if (paddocks.length >= 4) {
      grazingReadiness = 'mature';
      grazingLine = `${paddocks.length} paddocks placed — rotation is structurally possible.`;
    } else if (paddocks.length > 0) {
      grazingReadiness = 'in_progress';
      grazingLine = `${paddocks.length} paddock${paddocks.length === 1 ? '' : 's'} placed; need 4+ cells for meaningful rotation.`;
    }
    const grazingPhases: PhaseLine[] = [];
    if (paddocks.length === 0) {
      grazingPhases.push({
        phase: 1,
        action: 'Decide species, group size, and rotation length before placing fences.',
        dependsOn: 'water supply, parcel forage capacity',
        unlocks: 'every downstream paddock-design decision',
      });
      grazingPhases.push({
        phase: 1,
        action: 'Place 4 starter paddocks with shared water access and a back-fence path.',
        dependsOn: 'water tank or hydrant within 200 ft of each cell',
        unlocks: 'rotational grazing, parasite-cycle break, soil rebuild',
      });
    } else if (paddocks.length < 4) {
      grazingPhases.push({
        phase: 1,
        action: `Subdivide existing paddocks to reach 4+ cells (currently ${paddocks.length}).`,
        dependsOn: 'temporary fencing or polywire kit',
        unlocks: 'meaningful rotation cycles',
      });
    }
    grazingPhases.push({
      phase: 2,
      action: canopyPct != null && canopyPct < 5
        ? 'Add silvopasture trees for shade — current canopy is near zero, livestock heat stress is real.'
        : 'Refine rotation timing against forage regrowth windows by season.',
      dependsOn: 'grazing log from year 1',
      unlocks: 'stocking-rate calibration, animal-unit-month accuracy',
    });
    grazingPhases.push({
      phase: 3,
      action: 'Layer perennial forages (clover, chicory, alfalfa) and cool-season stockpile to extend the grazing season.',
      dependsOn: 'soil tests, rotation log, infrastructure stability',
      unlocks: 'reduced hay purchase, lower winter feed cost',
    });

    // ── ORCHARD ─────────────────────────────────────────────────────
    const orchardCrops = cropAreas.filter((c) => {
      const t = String(c.type ?? '').toLowerCase();
      return t === 'orchard' || t === 'food_forest' || t === 'silvopasture';
    });
    let orchardReadiness: Readiness = 'not_started';
    let orchardLine = 'No orchard / food-forest / silvopasture polygons placed.';
    if (orchardCrops.length >= 2) {
      orchardReadiness = 'mature';
      orchardLine = `${orchardCrops.length} perennial polygons placed.`;
    } else if (orchardCrops.length === 1) {
      orchardReadiness = 'in_progress';
      orchardLine = '1 perennial polygon placed; consider a second for diversity.';
    }
    const orchardPhases: PhaseLine[] = [];
    if (orchardCrops.length === 0) {
      orchardPhases.push({
        phase: 1,
        action: 'Sheet-mulch or cover-crop the intended polygon a full season before planting.',
        dependsOn: 'sun exposure check, drainage check, deer-fence plan',
        unlocks: 'low-stress establishment, year-1 weed suppression',
      });
      orchardPhases.push({
        phase: 1,
        action: 'Pick climate-appropriate cultivars and order trees on the winter\u2013early spring planting window.',
        dependsOn: 'chill-hour estimate, nursery availability',
        unlocks: 'year-3 first-yield curve',
      });
    }
    orchardPhases.push({
      phase: 2,
      action: typeof slopeDeg === 'number' && slopeDeg > 8
        ? 'Plant on contour with keyline-style swales above each row to retain water on slope.'
        : 'Establish irrigation through year 3 even if "self-sustaining" long term.',
      dependsOn: 'water supply, drip-line layout',
      unlocks: 'survival-rate above 90% in years 1\u20133',
    });
    orchardPhases.push({
      phase: 2,
      action: 'Underplant with nitrogen-fixers (comfrey, clover, autumn olive) in the herb layer.',
      dependsOn: 'first-year tree survival',
      unlocks: 'mulch-on-site, soil microbiology, beneficial insect habitat',
    });
    orchardPhases.push({
      phase: 3,
      action: 'Add processing infrastructure (cider press, dehydrator, cold storage) as yields scale.',
      dependsOn: 'consistent year-5+ harvests',
      unlocks: 'value-added revenue, gift/sale flexibility',
    });

    return [
      {
        id: 'build' as ThreadId,
        label: 'Build sequence',
        blurb: 'Structures and access — the human-presence anchor.',
        readiness: buildReadiness,
        readinessLine: buildLine,
        phases: buildPhases,
      },
      {
        id: 'water' as ThreadId,
        label: 'Water strategy',
        blurb: 'Supply, storage, treatment, and landscape retention.',
        readiness: waterReadiness,
        readinessLine: waterLine,
        phases: waterPhases,
      },
      {
        id: 'grazing' as ThreadId,
        label: 'Grazing strategy',
        blurb: 'Paddock subdivision, water access, rotation rhythm.',
        readiness: grazingReadiness,
        readinessLine: grazingLine,
        phases: grazingPhases,
      },
      {
        id: 'orchard' as ThreadId,
        label: 'Orchard / perennial strategy',
        blurb: 'Long-arc establishment of food-forest and silvopasture.',
        readiness: orchardReadiness,
        readinessLine: orchardLine,
        phases: orchardPhases,
      },
    ];
  }, [structures, utilities, cropAreas, paddocks, siteData]);

  return (
    <section className={css.card} aria-label="Phased build strategy">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Phased build, water, grazing, orchard strategies</h3>
          <p className={css.cardHint}>
            Four parallel threads, each surfaced as a Year-1 / Years-2-3 /
            Year-3+ sequence with explicit <em>depends on</em> and{' '}
            <em>unlocks</em> pointers. Phase ordering and concrete actions
            are derived from current entity composition and site signals
            (slope, canopy, hydrologic group, flood zone). Click any thread
            to expand.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <ul className={css.threadList}>
        {THREAD_ORDER.map((tid) => {
          const t = threads.find((x) => x.id === tid);
          if (!t) return null;
          const isOpen = openId === tid;
          return (
            <li
              key={tid}
              className={`${css.thread} ${css[`thread_${tid}`] ?? ''} ${
                isOpen ? css.threadOpen : ''
              }`}
            >
              <button
                type="button"
                className={css.threadHead}
                onClick={() => setOpenId(isOpen ? null : tid)}
                aria-expanded={isOpen}
              >
                <div className={css.threadHeadLeft}>
                  <span className={css.threadLabel}>{t.label}</span>
                  <span className={css.threadBlurb}>{t.blurb}</span>
                </div>
                <div className={css.threadHeadRight}>
                  <span
                    className={`${css.readinessTag} ${
                      css[`readiness_${t.readiness}`] ?? ''
                    }`}
                  >
                    {READINESS_LABEL[t.readiness]}
                  </span>
                  <span className={css.threadToggle}>{isOpen ? '\u2212' : '+'}</span>
                </div>
              </button>
              {isOpen && (
                <div className={css.threadBody}>
                  <div className={css.readinessLine}>{t.readinessLine}</div>
                  <ol className={css.phaseList}>
                    {t.phases.map((p, i) => (
                      <li key={i} className={`${css.phaseRow} ${css[`phase_${p.phase}`] ?? ''}`}>
                        <span className={css.phaseTag}>{PHASE_LABEL[p.phase]}</span>
                        <div className={css.phaseBody}>
                          <div className={css.phaseAction}>{p.action}</div>
                          {(p.dependsOn || p.unlocks) && (
                            <div className={css.phaseMeta}>
                              {p.dependsOn && (
                                <span>
                                  <span className={css.phaseMetaLabel}>Depends on:</span>{' '}
                                  {p.dependsOn}
                                </span>
                              )}
                              {p.unlocks && (
                                <span>
                                  <span className={css.phaseMetaLabel}>Unlocks:</span>{' '}
                                  {p.unlocks}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        <em>How phases are derived:</em> deterministic. Readiness bands
        come from entity counts (paddocks placed, perennial polygons
        present, residence/barn/well/tank present); Year-1 actions appear
        only when their gate is unmet; Years 2-3 and Year 3+ rows are
        added unconditionally as forward-looking lifts. Slope, canopy,
        hydrologic group, and flood-zone reads modify wording (e.g. HSG D
        triggers an engineered-drainfield note; slope &gt; 8\u00B0 triggers a
        keyline-swale note). Same inputs always produce the same plan
        &mdash; no LLM call.
      </p>
    </section>
  );
}
