/**
 * ActHub — landing surface for the ACT stage of the 3-stage cycle.
 *
 * Mirrors `features/observe/ObserveHub.tsx` and `features/plan/PlanHub.tsx`.
 * Summarises the five spec modules from the regenerative-design Act Stage:
 *
 *   Module 1  Phased Implementation & Budgeting → Build Gantt, Budget Actuals, Pilot Plots
 *   Module 2  Maintenance & Operations          → Maintenance, Irrigation, Waste Routing
 *   Module 3  Ecological Monitoring & Yield     → Ongoing SWOT, Harvest Log, Succession
 *   Module 4  Social Permaculture               → Network CRM, Community Events
 *   Module 5  Disaster Preparedness             → Hazard Plans, Appropriate Tech
 *
 * Selector discipline: every store read uses subscribe-then-derive (raw
 * field selector + useMemo) per ADR `2026-04-26-zustand-selector-stability`.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useActualsStore } from '../../store/actualsStore.js';
import { usePilotPlotStore } from '../../store/pilotPlotStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useSwotStore } from '../../store/swotStore.js';
import { useHarvestLogStore } from '../../store/harvestLogStore.js';
import { useSuccessionStore } from '../../store/successionStore.js';
import { useNetworkStore } from '../../store/networkStore.js';
import { useCommunityEventStore } from '../../store/communityEventStore.js';
import { useAppropriateTechStore } from '../../store/appropriateTechStore.js';
import styles from './ActHub.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void; // contract-compliance — unused
}

interface ModuleAction { label: string; sectionId: string; }
interface SummaryRow { label: string; value: string; }
interface ModuleSpec {
  number: string;
  title: string;
  rows: SummaryRow[];
  actions: ModuleAction[];
  empty?: boolean;
}

function fmt(n: number, suffix = ''): string { return `${n}${suffix}`; }

export default function ActHub({ project }: Props) {
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  // Subscribe-then-derive: raw store fields, project-scoped slices in useMemo.
  const allPhases       = usePhaseStore((s) => s.phases);
  const actualsByProject = useActualsStore((s) => s.byProject);
  const allPilots       = usePilotPlotStore((s) => s.pilots);
  const allTasks        = useMaintenanceStore((s) => s.tasks);
  const allCrops        = useCropStore((s) => s.cropAreas);
  const allHazards      = useExternalForcesStore((s) => s.hazards);
  const allWasteRuns    = useClosedLoopStore((s) => s.wasteVectorRuns);
  const allSwot         = useSwotStore((s) => s.swot);
  const allHarvest      = useHarvestLogStore((s) => s.entries);
  const allMilestones   = useSuccessionStore((s) => s.milestones);
  const allContacts     = useNetworkStore((s) => s.contacts);
  const allEvents       = useCommunityEventStore((s) => s.events);
  const allTech         = useAppropriateTechStore((s) => s.items);

  const projectPhases     = useMemo(() => allPhases.filter((p) => p.projectId === project.id), [allPhases, project.id]);
  const projectActuals    = useMemo(() => actualsByProject[project.id] ?? {}, [actualsByProject, project.id]);
  const projectPilots     = useMemo(() => allPilots.filter((p) => p.projectId === project.id), [allPilots, project.id]);
  const projectTasks      = useMemo(() => allTasks.filter((t) => t.projectId === project.id), [allTasks, project.id]);
  const projectCrops      = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const projectHazards    = useMemo(() => allHazards.filter((h) => h.projectId === project.id), [allHazards, project.id]);
  const projectWasteRuns  = useMemo(() => allWasteRuns.filter((r) => r.projectId === project.id), [allWasteRuns, project.id]);
  const projectSwot       = useMemo(() => allSwot.filter((e) => e.projectId === project.id), [allSwot, project.id]);
  const projectHarvest    = useMemo(() => allHarvest.filter((h) => h.projectId === project.id), [allHarvest, project.id]);
  const projectMilestones = useMemo(() => allMilestones.filter((m) => m.projectId === project.id), [allMilestones, project.id]);
  const projectContacts   = useMemo(() => allContacts.filter((c) => c.projectId === project.id), [allContacts, project.id]);
  const projectEvents     = useMemo(() => allEvents.filter((e) => e.projectId === project.id), [allEvents, project.id]);
  const projectTech       = useMemo(() => allTech.filter((i) => i.projectId === project.id), [allTech, project.id]);

  const modules: ModuleSpec[] = useMemo(() => {
    // ── Module 1 — Phased Implementation & Budgeting ────────────────────────
    const completedPhases = projectPhases.filter((p) => p.completed).length;
    let estLabor = 0, estUSD = 0;
    projectPhases.forEach((p) => {
      (p.tasks ?? []).forEach((t) => {
        estLabor += t.laborHrs ?? 0;
        estUSD   += t.costUSD  ?? 0;
      });
    });
    const actuals = Object.values(projectActuals);
    const actLabor = actuals.reduce((a, x) => a + (x.actualHrs ?? 0), 0);
    const actUSD   = actuals.reduce((a, x) => a + (x.actualUSD ?? 0), 0);
    const runningPilots = projectPilots.filter((p) => p.status === 'running').length;
    const phasing: ModuleSpec = {
      number: '1',
      title: 'Phased Implementation & Budgeting',
      rows: [
        { label: 'Phases complete', value: `${completedPhases} / ${projectPhases.length || 0}` },
        { label: 'Labor (act / est)', value: `${actLabor} h / ${estLabor} h` },
        { label: 'Spend (act / est)', value: `$${actUSD} / $${estUSD}` },
        { label: 'Active pilot plots', value: fmt(runningPilots) },
      ],
      actions: [
        { label: '5-year build Gantt →', sectionId: 'act-build-gantt' },
        { label: 'Budget actuals →', sectionId: 'act-budget-actuals' },
        { label: 'Pilot plots →', sectionId: 'act-pilot-plots' },
      ],
      empty: projectPhases.length === 0 && projectPilots.length === 0,
    };

    // ── Module 2 — Maintenance & Operations ─────────────────────────────────
    const cadenceCounts = { daily: 0, weekly: 0, monthly: 0, quarterly: 0, annual: 0 };
    projectTasks.forEach((t) => { cadenceCounts[t.cadence] += 1; });
    const activeIrrig = projectCrops.filter(
      (c) => (c.irrigationMode ?? 'active') === 'active',
    ).length;
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const recentRuns = projectWasteRuns.filter(
      (r) => new Date(r.runDate).getTime() >= monthAgo,
    ).length;
    const ops: ModuleSpec = {
      number: '2',
      title: 'Maintenance & Operations',
      rows: [
        { label: 'Tasks (D/W/M/Q/A)', value: `${cadenceCounts.daily}/${cadenceCounts.weekly}/${cadenceCounts.monthly}/${cadenceCounts.quarterly}/${cadenceCounts.annual}` },
        { label: 'Crop areas active-irrigation', value: `${activeIrrig} / ${projectCrops.length || 0}` },
        { label: 'Waste runs (30 d)', value: fmt(recentRuns) },
      ],
      actions: [
        { label: 'Maintenance schedule →', sectionId: 'act-maintenance-schedule' },
        { label: 'Irrigation manager →', sectionId: 'act-irrigation-manager' },
        { label: 'Waste routing checklist →', sectionId: 'act-waste-routing' },
      ],
      empty: projectTasks.length === 0 && projectCrops.length === 0 && projectWasteRuns.length === 0,
    };

    // ── Module 3 — Ecological Monitoring & Yield ────────────────────────────
    const quarterAgoIso = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const recentSwot = projectSwot.filter((e) => e.createdAt >= quarterAgoIso).length;
    const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const ytdHarvest = projectHarvest.filter((h) => h.date >= yearAgo).length;
    const monitor: ModuleSpec = {
      number: '3',
      title: 'Ecological Monitoring & Yield',
      rows: [
        { label: 'SWOT entries (90 d)', value: fmt(recentSwot) },
        { label: 'Harvests logged (YTD)', value: fmt(ytdHarvest) },
        { label: 'Succession milestones', value: fmt(projectMilestones.length) },
      ],
      actions: [
        { label: 'Ongoing SWOT →', sectionId: 'act-ongoing-swot' },
        { label: 'Harvest log →', sectionId: 'act-harvest-log' },
        { label: 'Succession tracker →', sectionId: 'act-succession-tracker' },
      ],
      empty: projectSwot.length === 0 && projectHarvest.length === 0 && projectMilestones.length === 0,
    };

    // ── Module 4 — Social Permaculture ──────────────────────────────────────
    const todayIso = new Date().toISOString().slice(0, 10);
    const upcoming = projectEvents.filter((e) => e.date >= todayIso).length;
    const social: ModuleSpec = {
      number: '4',
      title: 'Social Permaculture',
      rows: [
        { label: 'Network contacts', value: fmt(projectContacts.length) },
        { label: 'Upcoming events', value: fmt(upcoming) },
      ],
      actions: [
        { label: 'Network CRM →', sectionId: 'act-network-crm' },
        { label: 'Community events →', sectionId: 'act-community-events' },
      ],
      empty: projectContacts.length === 0 && projectEvents.length === 0,
    };

    // ── Module 5 — Disaster Preparedness ────────────────────────────────────
    const hazardsWithPlan = projectHazards.filter(
      (h) => Array.isArray(h.mitigationSteps) && h.mitigationSteps.length > 0,
    ).length;
    const techTested = projectTech.filter((i) => i.status === 'tested').length;
    const resilience: ModuleSpec = {
      number: '5',
      title: 'Disaster Preparedness',
      rows: [
        { label: 'Hazards with action plan', value: `${hazardsWithPlan} / ${projectHazards.length || 0}` },
        { label: 'Appropriate-tech tested', value: `${techTested} / ${projectTech.length || 0}` },
      ],
      actions: [
        { label: 'Hazard action plans →', sectionId: 'act-hazard-plans' },
        { label: 'Appropriate-tech log →', sectionId: 'act-appropriate-tech' },
      ],
      empty: projectHazards.length === 0 && projectTech.length === 0,
    };

    return [phasing, ops, monitor, social, resilience];
  }, [
    projectPhases,
    projectActuals,
    projectPilots,
    projectTasks,
    projectCrops,
    projectWasteRuns,
    projectSwot,
    projectHarvest,
    projectMilestones,
    projectContacts,
    projectEvents,
    projectTech,
    projectHazards,
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Stage 3 of 3 · Fruit & Stewardship</span>
        <h1 className={styles.title}>Act — implement, maintain, monitor, share, prepare.</h1>
        <p className={styles.lede}>
          Five modules that turn the design into a living system. Phase the
          build with real-world budget tracking, hold maintenance and
          irrigation transitions, monitor yields and succession over years,
          weave the local network around the project, and stand the system
          up against disasters with mitigation plans and appropriate
          technology.
        </p>
        <span className={styles.principle}>P3 · Obtain a yield · P9 · Use small &amp; slow solutions</span>
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
