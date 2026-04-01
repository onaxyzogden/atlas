/**
 * RegulatoryPanel — zoning classification, setback overlays,
 * floodplain display, and permit requirement stubs.
 *
 * P1 features from Section 0e:
 *   - Zoning classification display
 *   - Permitted use summary
 *   - Setback overlay visualization
 *   - Floodplain overlay
 *   - Wetland buffer overlay
 *   - Permit requirement checklist
 *   - Regulatory risk score
 *
 * All regulatory data shown as user-entered + auto-populated stubs.
 * The Atlas provides orientation, not legal advice.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import p from '../../styles/panel.module.css';
import s from './RegulatoryPanel.module.css';

interface RegulatoryPanelProps {
  project: LocalProject;
}

interface PermitItem {
  name: string;
  category: 'building' | 'water' | 'land_use' | 'environmental' | 'other';
  status: 'needed' | 'not_needed' | 'unknown' | 'applied' | 'approved';
  notes: string;
}

export default function RegulatoryPanel({ project }: RegulatoryPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const permits = generatePermitChecklist(project);
  const riskScore = computeRegulatoryRisk(project);

  return (
    <div className={p.container}>
      <h3 className={p.sectionLabel}>
        Regulatory & Permitting
      </h3>

      {/* Regulatory risk score */}
      <div className={s.riskCard}>
        <div className={s.riskHeader}>
          <span className={s.riskTitle}>Regulatory Complexity</span>
          <span className={s.riskLabel} style={{ color: riskScore.color }}>
            {riskScore.label}
          </span>
        </div>
        <div className={s.progressTrack}>
          <div
            className={s.progressFill}
            style={{ width: `${riskScore.value}%`, background: riskScore.color }}
          />
        </div>
        <div className={s.riskDesc}>
          {riskScore.description}
        </div>
      </div>

      {/* Zoning section */}
      <RegSection
        title="Zoning Classification"
        expanded={expanded === 'zoning'}
        onToggle={() => setExpanded(expanded === 'zoning' ? null : 'zoning')}
      >
        {project.zoningNotes ? (
          <div className={s.contentText}>
            {project.zoningNotes}
          </div>
        ) : (
          <EmptyState>
            No zoning information entered. Add zoning notes in the project editor to see permitted uses and constraints.
          </EmptyState>
        )}
        <InfoBadge>Verify with your local municipal planning department</InfoBadge>
      </RegSection>

      {/* Water rights */}
      <RegSection
        title="Water Rights & Access"
        expanded={expanded === 'water'}
        onToggle={() => setExpanded(expanded === 'water' ? null : 'water')}
      >
        {project.waterRightsNotes ? (
          <div className={s.contentText}>
            {project.waterRightsNotes}
          </div>
        ) : (
          <EmptyState>
            No water rights documented. This is critical for agricultural and retreat operations.
          </EmptyState>
        )}
      </RegSection>

      {/* Access & easements */}
      <RegSection
        title="Access, Easements & Covenants"
        expanded={expanded === 'access'}
        onToggle={() => setExpanded(expanded === 'access' ? null : 'access')}
      >
        {project.accessNotes ? (
          <div className={s.contentText}>
            {project.accessNotes}
          </div>
        ) : (
          <EmptyState>
            No access or easement information entered. Document road access, utility easements, and covenants.
          </EmptyState>
        )}
      </RegSection>

      {/* Permit checklist */}
      <RegSection
        title="Permit Requirements"
        expanded={expanded === 'permits'}
        onToggle={() => setExpanded(expanded === 'permits' ? null : 'permits')}
      >
        <div className={p.section}>
          {permits.map((permit) => (
            <PermitRow key={permit.name} permit={permit} />
          ))}
        </div>
        <InfoBadge>Auto-generated based on project type and location. Verify all requirements locally.</InfoBadge>
      </RegSection>

      {/* Disclaimer */}
      <div className={s.disclaimer}>
        <strong>Regulatory Disclaimer:</strong> The Atlas provides regulatory orientation, not legal advice.
        Zoning, permitting, and regulatory information must be verified with the relevant municipal authority
        before making design or construction decisions.
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function RegSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={s.regSection}>
      <button
        onClick={onToggle}
        className={`${s.regSectionToggle} ${expanded ? s.regSectionToggleExpanded : s.regSectionToggleCollapsed}`}
      >
        {title}
        <span className={s.regSectionChevron}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && <div className={s.regSectionBody}>{children}</div>}
    </div>
  );
}

