/**
 * §3 SiteNarrativeSummaryCard — Risk / Opportunity / Limitation narrative
 * trio derived from the actually-placed design state.
 *
 * SiteAssessmentPanel already surfaces a "Site Flags" list, but those flags
 * come from project metadata only (acreage, climate region, parcel
 * boundary). Once a steward has drawn zones, placed structures and water
 * utilities, sketched paddocks and crop areas — the design itself reveals
 * far more concrete risks (high-stocking paddock, no water utility within
 * carry distance, bare-stage erosion zone), opportunities (multi-phase
 * plan, water-retention zones drawn, conservation acreage), and
 * limitations (single-phase plan, no paths drawn, very small parcel).
 *
 * This card walks the project's stores and produces a plain-language
 * trio of bullet lists so a steward can read the design back to themselves
 * before locking it in. Pure presentation. No new shared math, no map
 * writes, no entity changes.
 */
import { useMemo } from 'react';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../store/utilityStore.js';
import { usePathStore, type DesignPath } from '../../store/pathStore.js';
import { useCropStore, type CropArea } from '../../store/cropStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import css from './SiteNarrativeSummaryCard.module.css';

interface Props {
  project: LocalProject;
}

type Bucket = 'risk' | 'opportunity' | 'limitation';

interface NarrativeItem {
  bucket: Bucket;
  title: string;
  body: string;
}

const WATER_UTIL_TYPES: ReadonlySet<UtilityType> = new Set<UtilityType>([
  'well_pump',
  'water_tank',
  'rain_catchment',
]);

const HABITABLE_STRUCTURE_TYPES = new Set<string>([
  'cabin',
  'yurt',
  'greenhouse',
  'bathhouse',
  'prayer_space',
  'classroom',
  'earthship',
  'pavilion',
  'workshop',
  'tent_glamping',
]);

const M_PER_DEG_LAT = 111_320;

function distanceMetres(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dxM = (b[0] - a[0]) * M_PER_DEG_LAT * Math.cos(meanLatRad);
  const dyM = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.hypot(dxM, dyM);
}

function pluralise(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;
}

