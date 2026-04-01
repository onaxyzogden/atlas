/**
 * Step 4 — Notes & attachments (owner notes, zoning, access, water rights).
 * Final step: clicking "Create Project" saves to the store and navigates to the project.
 */

import { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProjectStore, type ProjectAttachment } from '../../../store/projectStore.js';
import type { WizardStepProps } from './types.js';
import WizardNav from './WizardNav.js';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

export default function StepNotes({ data, updateData, onBack, isFirst, isLast }: WizardStepProps) {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);
  const updateProjectFn = useProjectStore((s) => s.updateProject);
  const addAttachment = useProjectStore((s) => s.addAttachment);
  const [attachments, setAttachments] = useState<{ file: File; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    // Create the project
    const project = createProject({
      name: data.name,
      description: data.description || undefined,
      address: data.address || undefined,
      parcelId: data.parcelId || undefined,
      projectType: (data.projectType as any) || undefined,
      country: data.country,
      provinceState: data.provinceState || undefined,
      units: data.units,
    });

    // Apply boundary + notes
    updateProjectFn(project.id, {
      parcelBoundaryGeojson: (data.parcelBoundaryGeojson as GeoJSON.FeatureCollection | null) ?? null,
      hasParcelBoundary: data.parcelBoundaryGeojson !== null,
      ownerNotes: data.ownerNotes || null,
      zoningNotes: data.zoningNotes || null,
      accessNotes: data.accessNotes || null,
      waterRightsNotes: data.waterRightsNotes || null,
    });

    // Add file attachments
    for (const att of attachments) {
      const attachment: ProjectAttachment = {
        id: crypto.randomUUID(),
        filename: att.file.name,
        type: detectFileType(att.file.name),
        size: att.file.size,
        addedAt: new Date().toISOString(),
        data: null,
      };
      addAttachment(project.id, attachment);
    }

    // Navigate to the new project
    navigate({ to: '/project/$projectId', params: { projectId: project.id } });
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, type: detectFileType(f.name) })),
    ]);
    e.target.value = '';
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px', overflowY: 'auto', height: '100%' }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 8, color: 'var(--color-text)' }}>
        Notes & Attachments
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
        Add context that will help the Atlas understand this property. All fields are optional.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Owner / Stakeholder Notes</label>
          <textarea
            value={data.ownerNotes}
            onChange={(e) => updateData({ ownerNotes: e.target.value })}
            placeholder="Vision for the property, current ownership, key contacts…"
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Zoning & Regulatory Notes</label>
          <textarea
            value={data.zoningNotes}
            onChange={(e) => updateData({ zoningNotes: e.target.value })}
            placeholder="Zoning designation, permitted uses, setbacks, covenants…"
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Access & Utility Notes</label>
          <textarea
            value={data.accessNotes}
            onChange={(e) => updateData({ accessNotes: e.target.value })}
            placeholder="Road access, easements, power, water, septic…"
            rows={2}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Water Rights Notes</label>
          <textarea
            value={data.waterRightsNotes}
            onChange={(e) => updateData({ waterRightsNotes: e.target.value })}
            placeholder="Existing water rights, wells, irrigation…"
            rows={2}
            style={inputStyle}
          />
        </div>

        {/* File attachments */}
        <div>
          <label style={labelStyle}>Attachments</label>
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'var(--transition-base)',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Drop files here or <span style={{ color: 'var(--color-earth-600)', fontWeight: 500 }}>browse</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Photos, site plans, title maps, survey documents
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAddFiles}
              style={{ display: 'none' }}
            />
          </div>

          {/* Attachment list */}
          {attachments.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.map((att, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--color-earth-600)' }}>
                    {att.type === 'photo' ? '🖼' : '📄'}
                  </span>
                  <span style={{ flex: 1, color: 'var(--color-text)' }}>{att.file.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {formatFileSize(att.file.size)}
                  </span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <WizardNav
        onBack={onBack}
        onNext={handleCreate}
        isFirst={isFirst}
        isLast={isLast}
        nextLabel="Create Project"
      />
    </div>
  );
}

function detectFileType(name: string): ProjectAttachment['type'] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.kml')) return 'kml';
  if (lower.endsWith('.kmz')) return 'kmz';
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return 'geojson';
  if (lower.endsWith('.shp') || lower.endsWith('.zip')) return 'shapefile';
  if (/\.(jpe?g|png|gif|webp|heic|tiff?)$/i.test(lower)) return 'photo';
  return 'document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