function PermitRow({ permit }: { permit: PermitItem }) {
  const statusConfig = {
    needed: { color: 'var(--color-confidence-low)', label: 'Likely Needed' },
    not_needed: { color: 'var(--color-confidence-high)', label: 'Not Needed' },
    unknown: { color: '#8a6d1e', label: 'Unknown' },
    applied: { color: '#4a90d9', label: 'Applied' },
    approved: { color: 'var(--color-confidence-high)', label: 'Approved' },
  };

  const cfg = statusConfig[permit.status];

  return (
    <div className={s.permitRow}>
      <span className={s.permitDot} style={{ background: cfg.color }} />
      <span className={s.permitName}>{permit.name}</span>
      <span className={s.permitStatus} style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.emptyState}>
      {children}
    </div>
  );
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.infoBadge}>
      {children}
    </div>
  );
}

// ─── Logic ───────────────────────────────────────────────────────────────

function generatePermitChecklist(project: LocalProject): PermitItem[] {
  const permits: PermitItem[] = [];
  const type = project.projectType;

  // Building permit — almost always needed
  permits.push({
    name: 'Building Permit',
    category: 'building',
    status: 'needed',
    notes: 'Required for any permanent structure',
  });

  // Septic / well
  permits.push({
    name: 'Septic System Permit',
    category: 'water',
    status: type === 'regenerative_farm' || type === 'homestead' ? 'needed' : 'unknown',
    notes: 'Required if not connected to municipal sewer',
  });

  permits.push({
    name: 'Well Drilling Permit',
    category: 'water',
    status: 'unknown',
    notes: 'Check if municipal water is available',
  });

  // Grading / earthwork
  permits.push({
    name: 'Grading / Earthwork Permit',
    category: 'land_use',
    status: project.hasParcelBoundary && project.acreage && project.acreage > 5 ? 'needed' : 'unknown',
    notes: 'May be required for ponds, berms, or road grading',
  });

  // Environmental
  if (project.country === 'CA') {
    permits.push({
      name: 'Conservation Authority Permit',
      category: 'environmental',
      status: project.provinceState === 'ON' ? 'needed' : 'unknown',
      notes: 'Required for development near regulated features in Ontario',
    });
  }

  permits.push({
    name: 'Environmental Compliance',
    category: 'environmental',
    status: 'unknown',
    notes: 'Species at risk, wetland disturbance, waterway alteration',
  });

  // Use-specific
  if (type === 'retreat_center' || type === 'moontrance') {
    permits.push({
      name: 'Short-Term Rental / Hospitality',
      category: 'land_use',
      status: 'needed',
      notes: 'Zoning must permit guest accommodation or retreat use',
    });
    permits.push({
      name: 'Event / Gathering Permit',
      category: 'land_use',
      status: 'unknown',
      notes: 'May be needed for group gatherings or public events',
    });
  }

  if (type === 'regenerative_farm' || type === 'multi_enterprise') {
    permits.push({
      name: 'Agricultural Exemption',
      category: 'land_use',
      status: 'unknown',
      notes: 'Farm structures may qualify for reduced permit requirements',
    });
  }

  return permits;
}

function computeRegulatoryRisk(project: LocalProject): {
  value: number;
  label: string;
  color: string;
  description: string;
} {
  let score = 30; // Base complexity

  if (!project.zoningNotes) score += 15;
  if (!project.waterRightsNotes) score += 10;
  if (!project.accessNotes) score += 10;

  const type = project.projectType;
  if (type === 'retreat_center' || type === 'moontrance') score += 15; // Hospitality = more permits
  if (type === 'multi_enterprise') score += 10;

  if (project.country === 'CA' && project.provinceState === 'ON') score += 10; // Conservation Authority layer

  score = Math.min(100, score);

  if (score >= 70) {
    return { value: score, label: 'High', color: 'var(--color-confidence-low)', description: 'Multiple permits likely required. Engage a planner early.' };
  }
  if (score >= 40) {
    return { value: score, label: 'Medium', color: '#8a6d1e', description: 'Standard permitting expected. Document regulatory research.' };
  }
  return { value: score, label: 'Low', color: 'var(--color-confidence-high)', description: 'Relatively straightforward regulatory path.' };
}
