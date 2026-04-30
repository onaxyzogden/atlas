/**
 * ObserveHub — landing surface for the OBSERVE stage of the 3-stage cycle.
 *
 * Hybrid IA: this Hub summarises six observation modules and links into
 * existing detail dashboards (Site Intelligence, Terrain, Hydrology, etc.).
 * The Hub is the default landing when the user clicks "Observe" in the
 * stage3-grouped sidebar; detail dashboards remain reachable from the same
 * accordion below this entry.
 *
 * Each module card pulls a short summary from existing stores. New fields
 * introduced in later phases (steward survey, hazards log, sector arrows,
 * SWOT journal) are read defensively — the card shows an empty state when
 * the data has not been captured yet.
 *
 * Modules mirror the spec section numbering:
 *   1. Human Context              → vision/visionStore
 *   2. Macroclimate & Hazards     → siteDataStore (climate layer + hazardsLog)
 *   3. Topography & Base Map      → siteDataStore (elevation layer)
 *   4. Earth/Water/Ecology Diag.  → soilSampleStore + siteDataStore
 *   5. Sectors, Microclimates,    → siteDataStore (sectors[]) + zone overlays
 *      Current Zones
 *   6. SWOT Synthesis             → siteDataStore (swotJournal[])
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { useSiteDataStore, getLayerSummary, type SiteData } from '../../store/siteDataStore.js';
import { useSoilSampleStore } from '../../store/soilSampleStore.js';
import { useEcologyStore } from '../../store/ecologyStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useSwotStore } from '../../store/swotStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import styles from './ObserveHub.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void; // contract-compliance — unused by this page
}

interface ModuleAction {
  label: string;
  /** Dashboard section id to switch to (via uiStore.setActiveDashboardSection). */
  sectionId: string;
}

interface SummaryRow {
  label: string;
  value: string;
}

