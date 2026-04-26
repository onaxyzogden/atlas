/**
 * §14 BeforeAfterMasterplanCard — concept-overlay synthesis.
 *
 * Snapshots the property TODAY (current state — features in completed phases,
 * or Phase 1 only if no phase is marked complete) against the VISION
 * (everything across every phase). Shows side-by-side rollups of cropped /
 * grazed / structure / water-storage / energy footprint so a steward can
 * see what their plan adds at a glance.
 *
 * Pure presentation rollup of the same stores PhasingDashboard already reads.
 * No new shared math, no new entity types. Mounted at the bottom of the
 * PhasingDashboard so it sits adjacent to the phase cards that drive it.
 */

import { useMemo } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import css from './BeforeAfterMasterplanCard.module.css';

interface Props {
  projectId: string;
}

interface Snapshot {
  croppedM2: number;
  grazedM2: number;
  structureCount: number;
  structureFootprintM2: number;
  waterStorageGal: number;
  solarCount: number;
  estimatedHead: number;
}

const M2_PER_ACRE = 4046.86;
const HA_PER_M2 = 1 / 10_000;

function emptySnapshot(): Snapshot {
  return {
    croppedM2: 0,
    grazedM2: 0,
    structureCount: 0,
    structureFootprintM2: 0,
    waterStorageGal: 0,
    solarCount: 0,
    estimatedHead: 0,
  };
}

function fmtAcres(m2: number): string {
  if (m2 <= 0) return '0';
  const acres = m2 / M2_PER_ACRE;
  if (acres < 0.1) return acres.toFixed(2);
  if (acres < 10) return acres.toFixed(1);
  return Math.round(acres).toLocaleString();
}

