/**
 * §21 MissingInformationChecklistCard — explicit "what data is missing"
 * roll-up that complements the Feasibility Checklist already on the panel.
 *
 * The existing checklist evaluates *quality* once data exists. This card
 * answers the prior question: which inputs has the steward not provided
 * yet? It rolls up project-level fields, designed entities, and fetched
 * site-data layers into a tri-state (provided / partial / missing) grid
 * with an aggregate completeness score so the steward can see at a glance
 * which gaps to fill before treating the feasibility output as final.
 *
 * Pure derivation — reads existing stores and siteData; writes nothing.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './MissingInformationChecklistCard.module.css';

interface MissingInformationChecklistCardProps {
  project: LocalProject;
}

type Status = 'provided' | 'partial' | 'missing';

interface GapItem {
  group: 'Project' | 'Design' | 'Site Data';
  label: string;
  status: Status;
  detail: string;
  why: string;
}

export default function MissingInformationChecklistCard({ project }: MissingInformationChecklistCardProps) {
  const allStructures = useStructureStore((st) => st.structures);
  const allZones = useZoneStore((st) => st.zones);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allCrops = useCropStore((st) => st.cropAreas);
  const allPaths = usePathStore((st) => st.paths);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const siteData = useSiteData(project.id);

  const items = useMemo<GapItem[]>(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const crops = allCrops.filter((c) => c.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    // Site-data layer presence checks
    const climate = siteData ? getLayerSummary(siteData, 'climate') : null;
    const elevation = siteData ? getLayerSummary(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary(siteData, 'soils') : null;
    const wetFlood = siteData ? getLayerSummary(siteData, 'wetlands_flood') : null;
    const watershed = siteData ? getLayerSummary(siteData, 'watershed') : null;
    const landCover = siteData ? getLayerSummary(siteData, 'land_cover') : null;
    const microclimate = siteData ? getLayerSummary(siteData, 'microclimate') : null;
    const habitat = siteData ? getLayerSummary(siteData, 'critical_habitat') : null;

    const out: GapItem[] = [];

    // ── Project-level inputs ───────────────────────────────────────────
    out.push({
      group: 'Project',
      label: 'Parcel boundary',
      status: project.hasParcelBoundary ? 'provided' : 'missing',
      detail: project.hasParcelBoundary ? 'Boundary geometry on file' : 'No boundary drawn or imported',
      why: 'Required for area-based calculations, setback enforcement, and every map-based feasibility check.',
    });
    out.push({
      group: 'Project',
      label: 'Property acreage',
      status: project.acreage ? 'provided' : 'missing',
      detail: project.acreage ? `${project.acreage} ha` : 'Not set',
      why: 'Drives carrying capacity, biomass, and per-acre cost rollups.',
    });
    out.push({
      group: 'Project',
      label: 'Project type',
      status: project.projectType ? 'provided' : 'missing',
      detail: project.projectType ? humanize(project.projectType) : 'Not selected',
      why: 'Vision-fit thresholds and rule weights are project-type-specific.',
    });

    // ── Designed entities ──────────────────────────────────────────────
    out.push({
      group: 'Design',
      label: 'Land zones',
      status: zones.length >= 3 ? 'provided' : zones.length > 0 ? 'partial' : 'missing',
      detail: `${zones.length} placed`,
      why: 'Zoning structures the land use mix; <3 zones leaves the analysis ambiguous.',
    });
    out.push({
      group: 'Design',
      label: 'Structures',
      status: structures.length > 0 ? 'provided' : 'missing',
      detail: `${structures.length} placed`,
      why: 'Buildings drive capital cost, septic logic, and shadow / setback rules.',
    });
    out.push({
      group: 'Design',
      label: 'Access paths',
      status: paths.some((p) => p.type === 'main_road')
        ? 'provided'
        : paths.length > 0
          ? 'partial'
          : 'missing',
      detail: paths.length > 0
        ? `${paths.length} paths · ${paths.some((p) => p.type === 'main_road') ? 'main road set' : 'no main road'}`
        : 'No paths drawn',
      why: 'Vehicle access is a Phase-1 prerequisite for almost every project type.',
    });
    out.push({
      group: 'Design',
      label: 'Utilities',
      status: utilities.length >= 3 ? 'provided' : utilities.length > 0 ? 'partial' : 'missing',
      detail: `${utilities.length} placed`,
      why: 'Water + energy + waste minimum required to score off-grid readiness.',
    });
    out.push({
      group: 'Design',
      label: 'Livestock paddocks',
      status: paddocks.length > 0 ? 'provided' : 'missing',
      detail: paddocks.length > 0 ? `${paddocks.length} paddocks` : 'None — skip if not applicable',
      why: 'Optional. Required only when the project plan includes grazing or animal husbandry.',
    });
    out.push({
      group: 'Design',
      label: 'Crop / orchard areas',
      status: crops.length > 0 ? 'provided' : 'missing',
      detail: crops.length > 0 ? `${crops.length} areas` : 'None — skip if not applicable',
      why: 'Optional. Required only when the project plan includes cultivated production.',
    });

    // ── Site-data layers ───────────────────────────────────────────────
    out.push({
      group: 'Site Data',
      label: 'Climate normals',
      status: climate ? 'provided' : 'missing',
      detail: climate ? 'Climate layer fetched' : 'Not fetched',
      why: 'Precipitation, temperature, and frost-risk feed water budget and crop scoring.',
    });
    out.push({
      group: 'Site Data',
      label: 'Elevation / terrain',
      status: elevation ? 'provided' : 'missing',
      detail: elevation ? 'Elevation layer fetched' : 'Not fetched',
      why: 'Slope and aspect drive buildability scoring and erosion risk.',
    });
    out.push({
      group: 'Site Data',
      label: 'Soils',
      status: soils ? 'provided' : 'missing',
      detail: soils ? 'Soils layer fetched' : 'Not fetched',
      why: 'Agricultural suitability and septic feasibility key inputs.',
    });
    out.push({
      group: 'Site Data',
      label: 'Wetlands / flood',
      status: wetFlood ? 'provided' : 'missing',
      detail: wetFlood ? 'Wetlands & flood layer fetched' : 'Not fetched',
      why: 'Surfaces blocking constraints (AE flood zones, provincially significant wetlands).',
    });
    out.push({
      group: 'Site Data',
      label: 'Watershed',
      status: watershed ? 'provided' : 'missing',
      detail: watershed ? 'Watershed layer fetched' : 'Not fetched',
      why: 'Catchment area for hydrology rollups.',
    });
    out.push({
      group: 'Site Data',
      label: 'Land cover',
      status: landCover ? 'provided' : 'missing',
      detail: landCover ? 'Land cover fetched' : 'Not fetched',
      why: 'Forest / pasture / impervious mix shapes most ecological scores.',
    });
    out.push({
      group: 'Site Data',
      label: 'Microclimate',
      status: microclimate ? 'provided' : 'missing',
      detail: microclimate ? 'Microclimate fetched' : 'Not fetched',
      why: 'Sun-trap and frost-pocket detection for siting recommendations.',
    });
    out.push({
      group: 'Site Data',
      label: 'Critical habitat',
      status: habitat ? 'provided' : 'missing',
      detail: habitat ? 'Habitat layer fetched' : 'Not fetched',
      why: 'Endangered-species range overlap is a regulatory blocker.',
    });

    return out;
  }, [
    project,
    siteData,
    allStructures,
    allZones,
    allPaddocks,
    allCrops,
    allPaths,
    allUtilities,
  ]);

  const provided = items.filter((i) => i.status === 'provided').length;
  const partial = items.filter((i) => i.status === 'partial').length;
  const missing = items.filter((i) => i.status === 'missing').length;
  const completeness = Math.round(((provided + partial * 0.5) / items.length) * 100);

  const grouped: Record<GapItem['group'], GapItem[]> = {
    Project: items.filter((i) => i.group === 'Project'),
    Design: items.filter((i) => i.group === 'Design'),
    'Site Data': items.filter((i) => i.group === 'Site Data'),
  };

  const completenessTone =
    completeness >= 70 ? css.toneGood : completeness >= 40 ? css.toneFair : css.tonePoor;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Missing Information Checklist</h3>
          <p className={css.cardHint}>
            Inputs the steward has not yet provided. Treat the feasibility analysis as preliminary until completeness
            climbs above ~70% — earlier than that, the absence of data drives the result more than the data itself.
          </p>
        </div>
        <span className={css.heuristicBadge}>INPUT GAPS</span>
      </div>

      <div className={css.summaryRow}>
        <div className={css.completenessBlock}>
          <div className={css.completenessLabel}>Input completeness</div>
          <div className={`${css.completenessValue} ${completenessTone}`}>{completeness}%</div>
        </div>
        <div className={css.statRow}>
          <Stat label="Provided" value={provided} tone={css.toneGood} />
          <Stat label="Partial" value={partial} tone={css.toneFair} />
          <Stat label="Missing" value={missing} tone={css.tonePoor} />
        </div>
      </div>

      {(['Project', 'Design', 'Site Data'] as const).map((group) => (
        <div key={group} className={css.section}>
          <div className={css.sectionTitle}>{group}</div>
          <ul className={css.gapList}>
            {grouped[group].map((it) => (
              <li key={it.label} className={`${css.gapRow} ${css[`gap_${it.status}`]}`}>
                <div className={css.gapHead}>
                  <span className={css.gapLabel}>{it.label}</span>
                  <span className={css.gapStatus}>{statusLabel(it.status)}</span>
                </div>
                <div className={css.gapDetail}>{it.detail}</div>
                <div className={css.gapWhy}>{it.why}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        "Provided" means the input is present; quality of the input is judged separately by the Feasibility Checklist
        above. Layers tagged as <em>missing</em> can be fetched from the Site Data panel; designed entities are
        added on the Map canvas.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string | undefined }) {
  return (
    <div className={css.stat}>
      <div className={`${css.statValue} ${tone}`}>{value}</div>
      <div className={css.statLabel}>{label}</div>
    </div>
  );
}

function statusLabel(s: Status): string {
  return s === 'provided' ? '✓ Provided' : s === 'partial' ? '~ Partial' : '✗ Missing';
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
