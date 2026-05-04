/**
 * PlanHub — landing surface for the PLAN stage of the 3-stage cycle.
 *
 * Mirrors `features/observe/ObserveHub.tsx`. The Hub summarises the eight
 * design modules called out in the regenerative-design Planning spec and
 * links into the existing detail dashboards plus the new PLAN-stage cards
 * shipping in subsequent phases. Modules are 1-indexed end-to-end (UI,
 * docs, and data) — the source spec's section numbering (which starts at
 * §2 because §1 is the executive summary) is intentionally NOT preserved
 * here; if you need to cross-reference the spec, Module N maps to spec
 * section §(N+1):
 *
 *   Module 1  Dynamic Layering          → existing overlays + PermanenceScalesCard
 *   Module 2  Water Management          → Hydrology + RunoffCalculator/Swale/Storage
 *   Module 3  Zone & Circulation        → zoneStore/pathStore + ZoneLevel + PathFreq
 *   Module 4  Plant Systems             → planting/forest hubs + PlantDB/Guild/Canopy
 *   Module 5  Soil Fertility            → SoilFertilityDesigner + WasteVectorTool
 *   Module 6  Cross-section + Solar     → CrossSectionTool + Vertical/SolarOverlay
 *   Module 7  Phasing & Budgeting       → phaseStore + PhasingMatrix/SeasonalTask
 *   Module 8  Principle Verification    → HolmgrenChecklist
 *
 * Selector discipline: every store read uses subscribe-then-derive (raw
 * field selector + useMemo) per ADR `2026-04-26-zustand-selector-stability`.
 * Phase-3 surfaces (guilds, earthworks, waste vectors, species picks,
 * principle checks, phase tasks) are not yet persisted; their counts are
 * hardcoded to zero here and will light up as those stores extend.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePrincipleCheckStore } from '../../store/principleCheckStore.js';
import styles from './PlanHub.module.css';

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
  /** 1-based module index. Used in the card chrome (`Module 1` … `Module 8`)
   *  and as the canonical identifier everywhere — internal references,
   *  data, and UI all share this 1-indexed scheme. The source spec's
   *  §-numbering (offset by one) is documented in the file header but
   *  intentionally not surfaced anywhere callable. */
  number: string;
  title: string;
  rows: SummaryRow[];
  actions: ModuleAction[];
  empty?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number, suffix = ''): string {
  return `${n}${suffix}`;
}

