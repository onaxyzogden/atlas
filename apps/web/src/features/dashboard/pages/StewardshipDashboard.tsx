/**
 * StewardshipDashboard — Regenerative goals, compliance tracking, action items.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './StewardshipDashboard.module.css';

interface StewardshipDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const GOALS = [
  { name: 'Carbon Sequestration', target: '50 TCO2e/ha by Year 10', progress: 85, color: '#8a9a74' },
  { name: 'Biodiversity Index', target: 'Shannon Index > 3.5', progress: 72, color: '#8a9a74' },
  { name: 'Water Retention', target: '90% on-site capture', progress: 92, color: '#8a9a74' },
  { name: 'Soil Organic Matter', target: '>6% across all zones', progress: 58, color: '#c4a265' },
  { name: 'Zero External Inputs', target: 'Eliminate synthetic fertilizer', progress: 95, color: '#8a9a74' },
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
          {GOALS.map((g) => (
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
