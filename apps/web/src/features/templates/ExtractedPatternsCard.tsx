/**
 * ExtractedPatternsCard — surfaces the reusable patterns embedded in the
 * current project so a steward can see "what would carry over" if this
 * site were lifted into a new project as a template.
 *
 * Spec mapping: §20 Reusable Frameworks · `saved-bundles-rules-hotspots-phases-costs`
 * (P3, planned → partial). This is the read-only inventory step — the
 * "save as template" / governance / locking flow lands later.
 *
 * Bundles surfaced (purely derived from existing stores — no new entities):
 *   • Zone-category palette
 *   • Structure-type mix + cost rollup
 *   • Path-class palette
 *   • Livestock species + avg stocking density
 *   • Crop polyculture (top species)
 *   • Phase structure (count + names)
 *   • Utility kit
 *
 * Mounted on TemplatePanel between the tab bar and the library list so
 * stewards encounter "extract from this site" before they browse stock
 * frameworks. Read-only; the actual save-as-template action remains
 * follow-on work tracked under `template-duplication-locking-governance`.
 */

import { useMemo } from 'react';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { usePathStore, type PathType, PATH_TYPE_CONFIG } from '../../store/pathStore.js';
import { useLivestockStore, type LivestockSpecies } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import s from './ExtractedPatternsCard.module.css';

interface ExtractedPatternsCardProps {
  projectId: string;
}

interface BundleStat {
  label: string;
  count: number;
  swatch?: string;
}

const ZONE_CATEGORY_LABEL: Record<ZoneCategory, string> = {
  habitation: 'Habitation',
  food_production: 'Food production',
  livestock: 'Livestock',
  commons: 'Commons',
  spiritual: 'Spiritual',
  education: 'Education',
  retreat: 'Retreat',
  conservation: 'Conservation',
  water_retention: 'Water retention',
  infrastructure: 'Infrastructure',
  access: 'Access',
  buffer: 'Buffer',
  future_expansion: 'Future expansion',
};

const STRUCTURE_TYPE_LABEL: Record<StructureType, string> = {
  cabin: 'Cabin',
  yurt: 'Yurt',
  pavilion: 'Pavilion',
  greenhouse: 'Greenhouse',
  barn: 'Barn',
  workshop: 'Workshop',
  prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse',
  classroom: 'Classroom',
  storage: 'Storage',
  animal_shelter: 'Animal shelter',
  compost_station: 'Compost station',
  water_pump_house: 'Water pump house',
  tent_glamping: 'Tent / glamping',
  fire_circle: 'Fire circle',
  lookout: 'Lookout',
  earthship: 'Earthship',
  solar_array: 'Solar array',
  well: 'Well',
  water_tank: 'Water tank',
};

const UTILITY_TYPE_LABEL: Record<UtilityType, string> = {
  solar_panel: 'Solar panel',
  battery_room: 'Battery room',
  generator: 'Generator',
  water_tank: 'Water tank',
  well_pump: 'Well pump',
  greywater: 'Greywater',
  septic: 'Septic',
  rain_catchment: 'Rain catchment',
  lighting: 'Lighting',
  firewood_storage: 'Firewood storage',
  waste_sorting: 'Waste sorting',
  compost: 'Compost',
  biochar: 'Biochar',
  tool_storage: 'Tool storage',
  laundry_station: 'Laundry station',
};

const SPECIES_LABEL: Record<LivestockSpecies, string> = {
  sheep: 'Sheep',
  cattle: 'Cattle',
  goats: 'Goats',
  poultry: 'Poultry',
  pigs: 'Pigs',
  horses: 'Horses',
  ducks_geese: 'Ducks / geese',
  rabbits: 'Rabbits',
  bees: 'Bees',
};