interface ModuleSpec {
  number: string;
  title: string;
  rows: SummaryRow[];
  actions: ModuleAction[];
  empty?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined, suffix = '', digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${digits === 0 ? Math.round(n) : n.toFixed(digits)}${suffix}`;
}

function nonEmpty(s: string | null | undefined): string {
  return s && s.trim().length > 0 ? s : '—';
}

// Soil-sample reads are a stable selector once we filter by project.
function useProjectSoilSamples(projectId: string) {
  const samples = useSoilSampleStore((s) => s.samples);
  return useMemo(() => samples.filter((x) => x.projectId === projectId), [samples, projectId]);
}

function useProjectSiteData(projectId: string): SiteData | undefined {
  return useSiteDataStore((s) => s.dataByProject[projectId]);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ObserveHub({ project }: Props) {
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  const visionData = useVisionStore((s) => s.getVisionData(project.id));
  const siteData = useProjectSiteData(project.id);
  const soilSamples = useProjectSoilSamples(project.id);

  // Phase 4b–4f: persisted steward annotations (hazards, transects,
  // sectors, ecology, swot). Each filtered to the active project.
  const allHazards   = useExternalForcesStore((s) => s.hazards);
  const allTransects = useTopographyStore((s) => s.transects);
  const allSectors   = useExternalForcesStore((s) => s.sectors);
  const allEcology   = useEcologyStore((s) => s.ecology);
  const allSwot      = useSwotStore((s) => s.swot);

  const projectHazards   = useMemo(() => allHazards.filter((h)   => h.projectId === project.id), [allHazards, project.id]);
  const projectTransects = useMemo(() => allTransects.filter((t) => t.projectId === project.id), [allTransects, project.id]);
  const projectSectors   = useMemo(() => allSectors.filter((x)   => x.projectId === project.id), [allSectors, project.id]);
  const projectEcology   = useMemo(() => allEcology.filter((o)   => o.projectId === project.id), [allEcology, project.id]);
  const projectSwot      = useMemo(() => allSwot.filter((e)      => e.projectId === project.id), [allSwot, project.id]);

  const modules: ModuleSpec[] = useMemo(() => {
    // ── 1. Human Context ──────────────────────────────────────────────────
    // Steward survey + indigenous/regional context land in Phase 4a; for
    // now we surface vision phase notes as the closest existing signal.
    const phaseNotesFilled =
      visionData?.phaseNotes?.filter((p) => p.notes.trim().length > 0).length ?? 0;
    const stewardName = visionData?.steward?.name ?? null;

    const humanContext: ModuleSpec = {
      number: '1',
      title: 'Human Context',
      rows: [
        { label: 'Steward', value: nonEmpty(stewardName) },
        { label: 'Vision phases captured', value: `${phaseNotesFilled} / 3` },
        { label: 'Milestones', value: `${visionData?.milestones?.length ?? 0}` },
      ],
      actions: [
        { label: 'Open Steward Survey →', sectionId: 'observe-steward-survey' },
        { label: 'Vision detail →', sectionId: 'vision' },
      ],
      empty: phaseNotesFilled === 0 && !stewardName,
    };

    // ── 2. Macroclimate & Hazards ─────────────────────────────────────────
    const climate = siteData
      ? getLayerSummary<{
          hardinessZone?: string;
          annualPrecipMm?: number;
          growingSeasonDays?: number;
        }>(siteData, 'climate')
      : null;
    const macroclimate: ModuleSpec = {
      number: '2',
      title: 'Macroclimate & Hazards',
      rows: [
        { label: 'Hardiness zone', value: nonEmpty(climate?.hardinessZone ?? null) },
        { label: 'Annual precip', value: fmtNum(climate?.annualPrecipMm, ' mm', 0) },
        { label: 'Logged hazards', value: `${projectHazards.length}` },
      ],
      actions: [
        { label: 'Solar & Climate detail →', sectionId: 'climate' },
        { label: 'Hazards log →', sectionId: 'observe-hazards-log' },
      ],
      empty: !climate && projectHazards.length === 0,
    };

    // ── 3. Topography & Base Map ──────────────────────────────────────────
    const elevation = siteData
      ? getLayerSummary<{
          meanSlopeDeg?: number;
          minElevationM?: number;
          maxElevationM?: number;
        }>(siteData, 'elevation')
      : null;
    const elevRange =
      elevation?.minElevationM !== undefined && elevation?.maxElevationM !== undefined
        ? `${Math.round(elevation.minElevationM)}–${Math.round(elevation.maxElevationM)} m`
        : '—';

    const topography: ModuleSpec = {
      number: '3',
      title: 'Topography & Base Map',
      rows: [
        { label: 'Mean slope', value: fmtNum(elevation?.meanSlopeDeg, '°', 1) },
        { label: 'Elevation range', value: elevRange },
        { label: 'A–B transects', value: `${projectTransects.length}` },
      ],
      actions: [
        { label: 'Terrain detail →', sectionId: 'terrain-dashboard' },
        { label: 'Cross-section tool →', sectionId: 'observe-cross-section' },
      ],
      empty: !elevation && projectTransects.length === 0,
    };

    // ── 4. Earth, Water & Ecology Diagnostics ─────────────────────────────
    const latestSample = soilSamples[soilSamples.length - 1];
    const groundwater = siteData
      ? getLayerSummary<{ depthClass?: string; depthM?: number }>(siteData, 'groundwater')
      : null;
    const diagnostics: ModuleSpec = {
      number: '4',
      title: 'Earth, Water & Ecology Diagnostics',
      rows: [
        { label: 'Latest soil pH', value: fmtNum(latestSample?.ph ?? null, '', 1) },
        {
          label: 'Groundwater',
          value: nonEmpty(groundwater?.depthClass ?? (groundwater?.depthM ? `${groundwater.depthM} m` : null)),
        },
        { label: 'Ecology obs.', value: `${projectEcology.length}` },
      ],
      actions: [
        { label: 'Hydrology detail →', sectionId: 'hydrology-dashboard' },
        { label: 'Ecological detail →', sectionId: 'ecological' },
        { label: 'Jar / Perc / Roof →', sectionId: 'observe-soil-tests' },
      ],
      empty: soilSamples.length === 0 && !groundwater && projectEcology.length === 0,
    };

    // ── 5. Sectors, Microclimates & Current Zones ─────────────────────────
    const sectorsZones: ModuleSpec = {
      number: '5',
      title: 'Sectors, Microclimates & Zones',
      rows: [
        { label: 'Sector arrows placed', value: `${projectSectors.length}` },
      ],
      actions: [
        { label: 'Sector compass →', sectionId: 'observe-sector-compass' },
        { label: 'Cartographic detail →', sectionId: 'cartographic' },
      ],
      empty: projectSectors.length === 0,
    };

    // ── 6. SWOT Synthesis ─────────────────────────────────────────────────
    const counts = { S: 0, W: 0, O: 0, T: 0 };
    for (const entry of projectSwot) counts[entry.bucket] += 1;

    const synthesis: ModuleSpec = {
      number: '6',
      title: 'SWOT Synthesis',
      rows: [
        { label: 'Strengths',  value: `${counts.S}` },
        { label: 'Weaknesses', value: `${counts.W}` },
        { label: 'Opportunities', value: `${counts.O}` },
        { label: 'Threats',    value: `${counts.T}` },
      ],
      actions: [
        { label: 'SWOT journal →', sectionId: 'observe-swot-journal' },
        { label: 'Diagnosis report →', sectionId: 'observe-diagnosis-report' },
      ],
      empty: projectSwot.length === 0,
    };

    return [humanContext, macroclimate, topography, diagnostics, sectorsZones, synthesis];
  }, [visionData, siteData, soilSamples, projectHazards, projectTransects, projectSectors, projectEcology, projectSwot]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Stage 1 of 3 · Roots & Diagnosis</span>
        <h1 className={styles.title}>Observe — read the land before designing it.</h1>
        <p className={styles.lede}>
          Six modules of protracted, thoughtful observation. Capture human context,
          macroclimate, topography, earth/water/ecology diagnostics, sectors and zones,
          and a continuous SWOT journal. Each card summarises what you have so far and
          links to the detail surface.
        </p>
        <span className={styles.principle}>P1 · Observe and Interact</span>
      </header>

      <div className={styles.grid}>
        {modules.map((m) => (
          <section key={m.number} className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardNumber}>Module {m.number}</span>
            </header>
            <h2 className={styles.cardTitle}>{m.title}</h2>

            {m.empty ? (
              <p className={styles.empty}>No data captured yet — start with the linked tools below.</p>
            ) : (
              <ul className={styles.summaryList}>
                {m.rows.map((r) => (
                  <li key={r.label} className={styles.summaryRow}>
                    <span>{r.label}</span>
                    <span>{r.value}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.cardActions}>
              {m.actions.map((a) => (
                <button
                  key={a.sectionId}
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setSection(a.sectionId)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