function buildNarrative(args: {
  project: LocalProject;
  zones: LandZone[];
  structures: Structure[];
  paddocks: Paddock[];
  utilities: Utility[];
  paths: DesignPath[];
  crops: CropArea[];
}): NarrativeItem[] {
  const { project, zones, structures, paddocks, utilities, paths, crops } = args;
  const items: NarrativeItem[] = [];

  const waterUtils = utilities.filter((u) => WATER_UTIL_TYPES.has(u.type));
  const acreage = project.acreage ?? null;

  // ── Opportunities ──────────────────────────────────────────────────
  const phaseSet = new Set<string>([
    ...structures.map((s) => s.phase).filter(Boolean),
  ]);
  if (phaseSet.size >= 2) {
    items.push({
      bucket: 'opportunity',
      title: `Multi-phase build plan (${pluralise(phaseSet.size, 'phase')})`,
      body: 'Capital and labour can be sequenced rather than front-loaded — finance carries less risk and earlier phases can fund later ones once the cashflow turns positive.',
    });
  }

  const waterRetentionZones = zones.filter((z) => z.category === 'water_retention');
  if (waterRetentionZones.length > 0) {
    const ha = waterRetentionZones.reduce((s, z) => s + (z.areaM2 ?? 0), 0) / 10_000;
    items.push({
      bucket: 'opportunity',
      title: `Water-retention storage drawn (${ha.toFixed(2)} ha)`,
      body: 'Designated retention zones absorb storm pulses, recharge subsurface flow, and create a passive irrigation buffer for the dry months — leverage these as the seasonal-storage backbone before sizing any tanks.',
    });
  }

  const conservationZones = zones.filter((z) => z.category === 'conservation');
  if (conservationZones.length > 0) {
    const ha = conservationZones.reduce((s, z) => s + (z.areaM2 ?? 0), 0) / 10_000;
    items.push({
      bucket: 'opportunity',
      title: `Conservation acreage protected (${ha.toFixed(2)} ha)`,
      body: 'Habitat continuity is the highest-leverage input for pollinator and pest-predator services across the rest of the parcel — treat these as the ecological savings account.',
    });
  }

  const categoryCount = new Set(zones.map((z) => z.category)).size;
  if (categoryCount >= 5) {
    items.push({
      bucket: 'opportunity',
      title: `Diverse program (${categoryCount} zone categories)`,
      body: 'A multi-program parcel hedges against single-enterprise failure and enables resident-and-guest schedules that share infrastructure across uses.',
    });
  }

  const cropSpeciesSet = new Set<string>();
  for (const c of crops) for (const sp of c.species ?? []) cropSpeciesSet.add(sp);
  if (cropSpeciesSet.size >= 4) {
    items.push({
      bucket: 'opportunity',
      title: `Crop polyculture (${cropSpeciesSet.size} species across ${pluralise(crops.length, 'area')})`,
      body: 'Species diversity in the food-production blocks improves soil-life resilience and spreads harvest risk — keep the rotation log current to lock in successional benefits.',
    });
  }

  if (paddocks.length >= 2) {
    items.push({
      bucket: 'opportunity',
      title: `Paddock rotation possible (${pluralise(paddocks.length, 'paddock')})`,
      body: 'Two or more drawn paddocks unlock rotational grazing — pair with a rest schedule in the Grazing dashboard to avoid both overgrazing and pasture stagnation.',
    });
  }

  // ── Risks ──────────────────────────────────────────────────────────
  const overstocked = paddocks.filter((p) => (p.stockingDensity ?? 0) >= 14);
  if (overstocked.length > 0) {
    items.push({
      bucket: 'risk',
      title: `Overstocked paddocks (${pluralise(overstocked.length, 'paddock')})`,
      body: `Paddocks above 14 head/ha (${overstocked
        .map((p) => p.name)
        .join(', ')}) compact topsoil quickly. Move animals on a tight rotation, rest aggressively, or split the paddock before the soil-test results swing the wrong way.`,
    });
  }

  if (waterUtils.length === 0 && structures.length > 0) {
    items.push({
      bucket: 'risk',
      title: 'No water utility placed',
      body: 'Habitable structures and crop areas need a defined water source. Place at least one well, tank, or rain-catchment before the next site visit so utility runs are sized into the cost plan.',
    });
  }

  const bareZones = zones.filter((z) => z.successionStage === 'bare');
  if (bareZones.length > 0) {
    items.push({
      bucket: 'risk',
      title: `Bare-stage erosion exposure (${pluralise(bareZones.length, 'zone')})`,
      body: 'Every storm event on bare ground exports topsoil. Cover-crop, mulch, or temporarily exclude livestock until pioneer succession is re-established.',
    });
  }

  const highInvasive = zones.filter((z) => z.invasivePressure === 'high');
  if (highInvasive.length > 0) {
    items.push({
      bucket: 'risk',
      title: `High invasive pressure (${pluralise(highInvasive.length, 'zone')})`,
      body: 'Aggressive invasives outcompete pioneer natives — schedule cutting / smothering before the next growing window or budget for a remediation pass.',
    });
  }

  if (waterUtils.length > 0) {
    const dryHabitable: string[] = [];
    for (const s of structures) {
      if (!HABITABLE_STRUCTURE_TYPES.has(s.type as string)) continue;
      let nearestM = Infinity;
      for (const u of waterUtils) {
        const d = distanceMetres(s.center, u.center);
        if (d < nearestM) nearestM = d;
      }
      if (nearestM > 250) dryHabitable.push(`${s.name} (${Math.round(nearestM)} m)`);
    }
    if (dryHabitable.length > 0) {
      items.push({
        bucket: 'risk',
        title: `Habitable structures > 250 m from water (${dryHabitable.length})`,
        body: `Carry distance is excessive for daily use: ${dryHabitable.join('; ')}. Plan a closer tap, rain-catchment, or distribution loop before occupancy.`,
      });
    }
  }

  if (zones.length > 0 && zones.every((z) => z.category !== 'buffer')) {
    items.push({
      bucket: 'risk',
      title: 'No buffer / setback zone drawn',
      body: 'Buffers absorb noise, dust, traffic, and neighbour-boundary pressure. Even a thin perimeter buffer reduces conflict risk and protects the interior program.',
    });
  }

  // ── Limitations ────────────────────────────────────────────────────
  if (acreage !== null && acreage < 5) {
    items.push({
      bucket: 'limitation',
      title: `Small parcel (${acreage.toFixed(1)} acres)`,
      body: 'Below ~5 acres, livestock grazing rotations stay tight and mature canopy plantings consume disproportionate area. Lean toward intensive small-systems (market garden, orchard, micro-livestock) rather than extensive grazing.',
    });
  }

  if (project.parcelBoundaryGeojson == null) {
    items.push({
      bucket: 'limitation',
      title: 'Parcel boundary not captured',
      body: 'Without a drawn or imported boundary, area-based scores fall back to the manually entered acreage and per-zone proximity tests can spill outside the property line. Import the parcel before publishing the plan.',
    });
  }

  if (zones.length < 3) {
    items.push({
      bucket: 'limitation',
      title: `Few zones drawn (${zones.length})`,
      body: 'A useful zoning plan typically needs at least habitation, food-production, and one of livestock / commons / buffer. Add more zones before drawing structures into them.',
    });
  }

  if (paths.length === 0) {
    items.push({
      bucket: 'limitation',
      title: 'No paths drawn',
      body: 'Access tracks, footpaths, and laneways are the connective tissue of the design. Without them the cost plan understates earthworks and circulation cannot be evaluated.',
    });
  }

  if (phaseSet.size <= 1) {
    items.push({
      bucket: 'limitation',
      title: 'Single-phase build plan',
      body: 'All structures are tagged to one phase. Stagger-order high-cost items (residence, barn, water infrastructure) into multiple phases so cashflow can carry the plan rather than upfront capital.',
    });
  }

  return items;
}

