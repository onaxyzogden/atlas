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

  const modules: ModuleSpec[] = useMemo(() => {
    // ── 1. Human Context ──────────────────────────────────────────────────
    // Steward survey + indigenous/regional context land in Phase 4a; for
    // now we surface vision phase notes as the closest existing signal.
    const phaseNotesFilled =
      visionData?.phaseNotes?.filter((p) => p.notes.trim().length > 0).length ?? 0;
    const stewardName =
      // Forward-compat: read optional steward field once Phase 4a lands.
      ((visionData as unknown as { steward?: { name?: string } } | undefined)?.steward?.name) ??
      null;

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
    const hazardsLog =
      (siteData as unknown as { hazardsLog?: unknown[] } | undefined)?.hazardsLog ?? [];

    const macroclimate: ModuleSpec = {
      number: '2',
      title: 'Macroclimate & Hazards',
      rows: [
        { label: 'Hardiness zone', value: nonEmpty(climate?.hardinessZone ?? null) },
        { label: 'Annual precip', value: fmtNum(climate?.annualPrecipMm, ' mm', 0) },
        { label: 'Logged hazards', value: `${hazardsLog.length}` },
      ],
      actions: [
        { label: 'Solar & Climate detail →', sectionId: 'climate' },
        { label: 'Hazards log →', sectionId: 'observe-hazards-log' },
      ],
      empty: !climate && hazardsLog.length === 0,
    };

    // ── 3. Topography & Base Map ──────────────────────────────────────────
    const elevation = siteData
      ? getLayerSummary<{
          meanSlopeDeg?: number;
          minElevationM?: number;
          maxElevationM?: number;
        }>(siteData, 'elevation')
      : null;
    const transects =
      (siteData as unknown as { transects?: unknown[] } | undefined)?.transects ?? [];

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
        { label: 'A–B transects', value: `${transects.length}` },
      ],
      actions: [
        { label: 'Terrain detail →', sectionId: 'terrain-dashboard' },
        { label: 'Cross-section tool →', sectionId: 'observe-cross-section' },
      ],
      empty: !elevation && transects.length === 0,
    };

    // ── 4. Earth, Water & Ecology Diagnostics ─────────────────────────────
    const latestSample = soilSamples[soilSamples.length - 1];
    const groundwater = siteData
      ? getLayerSummary<{ depthClass?: string; depthM?: number }>(siteData, 'groundwater')
      : null;
    const ecology =
      (siteData as unknown as {
        ecology?: { observations?: unknown[]; successionStage?: string };
      } | undefined)?.ecology;

    const diagnostics: ModuleSpec = {
      number: '4',
      title: 'Earth, Water & Ecology Diagnostics',
      rows: [
        { label: 'Latest soil pH', value: fmtNum(latestSample?.ph ?? null, '', 1) },
        {
          label: 'Groundwater',
          value: nonEmpty(groundwater?.depthClass ?? (groundwater?.depthM ? `${groundwater.depthM} m` : null)),
        },
        { label: 'Ecology obs.', value: `${ecology?.observations?.length ?? 0}` },
      ],
      actions: [
        { label: 'Hydrology detail →', sectionId: 'hydrology-dashboard' },
        { label: 'Ecological detail →', sectionId: 'ecological' },
        { label: 'Jar / Perc / Roof →', sectionId: 'observe-soil-tests' },
      ],
      empty: soilSamples.length === 0 && !groundwater && !ecology,
    };

    // ── 5. Sectors, Microclimates & Current Zones ─────────────────────────
    const sectors =
      (siteData as unknown as { sectors?: unknown[] } | undefined)?.sectors ?? [];
    const zones =
      (siteData as unknown as { zones?: unknown[] } | undefined)?.zones ?? [];

    const sectorsZones: ModuleSpec = {
      number: '5',
      title: 'Sectors, Microclimates & Zones',
      rows: [
        { label: 'Sector arrows placed', value: `${sectors.length}` },
        { label: 'Zones covered', value: `${zones.length} / 6` },
      ],
      actions: [
        { label: 'Sector compass →', sectionId: 'observe-sector-compass' },
        { label: 'Cartographic detail →', sectionId: 'cartographic' },
      ],
      empty: sectors.length === 0 && zones.length === 0,
    };

    // ── 6. SWOT Synthesis ─────────────────────────────────────────────────
    const swot =
      (siteData as unknown as {
        swotJournal?: Array<{ bucket: 'S' | 'W' | 'O' | 'T' }>;
      } | undefined)?.swotJournal ?? [];

    const counts = { S: 0, W: 0, O: 0, T: 0 };
    for (const entry of swot) counts[entry.bucket] += 1;

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
      empty: swot.length === 0,
    };

    return [humanContext, macroclimate, topography, diagnostics, sectorsZones, synthesis];
  }, [visionData, siteData, soilSamples]);

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
