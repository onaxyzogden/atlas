/**
 * RegulatoryPanel — zoning classification, setback overlays,
 * floodplain display, wetland status, and permit requirements.
 *
 * Consumes site data layers for zoning, flood/wetland, and soils.
 * All regulatory data shown as auto-populated from site data + user notes.
 * The Atlas provides orientation, not legal advice.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { SETBACK_RULES } from '../rules/SitingRules.js';
import { confidence, utility } from '../../lib/tokens.js';
import RegulatoryRiskNotesCard from './RegulatoryRiskNotesCard.js';
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

interface ZoningSummary {
  zoning_code?: string;
  zoning_description?: string;
  permitted_uses?: string[];
  agricultural_district?: string;
}

interface FloodWetlandSummary {
  flood_zone?: string;
  has_significant_wetland?: boolean;
  wetland_pct?: number;
  riparian_buffer_m?: number;
  regulated_area_pct?: number;
}

interface SoilsSummary {
  farmland_class?: string;
  dominant_texture?: string;
  drainage_class?: string;
}

interface RecommendedAction {
  text: string;
  severity: 'blocking' | 'advisory';
}

export default function RegulatoryPanel({ project }: RegulatoryPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const siteData = useSiteData(project.id);

  const zoning = siteData ? getLayerSummary<ZoningSummary>(siteData, 'zoning') : null;
  const floodWetland = siteData ? getLayerSummary<FloodWetlandSummary>(siteData, 'wetlands_flood') : null;
  const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

  const permits = generatePermitChecklist(project);
  const riskScore = computeRegulatoryRisk(project, floodWetland, soils, zoning);
  const actions = computeRecommendedActions(project, floodWetland, zoning);

  return (
    <div className={p.container}>
      <h3 className={p.sectionLabel}>
        Regulatory & Permitting
      </h3>

      {/* Non-dismissable regulatory disclaimer — guardrails banner */}
      <div className={s.regulatoryDisclaimer}>
        <span className={s.disclaimerIcon}>&#9432;</span>
        <span>
          <strong>Regulatory Orientation Only.</strong> The Atlas is not legal advice.
          All zoning, permitting, and environmental data must be verified with the
          relevant municipal or conservation authority before design or construction decisions.
        </span>
      </div>

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

      {/* Categorical regulatory risk surfaces */}
      <RegulatoryRiskNotesCard project={project} />

      {/* Zoning section */}
      <RegSection
        title="Zoning Classification"
        expanded={expanded === 'zoning'}
        onToggle={() => setExpanded(expanded === 'zoning' ? null : 'zoning')}
      >
        {zoning?.zoning_code ? (
          <div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Code</span>
              <span className={s.infoValue}>{zoning.zoning_code}</span>
            </div>
            {zoning.zoning_description && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Description</span>
                <span className={s.infoValue}>{zoning.zoning_description}</span>
              </div>
            )}
            {zoning.permitted_uses && zoning.permitted_uses.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className={s.infoLabel} style={{ marginBottom: 4 }}>Permitted Uses</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.6 }}>
                  {zoning.permitted_uses.map((use, i) => (
                    <li key={i}>{use}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : project.zoningNotes ? (
          <div className={s.contentText}>
            {project.zoningNotes}
          </div>
        ) : (
          <EmptyState>
            No zoning information entered. Add zoning notes in the project editor to see permitted uses and constraints.
          </EmptyState>
        )}

        {/* Ontario CLI farmland class */}
        {project.country === 'CA' && soils?.farmland_class && (
          <div style={{ marginTop: 10 }}>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>CLI Farmland Class</span>
              <span className={s.infoValue}>{soils.farmland_class}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.5 }}>
              {getFarmlandClassDescription(soils.farmland_class)}
            </div>
          </div>
        )}

        <InfoBadge>Verify with your local municipal planning department</InfoBadge>
      </RegSection>

      {/* Flood zone & wetland status */}
      <RegSection
        title="Flood Zone & Wetland Status"
        expanded={expanded === 'flood'}
        onToggle={() => setExpanded(expanded === 'flood' ? null : 'flood')}
      >
        {floodWetland ? (
          <div>
            {/* Blocking alerts */}
            {floodWetland.flood_zone === 'AE' && (
              <div className={s.blockingAlert}>
                <strong>AE Flood Zone Detected</strong> — Site falls within a FEMA AE Special Flood Hazard Area.
                Structures are restricted, flood insurance is mandatory, and fill/grading requires permits.
              </div>
            )}
            {floodWetland.has_significant_wetland && (
              <div className={s.blockingAlert}>
                <strong>Provincially Significant Wetland (PSW)</strong> — Development within or adjacent to
                PSW is subject to Conservation Authority review. No development permitted within regulated area.
              </div>
            )}

            {/* Info rows */}
            {floodWetland.flood_zone && floodWetland.flood_zone !== 'AE' && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Flood Zone</span>
                <span className={s.infoValue}>{floodWetland.flood_zone}</span>
              </div>
            )}
            {floodWetland.riparian_buffer_m != null && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Riparian Buffer</span>
                <span className={s.infoValue}>{floodWetland.riparian_buffer_m}m</span>
              </div>
            )}
            {floodWetland.wetland_pct != null && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Wetland Coverage</span>
                <span className={s.infoValue}>{Number(floodWetland.wetland_pct).toFixed(1)}%</span>
              </div>
            )}
            {floodWetland.regulated_area_pct != null && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Regulated Area</span>
                <span className={s.infoValue}>{Number(floodWetland.regulated_area_pct).toFixed(1)}%</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState>
            No flood zone or wetland data available. Fetch site data to populate environmental overlays.
          </EmptyState>
        )}
      </RegSection>

      {/* Setback requirements */}
      <RegSection
        title="Setback Requirements"
        expanded={expanded === 'setbacks'}
        onToggle={() => setExpanded(expanded === 'setbacks' ? null : 'setbacks')}
      >
        <div className={s.setbackTable}>
          {SETBACK_ENTRIES.map(({ key, label }) => (
            <div key={key} className={s.setbackRow}>
              <span className={s.setbackLabel}>{label}</span>
              <span className={s.setbackValue}>{SETBACK_RULES[key as keyof typeof SETBACK_RULES]}m</span>
            </div>
          ))}
        </div>
        <InfoBadge>Minimum distances from boundaries, features, and sensitive areas</InfoBadge>
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

      {/* Recommended actions */}
      {actions.length > 0 && (
        <RegSection
          title={`Recommended Actions (${actions.length})`}
          expanded={expanded === 'actions'}
          onToggle={() => setExpanded(expanded === 'actions' ? null : 'actions')}
        >
          <div>
            {actions.map((action, i) => (
              <div key={i} className={s.actionItem}>
                <span
                  className={s.actionDot}
                  style={{ background: action.severity === 'blocking' ? 'var(--color-confidence-low)' : 'var(--color-confidence-medium)' }}
                />
                <span className={s.actionNumber}>{i + 1}.</span>
                <span className={s.actionText}>{action.text}</span>
              </div>
            ))}
          </div>
        </RegSection>
      )}
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
        <span className={s.regSectionChevron}>{expanded ? '\u25BE' : '\u25B8'}</span>
      </button>
      {expanded && <div className={s.regSectionBody}>{children}</div>}
    </div>
  );
}

