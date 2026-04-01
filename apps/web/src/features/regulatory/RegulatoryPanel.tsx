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
    <div style={{ padding: 20 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: 16,
        }}
      >
        Regulatory & Permitting
      </h3>

      {/* Regulatory risk score */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Regulatory Complexity</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: riskScore.color,
            }}
          >
            {riskScore.label}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--color-border)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${riskScore.value}%`,
              borderRadius: 2,
              background: riskScore.color,
              transition: 'width 400ms ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.5 }}>
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
          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text)' }}>
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
          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text)' }}>
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
          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {permits.map((permit) => (
            <PermitRow key={permit.name} permit={permit} />
          ))}
        </div>
        <InfoBadge>Auto-generated based on project type and location. Verify all requirements locally.</InfoBadge>
      </RegSection>

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(138, 109, 30, 0.08)',
          border: '1px solid rgba(138, 109, 30, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: 10,
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
        }}
      >
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
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          background: expanded ? 'var(--color-surface)' : 'transparent',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)' }}>{children}</div>}
    </div>
  );
}

function PermitRow({ permit }: { permit: PermitItem }) {
  const statusConfig = {
    needed: { color: '#c44e3f', label: 'Likely Needed', icon: '!' },
    not_needed: { color: '#2d7a4f', label: 'Not Needed', icon: '-' },
    unknown: { color: '#8a6d1e', label: 'Unknown', icon: '?' },
    applied: { color: '#4a90d9', label: 'Applied', icon: '>' },
    approved: { color: '#2d7a4f', label: 'Approved', icon: '+' },
  };

  const cfg = statusConfig[permit.status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, color: 'var(--color-text)' }}>{permit.name}</span>
      <span style={{ fontSize: 10, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 10,
        color: 'var(--color-earth-600)',
        padding: '4px 8px',
        background: 'var(--color-earth-100)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
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
    return { value: score, label: 'High', color: '#c44e3f', description: 'Multiple permits likely required. Engage a planner early.' };
  }
  if (score >= 40) {
    return { value: score, label: 'Medium', color: '#8a6d1e', description: 'Standard permitting expected. Document regulatory research.' };
  }
  return { value: score, label: 'Low', color: '#2d7a4f', description: 'Relatively straightforward regulatory path.' };
}