function fmtCount(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtGal(g: number): string {
  if (g <= 0) return '0';
  if (g >= 10_000) return `${(g / 1000).toFixed(0)}k`;
  if (g >= 1000) return `${(g / 1000).toFixed(1)}k`;
  return Math.round(g).toLocaleString();
}

function deltaLabel(current: number, vision: number): string {
  const diff = vision - current;
  if (Math.abs(diff) < 0.0001) return 'no change';
  const sign = diff > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export default function BeforeAfterMasterplanCard({ projectId }: Props) {
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const structures = useStructureStore((s) => s.structures);
  const utilities = useUtilityStore((s) => s.utilities);
  const allPhases = usePhaseStore((s) => s.phases);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  // "Today" baseline: phases the steward has marked completed. If nothing is
  // marked, default to the first phase (the realistic "we just started"
  // case — Phase 1 features are the things being put in the ground first).
  const baselinePhaseNames = useMemo(() => {
    const completed = phases.filter((p) => p.completed).map((p) => p.name);
    if (completed.length > 0) return new Set(completed);
    if (phases[0]) return new Set([phases[0].name]);
    return new Set<string>();
  }, [phases]);

  const baselineLabel = useMemo(() => {
    const completed = phases.filter((p) => p.completed);
    if (completed.length === 0) {
      return phases[0] ? `${phases[0].name} only` : 'No phases';
    }
    if (completed.length === phases.length) return 'All phases complete';
    return `${completed.length} phase${completed.length === 1 ? '' : 's'} complete`;
  }, [phases]);

  const projectCrops = useMemo(
    () => cropAreas.filter((c) => c.projectId === projectId),
    [cropAreas, projectId],
  );
  const projectPaddocks = useMemo(
    () => paddocks.filter((p) => p.projectId === projectId),
    [paddocks, projectId],
  );
  const projectStructures = useMemo(
    () => structures.filter((s) => s.projectId === projectId),
    [structures, projectId],
  );
  const projectUtilities = useMemo(
    () => utilities.filter((u) => u.projectId === projectId),
    [utilities, projectId],
  );

  const totalEntities =
    projectCrops.length +
    projectPaddocks.length +
    projectStructures.length +
    projectUtilities.length;

  const snapshots = useMemo(() => {
    const today = emptySnapshot();
    const vision = emptySnapshot();

    for (const c of projectCrops) {
      vision.croppedM2 += c.areaM2 || 0;
      if (baselinePhaseNames.has(c.phase)) today.croppedM2 += c.areaM2 || 0;
    }

    for (const pd of projectPaddocks) {
      vision.grazedM2 += pd.areaM2 || 0;
      const headPerHa = pd.stockingDensity ?? 0;
      const heads = headPerHa * (pd.areaM2 || 0) * HA_PER_M2;
      vision.estimatedHead += heads;
      if (baselinePhaseNames.has(pd.phase)) {
        today.grazedM2 += pd.areaM2 || 0;
        today.estimatedHead += heads;
      }
    }

    for (const st of projectStructures) {
      vision.structureCount += 1;
      const footprint = (st.widthM || 0) * (st.depthM || 0);
      vision.structureFootprintM2 += footprint;
      if (baselinePhaseNames.has(st.phase)) {
        today.structureCount += 1;
        today.structureFootprintM2 += footprint;
      }
    }

    for (const u of projectUtilities) {
      const cap = u.capacityGal ?? 0;
      const isSolar = u.type === 'solar_panel';
      vision.waterStorageGal += cap;
      if (isSolar) vision.solarCount += 1;
      if (baselinePhaseNames.has(u.phase)) {
        today.waterStorageGal += cap;
        if (isSolar) today.solarCount += 1;
      }
    }

    return { today, vision };
  }, [projectCrops, projectPaddocks, projectStructures, projectUtilities, baselinePhaseNames]);

  if (totalEntities === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h2 className={css.cardTitle}>Before / After {'\u2014'} Masterplan Overlay</h2>
            <p className={css.cardHint}>
              Compares today's footprint against the full vision once placements
              start landing on the map.
            </p>
          </div>
          <span className={css.modeBadge}>Vision</span>
        </div>
        <div className={css.empty}>
          Place a few crops, paddocks, structures, or utilities on the map and
          this card will draw the before/after comparison.
        </div>
      </div>
    );
  }

  const { today, vision } = snapshots;
  const rows = [
    {
      label: 'Cropped land',
      unit: 'acres',
      todayValue: fmtAcres(today.croppedM2),
      visionValue: fmtAcres(vision.croppedM2),
      delta: deltaLabel(today.croppedM2 / M2_PER_ACRE, vision.croppedM2 / M2_PER_ACRE),
      sub: `${projectCrops.length} crop area${projectCrops.length === 1 ? '' : 's'} planned`,
    },
    {
      label: 'Grazed land',
      unit: 'acres',
      todayValue: fmtAcres(today.grazedM2),
      visionValue: fmtAcres(vision.grazedM2),
      delta: deltaLabel(today.grazedM2 / M2_PER_ACRE, vision.grazedM2 / M2_PER_ACRE),
      sub: `${projectPaddocks.length} paddock${projectPaddocks.length === 1 ? '' : 's'} planned`,
    },
    {
      label: 'Structures',
      unit: 'placed',
      todayValue: fmtCount(today.structureCount),
      visionValue: fmtCount(vision.structureCount),
      delta: deltaLabel(today.structureCount, vision.structureCount),
      sub:
        vision.structureFootprintM2 > 0
          ? `${fmtAcres(vision.structureFootprintM2)} ac built footprint at full vision`
          : 'No footprint area entered yet',
    },
    {
      label: 'Water storage',
      unit: 'gallons',
      todayValue: fmtGal(today.waterStorageGal),
      visionValue: fmtGal(vision.waterStorageGal),
      delta: deltaLabel(today.waterStorageGal, vision.waterStorageGal),
      sub: 'Sum of placed tank / catchment capacity',
    },
    {
      label: 'Solar arrays',
      unit: 'placed',
      todayValue: fmtCount(today.solarCount),
      visionValue: fmtCount(vision.solarCount),
      delta: deltaLabel(today.solarCount, vision.solarCount),
      sub: 'Solar utilities only — generators / batteries excluded',
    },
    {
      label: 'Estimated head',
      unit: 'animals',
      todayValue: fmtCount(today.estimatedHead),
      visionValue: fmtCount(vision.estimatedHead),
      delta: deltaLabel(today.estimatedHead, vision.estimatedHead),
      sub: 'Stocking density \u00D7 paddock area, summed across species',
    },
  ];

  // Headline transformation summary — pick the metric with the largest
  // proportional change, expressed in plain language.
  const headline = useMemo(() => {
    let bestLabel: string | null = null;
    let bestDelta = 0;
    const pairs: { label: string; current: number; vision: number }[] = [
      { label: 'cropped land', current: today.croppedM2, vision: vision.croppedM2 },
      { label: 'grazed land', current: today.grazedM2, vision: vision.grazedM2 },
      { label: 'structures', current: today.structureCount, vision: vision.structureCount },
      { label: 'water storage', current: today.waterStorageGal, vision: vision.waterStorageGal },
      { label: 'solar capacity', current: today.solarCount, vision: vision.solarCount },
      { label: 'animal head', current: today.estimatedHead, vision: vision.estimatedHead },
    ];
    for (const p of pairs) {
      const diff = p.vision - p.current;
      if (diff > bestDelta) {
        bestDelta = diff;
        bestLabel = p.label;
      }
    }
    if (!bestLabel) return 'Vision matches the current footprint — nothing queued in later phases.';
    return `Across all phases, the largest add is ${bestLabel}.`;
  }, [today, vision]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h2 className={css.cardTitle}>Before / After {'\u2014'} Masterplan Overlay</h2>
          <p className={css.cardHint}>
            What this property looks like today vs. the end-of-vision state if
            every queued phase ships. Baseline: <em>{baselineLabel}</em>.
          </p>
        </div>
        <span className={css.modeBadge}>Vision</span>
      </div>

      <div className={css.headline}>{headline}</div>

      <div className={css.tableHead}>
        <span className={css.tableHeadMetric}>Metric</span>
        <span className={css.tableHeadCol}>Today</span>
        <span className={css.tableHeadCol}>Vision</span>
        <span className={css.tableHeadCol}>{'\u0394'}</span>
      </div>

      <ul className={css.rowList}>
        {rows.map((r) => (
          <li key={r.label} className={css.row}>
            <div className={css.rowLabel}>
              <span className={css.rowName}>{r.label}</span>
              <span className={css.rowSub}>{r.sub}</span>
            </div>
            <div className={css.rowCol}>
              <span className={css.rowValue}>{r.todayValue}</span>
              <span className={css.rowUnit}>{r.unit}</span>
            </div>
            <div className={css.rowCol}>
              <span className={`${css.rowValue} ${css.rowValueVision}`}>{r.visionValue}</span>
              <span className={css.rowUnit}>{r.unit}</span>
            </div>
            <div className={css.rowCol}>
              <span className={css.rowDelta}>{r.delta}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Today = features in completed phases (or Phase 1 if none are marked
        complete). Vision = every placed feature regardless of phase. Delta
        excludes sequencing — see Phase cards above for build order.
      </p>
    </div>
  );
}
