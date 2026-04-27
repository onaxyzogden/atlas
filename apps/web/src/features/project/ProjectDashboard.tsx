/**
 * ProjectDashboard — side panel showing project overview, data completeness,
 * notes, and attachments.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import SiteAssessmentPanel from '../assessment/SiteAssessmentPanel.js';
import DataCompletenessWidget from '../assessment/DataCompletenessWidget.js';
import RegulatoryPanel from '../regulatory/RegulatoryPanel.js';
import FieldObservationsLegalCard from './FieldObservationsLegalCard.js';
import RestrictionsCovenantsCard from './RestrictionsCovenantsCard.js';
import ZoningAccessUtilityCard from './ZoningAccessUtilityCard.js';
import TerrainAnalysisFlags from '../assessment/TerrainAnalysisFlags.js';
import VersionHistory from './VersionHistory.js';
import FileList from './FileList.js';
import { generateMockLayers } from '../../lib/mockLayerData.js';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-Enterprise',
  moontrance: 'OGDEN Template',
};

const DATA_LAYERS = [
  { key: 'elevation', label: 'Elevation & Terrain', tier: 1 },
  { key: 'soils', label: 'Soils (SSURGO / CanSIS)', tier: 1 },
  { key: 'watershed', label: 'Watershed & Hydrology', tier: 1 },
  { key: 'wetlands_flood', label: 'Wetlands & Floodplain', tier: 1 },
  { key: 'land_cover', label: 'Land Cover', tier: 1 },
  { key: 'climate', label: 'Climate Normals', tier: 1 },
  { key: 'zoning', label: 'Zoning & Parcel', tier: 1 },
] as const;

interface Props {
  project: LocalProject;
}

export default function ProjectDashboard({ project }: Props) {
  // Mock layer data for terrain analysis flags
  const mockLayers = useMemo(() => generateMockLayers(project.country), [project.country]);

  // Compute data completeness — how many checklist items are met
  const checklistItems = [
    { label: 'Property boundary', done: project.hasParcelBoundary },
    { label: 'Address / location', done: !!project.address },
    { label: 'Project type', done: !!project.projectType },
    { label: 'Parcel ID', done: !!project.parcelId },
    { label: 'Province / State', done: !!project.provinceState },
    { label: 'Owner notes', done: !!project.ownerNotes },
    { label: 'Zoning notes', done: !!project.zoningNotes },
    { label: 'Water rights notes', done: !!project.waterRightsNotes },
  ];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const completenessPercent = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
        {project.name}
      </h2>
      {project.projectType && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-earth-600)',
            background: 'var(--color-earth-100)',
            borderRadius: 4,
            padding: '2px 8px',
            marginBottom: 12,
          }}
        >
          {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
        </span>
      )}
      {project.description && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          {project.description}
        </p>
      )}

      <Divider />

      {/* Data Completeness Score */}
      <Section title="Data Completeness">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `3px solid ${completenessPercent > 60 ? 'var(--color-confidence-high)' : completenessPercent > 30 ? 'var(--color-confidence-medium)' : 'var(--color-confidence-low)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            {completenessPercent}%
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
              {completedCount} of {checklistItems.length} fields complete
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Add more detail to improve analysis quality
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checklistItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: item.done ? 'var(--color-text)' : 'var(--color-text-muted)',
              }}
            >
              <span style={{ fontSize: 14 }}>{item.done ? '●' : '○'}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Data Layers (status indicators — not yet fetched) */}
      <Section title="Data Layers">
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          Tier 1 layers will auto-populate when the API is connected.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DATA_LAYERS.map((layer) => (
            <div
              key={layer.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                padding: '4px 0',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-border)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{layer.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Tier {layer.tier}</span>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Location info */}
      {(project.address || project.parcelId || project.provinceState) && (
        <>
          <Section title="Location">
            <InfoRow label="Address" value={project.address} />
            <InfoRow label="Parcel ID" value={project.parcelId} />
            <InfoRow label="Province/State" value={project.provinceState} />
            <InfoRow label="Country" value={project.country} />
            <InfoRow label="Units" value={project.units} />
          </Section>
          <Divider />
        </>
      )}

      {/* Notes */}
      {(project.ownerNotes || project.zoningNotes || project.accessNotes || project.waterRightsNotes) && (
        <>
          <Section title="Notes">
            {project.ownerNotes && <NoteBlock label="Owner Notes" text={project.ownerNotes} />}
            {project.zoningNotes && <NoteBlock label="Zoning" text={project.zoningNotes} />}
            {project.accessNotes && <NoteBlock label="Access & Utilities" text={project.accessNotes} />}
            {project.waterRightsNotes && <NoteBlock label="Water Rights" text={project.waterRightsNotes} />}
          </Section>
          <Divider />
        </>
      )}

      {/* Files & Attachments */}
      <Section title="Files">
        <FileList
          projectId={project.id}
          serverId={project.serverId}
          localAttachments={project.attachments}
        />
      </Section>

      {/* §3 Read-back of intake free-text fields */}
      <FieldObservationsLegalCard project={project} />

      {/* §3 Covenants + governance constraint picture */}
      <RestrictionsCovenantsCard project={project} />

      {/* §3 Zoning, access & utility envelope */}
      <ZoningAccessUtilityCard project={project} />

      {/* Enhanced Data Completeness */}
      <DataCompletenessWidget project={project} />

      <Divider />

      {/* Site Assessment */}
      <SiteAssessmentPanel project={project} />

      <Divider />

      {/* Regulatory & Permitting */}
      <RegulatoryPanel project={project} />

      <Divider />

      {/* Terrain Analysis Flags */}
      <TerrainAnalysisFlags project={project} layerData={mockLayers} />

      <Divider />

      {/* Version History */}
      <VersionHistory projectId={project.id} />

      <Divider />

      {/* Created date */}
      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--color-text-muted)' }}>
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: 10,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', fontSize: 12, padding: '2px 0' }}>
      <span style={{ width: 110, color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text)',
          lineHeight: 1.6,
          background: 'var(--color-surface)',
          padding: 10,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />;
}