export default function PlanHub({ project }: Props) {
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  // Subscribe-then-derive: raw store fields only; per-project slices in useMemo.
  const allTransects      = useTopographyStore((s) => s.transects);
  const allEarthworks     = useWaterSystemsStore((s) => s.earthworks);
  const allStorageInfra   = useWaterSystemsStore((s) => s.storageInfra);
  const allFertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const allGuilds         = usePolycultureStore((s) => s.guilds);
  const allWasteVectors   = useClosedLoopStore((s) => s.wasteVectors);
  const allSpecies        = usePolycultureStore((s) => s.species);

  const allZones      = useZoneStore((s) => s.zones);
  const allPaths      = usePathStore((s) => s.paths);
  const allCrops      = useCropStore((s) => s.cropAreas);
  const phases        = usePhaseStore((s) => s.phases);
  const principleChecksByProject = usePrincipleCheckStore((s) => s.byProject);

  const projectTransects      = useMemo(() => allTransects.filter((t) => t.projectId === project.id), [allTransects, project.id]);
  const projectEarthworks     = useMemo(() => allEarthworks.filter((e) => e.projectId === project.id), [allEarthworks, project.id]);
  const projectStorageInfra   = useMemo(() => allStorageInfra.filter((i) => i.projectId === project.id), [allStorageInfra, project.id]);
  const projectFertilityInfra = useMemo(() => allFertilityInfra.filter((i) => i.projectId === project.id), [allFertilityInfra, project.id]);
  const projectGuilds         = useMemo(() => allGuilds.filter((g) => g.projectId === project.id), [allGuilds, project.id]);
  const projectWasteVectors   = useMemo(() => allWasteVectors.filter((v) => v.projectId === project.id), [allWasteVectors, project.id]);
  const projectSpecies        = useMemo(() => allSpecies.filter((s) => s.projectId === project.id), [allSpecies, project.id]);
  const projectZones          = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const projectPaths          = useMemo(() => allPaths.filter((p) => p.projectId === project.id), [allPaths, project.id]);
  const projectCrops          = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const projectPrinciples     = useMemo(() => principleChecksByProject[project.id] ?? {}, [principleChecksByProject, project.id]);

  const modules: ModuleSpec[] = useMemo(() => {
    // ── Module 1 — Dynamic Layering ─────────────────────────────────────────
    const layering: ModuleSpec = {
      number: '1',
      title: 'Dynamic Layering & Permanence',
      rows: [
        { label: 'Map overlays available', value: '8' },
        { label: 'Permanence scales', value: 'See checklist' },
      ],
      actions: [
        { label: 'Permanence scales →', sectionId: 'plan-permanence-scales' },
        { label: 'Cartographic detail →', sectionId: 'cartographic' },
      ],
    };

    // ── Module 2 — Water Management ─────────────────────────────────────────
    const water: ModuleSpec = {
      number: '2',
      title: 'Water Management',
      rows: [
        { label: 'Swales / drains', value: fmtCount(projectEarthworks.length) },
        { label: 'Storage points', value: fmtCount(projectStorageInfra.length) },
        { label: 'Runoff calc', value: 'Open card →' },
      ],
      actions: [
        { label: 'Runoff calculator →', sectionId: 'plan-runoff-calculator' },
        { label: 'Swale / drain tool →', sectionId: 'plan-swale-drain' },
        { label: 'Storage placement →', sectionId: 'plan-storage-infra' },
        { label: 'Hydrology detail →', sectionId: 'hydrology-dashboard' },
      ],
      empty: projectEarthworks.length === 0 && projectStorageInfra.length === 0,
    };

    // ── Module 3 — Zone & Circulation ───────────────────────────────────────
    const zoneLevels = new Set(
      projectZones
        .map((z) => (z as { permacultureZone?: number }).permacultureZone)
        .filter((n): n is number => typeof n === 'number'),
    );
    const zoneCirc: ModuleSpec = {
      number: '3',
      title: 'Zone & Circulation',
      rows: [
        { label: 'Zone polygons', value: fmtCount(projectZones.length) },
        { label: 'Zone levels assigned', value: `${zoneLevels.size} / 6` },
        { label: 'Paths drawn', value: fmtCount(projectPaths.length) },
      ],
      actions: [
        { label: 'Zone level layer →', sectionId: 'plan-zone-level' },
        { label: 'Path frequency →', sectionId: 'plan-path-frequency' },
        { label: 'Paddock design →', sectionId: 'paddock-design' },
      ],
      empty: projectZones.length === 0 && projectPaths.length === 0,
    };

    // ── Module 4 — Plant Systems & Polyculture ──────────────────────────────
    const plant: ModuleSpec = {
      number: '4',
      title: 'Plant Systems & Polyculture',
      rows: [
        { label: 'Crop / orchard areas', value: fmtCount(projectCrops.length) },
        { label: 'Species picked', value: fmtCount(projectSpecies.length) },
        { label: 'Guilds composed', value: fmtCount(projectGuilds.length) },
      ],
      actions: [
        { label: 'Plant database →', sectionId: 'plan-plant-database' },
        { label: 'Guild builder →', sectionId: 'plan-guild-builder' },
        { label: 'Canopy simulator →', sectionId: 'plan-canopy-simulator' },
        { label: 'Planting tool →', sectionId: 'planting-tool' },
      ],
      empty: projectCrops.length === 0,
    };

    // ── Module 5 — Soil Fertility & Closed-Loop ─────────────────────────────
    const soil: ModuleSpec = {
      number: '5',
      title: 'Soil Fertility & Closed-Loop',
      rows: [
        { label: 'Fertility points', value: fmtCount(projectFertilityInfra.length) },
        { label: 'Waste vectors', value: fmtCount(projectWasteVectors.length) },
      ],
      actions: [
        { label: 'Soil fertility designer →', sectionId: 'plan-soil-fertility' },
        { label: 'Waste-to-resource vectors →', sectionId: 'plan-waste-vectors' },
      ],
      empty: projectFertilityInfra.length === 0 && projectWasteVectors.length === 0,
    };

    // ── Module 6 — Cross-section & Solar ────────────────────────────────────
    const transectsWithVerticals = projectTransects.filter((t) => {
      const v = (t as { verticalElements?: unknown[] }).verticalElements;
      return Array.isArray(v) && v.length > 0;
    }).length;
    const cross: ModuleSpec = {
      number: '6',
      title: 'Cross-section & Solar Geometry',
      rows: [
        { label: 'Saved transects', value: fmtCount(projectTransects.length) },
        { label: 'With vertical elements', value: fmtCount(transectsWithVerticals) },
      ],
      actions: [
        { label: 'Vertical editor →', sectionId: 'plan-transect-vertical' },
        { label: 'Solar overlay →', sectionId: 'plan-solar-overlay' },
        { label: 'Cross-section tool →', sectionId: 'observe-cross-section' },
      ],
      empty: projectTransects.length === 0,
    };

    // ── Module 7 — Phasing & Budgeting ──────────────────────────────────────
    const phasesWithTasks = phases.filter((p) => {
      const t = (p as { tasks?: unknown[] }).tasks;
      return Array.isArray(t) && t.length > 0;
    }).length;
    const totalLaborHrs = phases.reduce((acc, p) => {
      const tasks = (p as { tasks?: Array<{ laborHrs?: number }> }).tasks ?? [];
      return acc + tasks.reduce((sum, t) => sum + (t.laborHrs ?? 0), 0);
    }, 0);
    const phasing: ModuleSpec = {
      number: '7',
      title: 'Phasing & Budgeting',
      rows: [
        { label: 'Phases defined', value: fmtCount(phases.length) },
        { label: 'Phases with tasks', value: `${phasesWithTasks} / ${phases.length || 0}` },
        { label: 'Est. labor hours', value: fmtCount(totalLaborHrs, ' h') },
      ],
      actions: [
        { label: '5-year matrix →', sectionId: 'plan-phasing-matrix' },
        { label: 'Seasonal tasks →', sectionId: 'plan-seasonal-tasks' },
        { label: 'Labor + budget →', sectionId: 'plan-labor-budget' },
        { label: 'Timeline / phasing →', sectionId: 'timeline-phasing' },
      ],
      empty: phases.length === 0,
    };

    // ── Module 8 — Principle Verification ───────────────────────────────────
    const principleEntries = Object.values(projectPrinciples);
    const metCount = principleEntries.filter((e) => e.status === 'met').length;
    const principles: ModuleSpec = {
      number: '8',
      title: 'Holmgren Principle Verification',
      rows: [
        { label: 'Principles met', value: `${metCount} / 12` },
        { label: 'Justifications captured', value: fmtCount(principleEntries.length) },
      ],
      actions: [{ label: 'Holmgren checklist →', sectionId: 'plan-holmgren-checklist' }],
      empty: principleEntries.length === 0,
    };

    return [layering, water, zoneCirc, plant, soil, cross, phasing, principles];
  }, [
    projectTransects,
    projectEarthworks,
    projectStorageInfra,
    projectFertilityInfra,
    projectGuilds,
    projectWasteVectors,
    projectSpecies,
    projectZones,
    projectPaths,
    projectCrops,
    projectPrinciples,
    phases,
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Stage 2 of 3 · Trunk & Synthesis</span>
        <h1 className={styles.title}>Plan — design from patterns to details.</h1>
        <p className={styles.lede}>
          Eight modules that turn observations into a designed system. Layer
          the data, route the water, set zones and circulation, compose
          polycultures, close nutrient loops, draw cross-sections, schedule
          phases, and verify against Holmgren&rsquo;s twelve principles before
          shovelling any earth.
        </p>
        <span className={styles.principle}>P7 · Design from Patterns to Details</span>
      </header>

      <div className={styles.grid}>
        {modules.map((m) => (
          <section key={m.number} className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardNumber}>Module {m.number}</span>
            </header>
            <h2 className={styles.cardTitle}>{m.title}</h2>

            {m.empty ? (
              <p className={styles.empty}>
                No data captured yet — start with the linked tools below.
              </p>
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
