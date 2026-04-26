/**
 * §19 EducationCoverageCard — feature → educational-mode coverage matrix.
 *
 * The dashboard offers six explanation modes (ecology / water / livestock /
 * agroforestry / regeneration / spiritual) but a steward can't tell, at a
 * glance, which modes have actual material to draw from. A "spiritual" mode
 * is hollow if no prayer space, contemplation zone, or meaning-bearing
 * structure has been placed; a "livestock" mode is hollow with no paddocks.
 *
 * This card is the index that sits behind §19's clickable-hotspot side-panel
 * model: each placed feature is mapped to the modes it activates, and each
 * mode reports its activation count + a tone band:
 *
 *   • RICH    — ≥ 3 features map to this mode
 *   • LIGHT   — 1–2 features (mode runs but reads thin)
 *   • ORPHAN  — 0 features (mode has nothing to explain — hide or seed)
 *
 * Pure presentation: reads existing structures / zones / utilities / paths /
 * crops / paddocks. No new entities, no shared math, no map writes.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { usePathStore, type PathType } from '../../store/pathStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './EducationCoverageCard.module.css';

interface Props {
  project: LocalProject;
}

type ModeId = 'ecology' | 'water' | 'livestock' | 'agroforestry' | 'regeneration' | 'spiritual';

interface ModeDefinition {
  id: ModeId;
  label: string;
  icon: string;
  blurb: string;
  structureTypes: ReadonlySet<StructureType>;
  zoneCategories: ReadonlySet<ZoneCategory>;
  utilityTypes: ReadonlySet<UtilityType>;
  pathTypes: ReadonlySet<PathType>;
  cropTypes: ReadonlySet<CropAreaType>;
  countsPaddocks: boolean;
  seedHint: string; // What the user should add to fill an empty mode
}

const MODES: ModeDefinition[] = [
  {
    id: 'ecology',
    label: 'Ecology',
    icon: '\u{1F33F}',
    blurb: 'Habitat, biodiversity, soil biology',
    structureTypes: new Set(['compost_station']),
    zoneCategories: new Set(['conservation', 'food_production', 'commons']),
    utilityTypes: new Set(['compost', 'biochar', 'waste_sorting']),
    pathTypes: new Set(),
    cropTypes: new Set(['food_forest', 'pollinator_strip', 'silvopasture', 'shelterbelt', 'windbreak']),
    countsPaddocks: false,
    seedHint: 'Add a conservation or food-production zone, a food-forest crop area, or a compost system.',
  },
  {
    id: 'water',
    label: 'Water',
    icon: '\u{1F4A7}',
    blurb: 'Catchment, flow, retention',
    structureTypes: new Set(['greenhouse', 'bathhouse', 'water_tank', 'water_pump_house', 'well']),
    zoneCategories: new Set(['water_retention']),
    utilityTypes: new Set(['rain_catchment', 'water_tank', 'well_pump', 'greywater', 'septic']),
    pathTypes: new Set(),
    cropTypes: new Set(),
    countsPaddocks: false,
    seedHint: 'Add a water-retention zone, rain-catchment utility, or cistern/well structure.',
  },
  {
    id: 'livestock',
    label: 'Livestock',
    icon: '\u{1F404}',
    blurb: 'Herd rotation, animal welfare',
    structureTypes: new Set(['animal_shelter', 'barn']),
    zoneCategories: new Set(['livestock']),
    utilityTypes: new Set(),
    pathTypes: new Set(['animal_corridor', 'grazing_route']),
    cropTypes: new Set(['silvopasture']),
    countsPaddocks: true,
    seedHint: 'Draw a paddock, livestock zone, or place an animal shelter / barn structure.',
  },
  {
    id: 'agroforestry',
    label: 'Agroforestry',
    icon: '\u{1F333}',
    blurb: 'Species layering, silvopasture',
    structureTypes: new Set(),
    zoneCategories: new Set(['food_production']),
    utilityTypes: new Set(),
    pathTypes: new Set(),
    cropTypes: new Set(['orchard', 'food_forest', 'silvopasture', 'windbreak', 'shelterbelt', 'nursery']),
    countsPaddocks: false,
    seedHint: 'Add an orchard, food-forest, or silvopasture crop area to surface tree-guild explanations.',
  },
  {
    id: 'regeneration',
    label: 'Regeneration',
    icon: '\u{1F331}',
    blurb: 'Where the land is on its recovery arc',
    structureTypes: new Set(['compost_station']),
    zoneCategories: new Set(['conservation', 'water_retention', 'future_expansion', 'buffer']),
    utilityTypes: new Set(['compost', 'biochar']),
    pathTypes: new Set(),
    cropTypes: new Set(['pollinator_strip', 'food_forest', 'shelterbelt']),
    countsPaddocks: true,
    seedHint: 'Add conservation or buffer zones, or a regenerative crop pattern (pollinator strip, food forest).',
  },
  {
    id: 'spiritual',
    label: 'Spiritual',
    icon: '\u{2728}',
    blurb: 'Meaning, covenant, signs in creation',
    structureTypes: new Set(['prayer_space', 'pavilion', 'lookout', 'fire_circle']),
    zoneCategories: new Set(['spiritual', 'retreat', 'commons']),
    utilityTypes: new Set(),
    pathTypes: new Set(['trail', 'pedestrian_path']),
    cropTypes: new Set(),
    countsPaddocks: false,
    seedHint: 'Add a prayer-space or pavilion structure, or designate a spiritual / retreat zone.',
  },
];

interface ModeCoverage {
  mode: ModeDefinition;
  count: number;
  breakdown: Array<{ kind: string; n: number }>;
  tone: 'rich' | 'light' | 'orphan';
}

function classify(count: number): 'rich' | 'light' | 'orphan' {
  if (count === 0) return 'orphan';
  if (count >= 3) return 'rich';
  return 'light';
}

export default function EducationCoverageCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const structures = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);
  const paths = useMemo(() => allPaths.filter((p) => p.projectId === project.id), [allPaths, project.id]);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === project.id), [allPaddocks, project.id]);

  const totalFeatures =
    structures.length + zones.length + utilities.length + paths.length + crops.length + paddocks.length;

  const coverage = useMemo<ModeCoverage[]>(() => {
    return MODES.map((m) => {
      const sCount = structures.filter((s) => m.structureTypes.has(s.type)).length;
      const zCount = zones.filter((z) => m.zoneCategories.has(z.category)).length;
      const uCount = utilities.filter((u) => m.utilityTypes.has(u.type)).length;
      const pCount = paths.filter((p) => m.pathTypes.has(p.type)).length;
      const cCount = crops.filter((c) => m.cropTypes.has(c.type)).length;
      const padCount = m.countsPaddocks ? paddocks.length : 0;
      const total = sCount + zCount + uCount + pCount + cCount + padCount;
      const breakdown: Array<{ kind: string; n: number }> = [];
      if (sCount > 0) breakdown.push({ kind: 'structure', n: sCount });
      if (zCount > 0) breakdown.push({ kind: 'zone', n: zCount });
      if (uCount > 0) breakdown.push({ kind: 'utility', n: uCount });
      if (pCount > 0) breakdown.push({ kind: 'path', n: pCount });
      if (cCount > 0) breakdown.push({ kind: 'crop area', n: cCount });
      if (padCount > 0) breakdown.push({ kind: 'paddock', n: padCount });
      return { mode: m, count: total, breakdown, tone: classify(total) };
    });
  }, [structures, zones, utilities, paths, crops, paddocks]);

  const richCount = coverage.filter((c) => c.tone === 'rich').length;
  const lightCount = coverage.filter((c) => c.tone === 'light').length;
  const orphanCount = coverage.filter((c) => c.tone === 'orphan').length;
  const activeCount = richCount + lightCount;
  const coveragePct = MODES.length > 0 ? Math.round((activeCount / MODES.length) * 100) : 0;

  // What share of placed features map to ≥ 1 mode? Defensive presentation —
  // the mode catalog is intentionally inclusive but counting features that
  // ride at least one mode tells the user whether the design "speaks" through
  // the educational layer.
  const featuresWithAnyMode = useMemo(() => {
    let n = 0;
    for (const s of structures) {
      if (MODES.some((m) => m.structureTypes.has(s.type))) n += 1;
    }
    for (const z of zones) {
      if (MODES.some((m) => m.zoneCategories.has(z.category))) n += 1;
    }
    for (const u of utilities) {
      if (MODES.some((m) => m.utilityTypes.has(u.type))) n += 1;
    }
    for (const p of paths) {
      if (MODES.some((m) => m.pathTypes.has(p.type))) n += 1;
    }
    for (const c of crops) {
      if (MODES.some((m) => m.cropTypes.has(c.type))) n += 1;
    }
    if (paddocks.length > 0 && MODES.some((m) => m.countsPaddocks)) n += paddocks.length;
    return n;
  }, [structures, zones, utilities, paths, crops, paddocks]);

  const featurePct = totalFeatures > 0 ? Math.round((featuresWithAnyMode / totalFeatures) * 100) : 0;

  if (totalFeatures === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Educational Coverage</h3>
            <p className={css.hint}>
              Indexes which placed features each of the six interpretive modes
              has to draw from. Add structures, zones, utilities, paths, crops,
              or paddocks to see coverage emerge.
            </p>
          </div>
          <span className={`${css.badge} ${css.badgePoor}`}>NO FEATURES</span>
        </div>
        <div className={css.empty}>No features placed for this project yet.</div>
      </div>
    );
  }

  const overallTone = orphanCount === 0 ? 'badgeGood' : orphanCount <= 2 ? 'badgeFair' : 'badgePoor';
  const orphanModes = coverage.filter((c) => c.tone === 'orphan');

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Educational Coverage</h3>
          <p className={css.hint}>
            Each placed feature is indexed to the interpretive modes it
            activates. <strong>Rich</strong> modes have ≥ 3 features to draw
            from, <strong>light</strong> modes have 1–2 (a tour reads thin),
            and <strong>orphan</strong> modes have nothing — either hide them
            from the public-facing dashboard or seed the missing material.
          </p>
        </div>
        <span className={`${css.badge} ${css[overallTone]}`}>
          {activeCount}/{MODES.length} MODES ACTIVE
        </span>
      </div>

      <div className={css.summaryGrid}>
        <div className={`${css.stat} ${richCount >= 4 ? css.stat_good : richCount >= 2 ? css.stat_fair : css.stat_poor}`}>
          <span className={css.statLabel}>Rich modes</span>
          <span className={css.statValue}>{richCount}</span>
          <span className={css.statSub}>≥ 3 matched features</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Light modes</span>
          <span className={css.statValue}>{lightCount}</span>
          <span className={css.statSub}>1–2 features</span>
        </div>
        <div className={`${css.stat} ${orphanCount === 0 ? css.stat_good : orphanCount <= 2 ? css.stat_fair : css.stat_poor}`}>
          <span className={css.statLabel}>Orphan modes</span>
          <span className={css.statValue}>{orphanCount}</span>
          <span className={css.statSub}>nothing to explain</span>
        </div>
        <div className={`${css.stat} ${featurePct >= 80 ? css.stat_good : featurePct >= 50 ? css.stat_fair : css.stat_poor}`}>
          <span className={css.statLabel}>Feature coverage</span>
          <span className={css.statValue}>{featurePct}%</span>
          <span className={css.statSub}>{featuresWithAnyMode}/{totalFeatures} ride a mode</span>
        </div>
      </div>

      {orphanModes.length > 0 && (
        <div className={css.orphanCallout}>
          <strong>Orphan modes:</strong>{' '}
          {orphanModes.map((c, i) => (
            <span key={c.mode.id}>
              {c.mode.label}{i < orphanModes.length - 1 ? ' · ' : ''}
            </span>
          ))}
          {' — '}
          consider hiding these tabs from public tour mode, or place a
          companion feature per mode to give the lens material to read.
          Coverage now is {coveragePct}% of the six modes.
        </div>
      )}

      <ul className={css.list}>
        {coverage.map((c) => (
          <li key={c.mode.id} className={`${css.row} ${css[`tone_${c.tone}`]}`}>
            <span className={css.rowIcon}>{c.mode.icon}</span>
            <span className={css.rowLabel}>
              <span className={css.rowLabelTitle}>{c.mode.label}</span>
              <span className={css.rowFeatures}>
                {c.tone === 'orphan'
                  ? c.mode.seedHint
                  : c.breakdown.map((b) => `${b.n} ${b.kind}${b.n > 1 ? 's' : ''}`).join(' · ')}
              </span>
            </span>
            <span className={css.rowDepth}>
              {c.count > 0 ? `${c.count} feature${c.count > 1 ? 's' : ''}` : '—'}
            </span>
            <span className={`${css.rowTag} ${css[`tag_${c.tone}`]}`}>
              {c.tone.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Mode mappings reflect the interpretive lens each feature naturally
        invites — they are deliberately inclusive (e.g. a food-production zone
        feeds both ecology and agroforestry) so the dashboard surfaces every
        legitimate teaching surface. Hiding orphan modes from public-share
        mode is a separate (recommended) UX step.
      </p>
    </div>
  );
}