function PermitRow({ permit }: { permit: PermitItem }) {
  const statusConfig = {
    needed: { color: 'var(--color-confidence-low)', label: 'Likely Needed' },
    not_needed: { color: 'var(--color-confidence-high)', label: 'Not Needed' },
    unknown: { color: confidence.medium, label: 'Unknown' },
    applied: { color: utility.water_tank, label: 'Applied' },
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

// ─── Constants ──────────────────────────────────────────────────────────

const SETBACK_ENTRIES: Array<{ key: string; label: string }> = [
  { key: 'front', label: 'Front Property Line' },
  { key: 'side', label: 'Side Property Line' },
  { key: 'rear', label: 'Rear Property Line' },
  { key: 'riparian', label: 'Riparian / Watercourse' },
  { key: 'wetland', label: 'Wetland Buffer' },
  { key: 'well_septic', label: 'Well-Septic Separation' },
  { key: 'livestock_spiritual', label: 'Livestock-Spiritual Buffer' },
  { key: 'guest_privacy', label: 'Guest Privacy Buffer' },
];

// ─── Logic ───────────────────────────────────────────────────────────────

function getFarmlandClassDescription(farmlandClass: string): string {
  const cls = farmlandClass.replace(/class\s*/i, '').trim();
  if (cls === '1') return 'Class 1 — highest capability, no significant limitations for crop production.';
  if (cls === '2') return 'Class 2 — moderate limitations that restrict the range of crops or require conservation practices.';
  if (cls === '3') return 'Class 3 — moderately severe limitations that further restrict crop range.';
  if (cls === '4') return 'Class 4 — severe limitations, suitable for special crops or improved pasture.';
  if (cls === '5' || cls === '6' || cls === '7') return `Class ${cls} — limited to forage, woodland, or non-agricultural use.`;
  return `Farmland capability class ${farmlandClass}.`;
}

function generatePermitChecklist(project: LocalProject): PermitItem[] {
  const permits: PermitItem[] = [];
  const type = project.projectType;

  permits.push({
    name: 'Building Permit',
    category: 'building',
    status: 'needed',
    notes: 'Required for any permanent structure',
  });

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

  permits.push({
    name: 'Grading / Earthwork Permit',
    category: 'land_use',
    status: project.hasParcelBoundary && project.acreage && project.acreage > 5 ? 'needed' : 'unknown',
    notes: 'May be required for ponds, berms, or road grading',
  });

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

function computeRegulatoryRisk(
  project: LocalProject,
  floodWetland: FloodWetlandSummary | null,
  soils: SoilsSummary | null,
  zoning: ZoningSummary | null,
): {
  value: number;
  label: string;
  color: string;
  description: string;
} {
  let score = 30;

  // Existing factors
  if (!project.zoningNotes && !zoning?.zoning_code) score += 15;
  if (!project.waterRightsNotes) score += 10;
  if (!project.accessNotes) score += 10;

  const type = project.projectType;
  if (type === 'retreat_center' || type === 'moontrance') score += 15;
  if (type === 'multi_enterprise') score += 10;

  if (project.country === 'CA' && project.provinceState === 'ON') score += 10;

  // New site-data factors
  if (floodWetland?.flood_zone === 'AE') score += 25;
  if (floodWetland?.has_significant_wetland) score += 20;

  if (soils?.farmland_class) {
    const cls = soils.farmland_class.replace(/class\s*/i, '').trim();
    if (cls === '1' || cls === '2') score += 10;
  }

  // Zoning incompatibility check — hospitality on agricultural-only
  if (zoning?.zoning_code && (type === 'retreat_center' || type === 'moontrance')) {
    const code = zoning.zoning_code.toLowerCase();
    if (code.startsWith('a') || code.includes('agri') || code.includes('farm')) {
      if (!zoning.permitted_uses?.some((u) => u.toLowerCase().includes('hospitality') || u.toLowerCase().includes('retreat') || u.toLowerCase().includes('accommodation'))) {
        score += 15;
      }
    }
  }

  score = Math.min(100, score);

  if (score >= 70) {
    return { value: score, label: 'High', color: 'var(--color-confidence-low)', description: 'Multiple permits likely required. Engage a planner early.' };
  }
  if (score >= 40) {
    return { value: score, label: 'Medium', color: confidence.medium, description: 'Standard permitting expected. Document regulatory research.' };
  }
  return { value: score, label: 'Low', color: 'var(--color-confidence-high)', description: 'Relatively straightforward regulatory path.' };
}

function computeRecommendedActions(
  project: LocalProject,
  floodWetland: FloodWetlandSummary | null,
  zoning: ZoningSummary | null,
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (floodWetland?.flood_zone === 'AE') {
    actions.push({ severity: 'blocking', text: 'Obtain FEMA flood zone determination letter and engage a flood mitigation engineer before placing structures.' });
  }

  if (floodWetland?.has_significant_wetland) {
    actions.push({ severity: 'blocking', text: 'Contact the Conservation Authority for a pre-consultation on PSW regulated area constraints.' });
  }

  if (!project.zoningNotes && !zoning?.zoning_code) {
    actions.push({ severity: 'advisory', text: 'Research and document the zoning classification from the municipal planning office.' });
  }

  if (!project.waterRightsNotes) {
    actions.push({ severity: 'advisory', text: 'Document water rights, source permits, and any water-taking restrictions.' });
  }

  if (!project.accessNotes) {
    actions.push({ severity: 'advisory', text: 'Verify legal road access, utility easements, and any restrictive covenants on title.' });
  }

  if (project.country === 'CA' && project.provinceState === 'ON') {
    actions.push({ severity: 'advisory', text: 'Schedule a pre-consultation with the local Conservation Authority before design development.' });
  }

  const type = project.projectType;
  if (type === 'retreat_center' || type === 'moontrance') {
    if (zoning?.zoning_code) {
      const code = zoning.zoning_code.toLowerCase();
      if (code.startsWith('a') || code.includes('agri')) {
        actions.push({ severity: 'advisory', text: 'Confirm that zoning permits hospitality/retreat use, or apply for a site-specific zoning amendment.' });
      }
    }
  }

  return actions;
}