const BUCKET_LABEL: Record<Bucket, string> = {
  risk: 'Risks',
  opportunity: 'Opportunities',
  limitation: 'Limitations',
};

const BUCKET_ICON: Record<Bucket, string> = {
  risk: '\u26A0',         // ⚠
  opportunity: '\u2726',  // ✦
  limitation: '\u25C6',   // ◆
};

export default function SiteNarrativeSummaryCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);
  const allCrops = useCropStore((s) => s.cropAreas);

  const items = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === project.id);
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const crops = allCrops.filter((c) => c.projectId === project.id);
    return buildNarrative({ project, zones, structures, paddocks, utilities, paths, crops });
  }, [project, allZones, allStructures, allPaddocks, allUtilities, allPaths, allCrops]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, NarrativeItem[]> = { risk: [], opportunity: [], limitation: [] };
    for (const it of items) g[it.bucket].push(it);
    return g;
  }, [items]);

  const totalSignals = items.length;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Site Narrative Summary</h3>
          <p className={css.hint}>
            Plain-language read-back of the design state — opportunities to
            lean into, risks to address, and limitations to acknowledge.
            Derived from drawn zones, placed structures, water utilities,
            paddocks, paths, crops, and project metadata.
          </p>
        </div>
        <span className={css.badge}>
          {grouped.opportunity.length} OPP · {grouped.risk.length} RISK · {grouped.limitation.length} LIM
        </span>
      </div>

      {totalSignals === 0 ? (
        <div className={css.empty}>
          Not enough design state placed to produce a narrative — draw a few
          zones, place water and habitable structures, and the summary will
          surface as the design fills in.
        </div>
      ) : (
        <div className={css.bucketCol}>
          {(['opportunity', 'risk', 'limitation'] as Bucket[]).map((b) => (
            <section key={b} className={`${css.bucket} ${css[`bucket_${b}`]}`}>
              <h4 className={css.bucketTitle}>
                <span className={css.bucketIcon}>{BUCKET_ICON[b]}</span>
                {BUCKET_LABEL[b]} ({grouped[b].length})
              </h4>
              {grouped[b].length === 0 ? (
                <p className={css.bucketEmpty}>None surfaced from current design state.</p>
              ) : (
                <ul className={css.itemList}>
                  {grouped[b].map((it, i) => (
                    <li key={i} className={css.item}>
                      <span className={css.itemTitle}>{it.title}</span>
                      <span className={css.itemBody}>{it.body}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <p className={css.footnote}>
        Heuristics only — thresholds (≥ 5 zone categories for "diverse
        program", &gt; 14 head/ha for "overstocked", &gt; 250 m for water-carry
        risk) are deliberate first-pass rules. Disagree with a flag? Treat
        it as a prompt to revisit the field, not a constraint to satisfy.
      </p>
    </div>
  );
}
