/**
 * StewardshipDashboard — Regenerative goals, compliance tracking, action items.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './StewardshipDashboard.module.css';

interface StewardshipDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary { organic_matter_pct?: number | string; drainage_class?: string; }
interface LandCoverSummary { tree_canopy_pct?: number | string; }
interface ClimateSummary { annual_precip_mm?: number; }

const GOALS = [
  { name: 'Carbon Sequestration', target: '50 TCO2e/ha by Year 10', baseProgress: 85, liveKey: 'carbon' as const, color: '#8a9a74' },
  { name: 'Biodiversity Index', target: 'Shannon Index > 3.5', baseProgress: 72, liveKey: 'habitat' as const, color: '#8a9a74' },
  { name: 'Water Retention', target: '90% on-site capture', baseProgress: 92, liveKey: 'water' as const, color: '#8a9a74' },
  { name: 'Soil Organic Matter', target: '>6% across all zones', baseProgress: 58, liveKey: null, color: '#c4a265' },
  { name: 'Zero External Inputs', target: 'Eliminate synthetic fertilizer', baseProgress: 95, liveKey: null, color: '#8a9a74' },
];

const ACTION_ITEMS = [
  { priority: 'High', task: 'Complete riparian buffer planting — Sector 3', due: 'Apr 15', status: 'In Progress' },
  { priority: 'Medium', task: 'Install flow sensors at Basin 2 outlet', due: 'Apr 20', status: 'Scheduled' },
  { priority: 'Medium', task: 'Submit Conservation Halton pre-consultation', due: 'May 01', status: 'Pending' },
  { priority: 'Low', task: 'Update soil sampling protocol for fall cycle', due: 'Sep 01', status: 'Planned' },
];

const CERTIFICATIONS = [
  { name: 'Ecological Goods & Services', status: 'Active', expiry: 'Dec 2026' },
  { name: 'Carbon Credit Registry', status: 'Pending Verification', expiry: '—' },
  { name: 'Organic Transition', status: 'Year 2 of 3', expiry: 'Mar 2027' },
];

export default function StewardshipDashboard({ project, onSwitchToMap }: StewardshipDashboardProps) {
  const siteData = useSiteData(project.id);

  const liveProgress = useMemo(() => {
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const climate  = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

    const omRaw    = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om       = isFinite(omRaw) ? omRaw : null;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy   = isFinite(canopyRaw) ? canopyRaw : null;
    const precip   = climate?.annual_precip_mm ?? null;
    const drain    = (soils?.drainage_class ?? '').toLowerCase();

    // Carbon: OM-based proxy
    const carbon = om !== null
      ? (om >= 5 ? 90 : om >= 3 ? 72 : om >= 1 ? 50 : 30)
      : null;

    // Habitat: canopy%-based proxy
    const habitat = canopy !== null
      ? (canopy >= 50 ? 88 : canopy >= 30 ? 65 : canopy >= 15 ? 45 : 25)
      : null;

    // Water: drainage + precip
    const water = (drain.includes('well') && precip !== null && precip > 800) ? 85
      : precip !== null ? 65
      : null;

    return { carbon, habitat, water };
  }, [siteData]);

  const resolvedGoals = GOALS.map((g) => ({
    ...g,
    progress: g.liveKey && liveProgress[g.liveKey] !== null
      ? liveProgress[g.liveKey]!
      : g.baseProgress,
  }));

  return (
    <div className={css.page}>
      <h1 className={css.title}>Stewardship Protocol</h1>
      <p className={css.desc}>
        Track regenerative goals, compliance milestones, and land stewardship commitments
        across the property.
      </p>

      {/* Regenerative Goals */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>REGENERATIVE GOALS</h3>
        <div className={css.goalsCard}>
          {resolvedGoals.map((g) => (
            <div key={g.name} className={css.goalItem}>
              <div className={css.goalHeader}>
                <span className={css.goalName}>{g.name}</span>
                <span className={css.goalTarget}>{g.target}</span>
              </div>
              <ProgressBar label="" value={g.progress} color={g.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ACTION ITEMS</h3>
        <div className={css.actionTable}>
          <div className={css.actionHeaderRow}>
            <span>Priority</span>
            <span>Task</span>
            <span>Due</span>
            <span>Status</span>
          </div>
          {ACTION_ITEMS.map((a, i) => (
            <div key={i} className={css.actionRow}>
              <span className={a.priority === 'High' ? css.priorityHigh : a.priority === 'Medium' ? css.priorityMed : css.priorityLow}>
                {a.priority}
              </span>
              <span className={css.actionTask}>{a.task}</span>
              <span className={css.actionDue}>{a.due}</span>
              <span className={css.actionStatus}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>CERTIFICATIONS & COMPLIANCE</h3>
        <div className={css.certList}>
          {CERTIFICATIONS.map((c) => (
            <div key={c.name} className={css.certCard}>
              <div>
                <span className={css.certName}>{c.name}</span>
                <span className={css.certExpiry}>Expiry: {c.expiry}</span>
              </div>
              <span className={css.certStatus}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stewardship quote */}
      <div className={css.quoteCard}>
        <p className={css.quote}>
          &ldquo;To steward is to remember every step taken across the land.&rdquo;
        </p>
      </div>
    </div>
  );
}