export default function ExtractedPatternsCard({ projectId }: ExtractedPatternsCardProps) {
  const zones = useZoneStore((st) => st.zones).filter((z) => z.projectId === projectId);
  const structures = useStructureStore((st) => st.structures).filter((s2) => s2.projectId === projectId);
  const paths = usePathStore((st) => st.paths).filter((p2) => p2.projectId === projectId);
  const paddocks = useLivestockStore((st) => st.paddocks).filter((p2) => p2.projectId === projectId);
  const crops = useCropStore((st) => st.cropAreas).filter((c) => c.projectId === projectId);
  const utilities = useUtilityStore((st) => st.utilities).filter((u) => u.projectId === projectId);
  const phases = usePhaseStore((st) => st.phases).filter((ph) => ph.projectId === projectId);

  const bundles = useMemo(() => {
    // Zone-category palette
    const zoneCounts = new Map<ZoneCategory, { count: number; color: string }>();
    for (const z of zones) {
      const prev = zoneCounts.get(z.category);
      zoneCounts.set(z.category, {
        count: (prev?.count ?? 0) + 1,
        color: prev?.color ?? z.color,
      });
    }
    const zonePalette: BundleStat[] = Array.from(zoneCounts.entries())
      .map(([cat, v]) => ({ label: ZONE_CATEGORY_LABEL[cat], count: v.count, swatch: v.color }))
      .sort((a, b) => b.count - a.count);

    // Structure-type mix + cost rollup
    const structureCounts = new Map<StructureType, number>();
    let costTotal = 0;
    let costKnown = 0;
    for (const st of structures) {
      structureCounts.set(st.type, (structureCounts.get(st.type) ?? 0) + 1);
      if (typeof st.costEstimate === 'number' && st.costEstimate > 0) {
        costTotal += st.costEstimate;
        costKnown += 1;
      }
    }
    const structureMix: BundleStat[] = Array.from(structureCounts.entries())
      .map(([t, count]) => ({ label: STRUCTURE_TYPE_LABEL[t], count }))
      .sort((a, b) => b.count - a.count);

    // Path-class palette
    const pathCounts = new Map<PathType, { count: number; lengthM: number }>();
    for (const pa of paths) {
      const prev = pathCounts.get(pa.type);
      pathCounts.set(pa.type, {
        count: (prev?.count ?? 0) + 1,
        lengthM: (prev?.lengthM ?? 0) + (pa.lengthM ?? 0),
      });
    }
    const pathPalette: BundleStat[] = Array.from(pathCounts.entries())
      .map(([t, v]) => ({
        label: `${PATH_TYPE_CONFIG[t].label} (${Math.round(v.lengthM)} m)`,
        count: v.count,
        swatch: PATH_TYPE_CONFIG[t].color,
      }))
      .sort((a, b) => b.count - a.count);

    // Livestock species set + avg stocking density
    const speciesSet = new Set<LivestockSpecies>();
    let densitySum = 0;
    let densityKnown = 0;
    for (const pad of paddocks) {
      for (const sp of pad.species) speciesSet.add(sp);
      if (typeof pad.stockingDensity === 'number' && pad.stockingDensity > 0) {
        densitySum += pad.stockingDensity;
        densityKnown += 1;
      }
    }
    const livestockSet: BundleStat[] = Array.from(speciesSet.values()).map((sp) => ({
      label: SPECIES_LABEL[sp],
      count: paddocks.filter((p2) => p2.species.includes(sp)).length,
    })).sort((a, b) => b.count - a.count);
    const avgDensity = densityKnown > 0 ? densitySum / densityKnown : null;

    // Crop polyculture — top species across all crop areas
    const speciesCount = new Map<string, number>();
    for (const c of crops) {
      for (const sp of c.species) {
        const trimmed = sp.trim();
        if (!trimmed) continue;
        speciesCount.set(trimmed, (speciesCount.get(trimmed) ?? 0) + 1);
      }
    }
    const cropTop: BundleStat[] = Array.from(speciesCount.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const cropDistinct = speciesCount.size;

    // Utility kit
    const utilCounts = new Map<UtilityType, number>();
    for (const u of utilities) {
      utilCounts.set(u.type, (utilCounts.get(u.type) ?? 0) + 1);
    }
    const utilityKit: BundleStat[] = Array.from(utilCounts.entries())
      .map(([t, count]) => ({ label: UTILITY_TYPE_LABEL[t], count }))
      .sort((a, b) => b.count - a.count);

    // Phase structure — names + completion
    const phaseList = [...phases].sort((a, b) => a.order - b.order);

    return {
      zonePalette,
      structureMix,
      costTotal,
      costKnown,
      pathPalette,
      livestockSet,
      avgDensity,
      cropTop,
      cropDistinct,
      utilityKit,
      phaseList,
      totals: {
        zones: zones.length,
        structures: structures.length,
        paths: paths.length,
        paddocks: paddocks.length,
        crops: crops.length,
        utilities: utilities.length,
        phases: phases.length,
      },
    };
  }, [zones, structures, paths, paddocks, crops, utilities, phases]);

  const anyContent =
    bundles.totals.zones +
      bundles.totals.structures +
      bundles.totals.paths +
      bundles.totals.paddocks +
      bundles.totals.crops +
      bundles.totals.utilities +
      bundles.totals.phases >
    0;

  if (!anyContent) {
    return (
      <div className={s.card}>
        <div className={s.head}>
          <div>
            <h3 className={s.title}>Patterns from this site</h3>
            <p className={s.hint}>
              Reusable bundles will appear here as you place zones, structures, paths, paddocks,
              crops, utilities, or phases — they form the seed of a future "save as template" flow.
            </p>
          </div>
          <span className={s.badge}>EXTRACTED</span>
        </div>
        <p className={s.empty}>No design content yet — start drawing on the map and patterns will surface here automatically.</p>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Patterns from this site</h3>
          <p className={s.hint}>
            What would carry over if this project were lifted into a template — the palettes,
            mixes, and structures the next steward would inherit.
          </p>
        </div>
        <span className={s.badge}>{bundles.totals.zones + bundles.totals.structures + bundles.totals.paths + bundles.totals.paddocks + bundles.totals.crops + bundles.totals.utilities} ITEMS</span>
      </div>

      <div className={s.bundleGrid}>
        <Bundle
          title="Zone palette"
          subtitle={`${bundles.totals.zones} zones · ${bundles.zonePalette.length} categories`}
          stats={bundles.zonePalette}
          emptyHint="Draw zones to seed a category palette."
        />
        <Bundle
          title="Structure mix"
          subtitle={
            bundles.costKnown > 0
              ? `${bundles.totals.structures} placed · $${formatThousands(bundles.costTotal)} estimated (${bundles.costKnown}/${bundles.totals.structures} priced)`
              : `${bundles.totals.structures} placed · costs unestimated`
          }
          stats={bundles.structureMix}
          emptyHint="Place structures to seed a build mix."
        />
        <Bundle
          title="Path palette"
          subtitle={`${bundles.totals.paths} paths · ${bundles.pathPalette.length} classes`}
          stats={bundles.pathPalette}
          emptyHint="Draw paths to seed a circulation palette."
        />
        <Bundle
          title="Livestock set"
          subtitle={
            bundles.avgDensity !== null
              ? `${bundles.totals.paddocks} paddocks · avg ${bundles.avgDensity.toFixed(1)} head/ha`
              : `${bundles.totals.paddocks} paddocks · density unset`
          }
          stats={bundles.livestockSet}
          emptyHint="Add paddocks with species to seed a livestock pattern."
        />
        <Bundle
          title="Crop polyculture"
          subtitle={`${bundles.totals.crops} crop areas · ${bundles.cropDistinct} distinct species (top 8 shown)`}
          stats={bundles.cropTop}
          emptyHint="Draw crop areas with species to seed a polyculture pattern."
        />
        <Bundle
          title="Utility kit"
          subtitle={`${bundles.totals.utilities} utilities · ${bundles.utilityKit.length} types`}
          stats={bundles.utilityKit}
          emptyHint="Place utilities to seed an infrastructure kit."
        />
      </div>

      {bundles.phaseList.length > 0 && (
        <div className={s.phaseRow}>
          <div className={s.phaseLabel}>Phase structure</div>
          <div className={s.phaseChips}>
            {bundles.phaseList.map((ph) => (
              <span
                key={ph.id}
                className={`${s.phaseChip} ${ph.completed ? s.phaseChipDone : ''}`}
                style={{ borderLeftColor: ph.color }}
                title={ph.description || ph.name}
              >
                <span className={s.phaseChipName}>{ph.name}</span>
                <span className={s.phaseChipMeta}>{ph.timeframe}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className={s.footnote}>
        Read-only summary. The "Save as template" / governance flow lives under
        Template duplication &amp; locking (§20, planned).
      </p>
    </div>
  );
}

function Bundle({
  title,
  subtitle,
  stats,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  stats: BundleStat[];
  emptyHint: string;
}) {
  return (
    <div className={s.bundle}>
      <div className={s.bundleTitle}>{title}</div>
      <div className={s.bundleSub}>{subtitle}</div>
      {stats.length > 0 ? (
        <ul className={s.statList}>
          {stats.map((stat, i) => (
            <li key={`${stat.label}-${i}`} className={s.statRow}>
              {stat.swatch && <span className={s.swatch} style={{ background: stat.swatch }} />}
              <span className={s.statLabel}>{stat.label}</span>
              <span className={s.statCount}>{stat.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.bundleEmpty}>{emptyHint}</p>
      )}
    </div>
  );
}

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}
