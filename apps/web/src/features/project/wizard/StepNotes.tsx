/**
 * Step 4 — Notes & attachments (owner notes, zoning, access, water rights).
 * Final step: clicking "Create Project" saves to the store and navigates to the project.
 */

import { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import * as turf from '@turf/turf';
import { useProjectStore, type ProjectAttachment } from '../../../store/projectStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { api } from '../../../lib/apiClient.js';
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
  const { token } = useAuthStore();
  const [attachments, setAttachments] = useState<{ file: File; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pack the wizard's flat metadata fields into the shared ProjectMetadata
  // shape. Empty strings are dropped so jsonb stays minimal.
  const buildMetadata = () => {
    const md: Record<string, unknown> = {};
    if (data.climateRegion) md.climateRegion = data.climateRegion;
    if (data.bioregion) md.bioregion = data.bioregion;
    if (data.county) md.county = data.county;
    if (data.legalDescription) md.legalDescription = data.legalDescription;
    if (data.fieldObservations) md.fieldObservations = data.fieldObservations;
    if (data.restrictionsCovenants) md.restrictionsCovenants = data.restrictionsCovenants;
    if (data.mapProjection) md.mapProjection = data.mapProjection;
    const soilNotes: Record<string, string> = {};
    if (data.soilPh) soilNotes.ph = data.soilPh;
    if (data.soilOrganicMatter) soilNotes.organicMatter = data.soilOrganicMatter;
    if (data.soilCompaction) soilNotes.compaction = data.soilCompaction;
    if (data.soilBiologicalActivity) soilNotes.biologicalActivity = data.soilBiologicalActivity;
    if (Object.keys(soilNotes).length > 0) md.soilNotes = soilNotes;
    return Object.keys(md).length > 0 ? md : undefined;
  };

  const handleCreate = () => {
    const metadata = buildMetadata();

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
      metadata,
    });

    // Calculate acreage from boundary if available
    let acreage: number | null = null;
    const boundaryGeo = data.parcelBoundaryGeojson as GeoJSON.FeatureCollection | null;
    if (boundaryGeo) {
      try {
        const areaM2 = turf.area(boundaryGeo);
        acreage = project.units === 'metric'
          ? Math.round((areaM2 / 10000) * 100) / 100   // hectares
          : Math.round((areaM2 / 4046.86) * 100) / 100; // acres
      } catch {
        // Best-effort — leave null if calculation fails
      }
    }

    // Apply boundary + notes + calculated acreage
    updateProjectFn(project.id, {
      parcelBoundaryGeojson: boundaryGeo,
      hasParcelBoundary: boundaryGeo !== null,
      acreage,
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

    // Navigate immediately — local copy is the source of truth
    navigate({ to: '/project/$projectId', params: { projectId: project.id } });

    // Fire-and-forget backend sync (only when authenticated)
    if (token) {
      api.projects.create({
        name: data.name,
        description: data.description || undefined,
        address: data.address || undefined,
        parcelId: data.parcelId || undefined,
        projectType: (data.projectType as any) || undefined,
        country: data.country,
        provinceState: data.provinceState || undefined,
        units: data.units,
        metadata,
      }).then(async ({ data: serverProject }) => {
        // Store the backend-assigned UUID so future syncs can reference it
        updateProjectFn(project.id, { serverId: serverProject.id });

        // Push boundary if one was drawn
        const geo = data.parcelBoundaryGeojson;
        if (geo) {
          await api.projects.setBoundary(serverProject.id, geo);
        }

        // Upload file attachments to the server
        for (const att of attachments) {
          api.files.upload(serverProject.id, att.file).catch(() => {
            // Upload failure is non-fatal — local attachment is still in store
          });
        }
      }).catch(() => {
        // Backend unavailable — local copy is intact, sync will retry later
      });
    }
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
          <label style={labelStyle} htmlFor="notes-owner">Owner / Stakeholder Notes</label>
          <textarea
            id="notes-owner"
            value={data.ownerNotes}
            onChange={(e) => updateData({ ownerNotes: e.target.value })}
            placeholder="Vision for the property, current ownership, key contacts…"
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-zoning">Zoning & Regulatory Notes</label>
          <textarea
            id="notes-zoning"
            value={data.zoningNotes}
            onChange={(e) => updateData({ zoningNotes: e.target.value })}
            placeholder="Zoning designation, permitted uses, setbacks, covenants…"
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-access">Access & Utility Notes</label>
          <textarea
            id="notes-access"
            value={data.accessNotes}
            onChange={(e) => updateData({ accessNotes: e.target.value })}
            placeholder="Road access, easements, power, water, septic…"
            rows={2}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-water-rights">Water Rights Notes</label>
          <textarea
            id="notes-water-rights"
            value={data.waterRightsNotes}
            onChange={(e) => updateData({ waterRightsNotes: e.target.value })}
            placeholder="Existing water rights, wells, irrigation…"
            rows={2}
            style={inputStyle}
          />
        </div>

        {/* Long-tail metadata — persisted to projects.metadata jsonb. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle} htmlFor="notes-climate-region">Climate Region</label>
            <input
              id="notes-climate-region"
              type="text"
              value={data.climateRegion}
              onChange={(e) => updateData({ climateRegion: e.target.value })}
              placeholder="e.g. USDA 6a, Mediterranean"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="notes-bioregion">Bioregion</label>
            <input
              id="notes-bioregion"
              type="text"
              value={data.bioregion}
              onChange={(e) => updateData({ bioregion: e.target.value })}
              placeholder="e.g. Great Basin, Cascadia"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="notes-county">County</label>
            <input
              id="notes-county"
              type="text"
              value={data.county}
              onChange={(e) => updateData({ county: e.target.value })}
              placeholder="e.g. Sonoma County"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="notes-map-projection">Map Projection</label>
            <input
              id="notes-map-projection"
              type="text"
              value={data.mapProjection}
              onChange={(e) => updateData({ mapProjection: e.target.value })}
              placeholder="e.g. EPSG:4326, EPSG:26917"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-legal-description">Legal Description</label>
          <textarea
            id="notes-legal-description"
            value={data.legalDescription}
            onChange={(e) => updateData({ legalDescription: e.target.value })}
            placeholder="Metes and bounds, lot/block, section-township-range…"
            rows={2}
            style={inputStyle}
          />
        </div>

        {/* Soil notes — captured pre-site-visit; dashboard surfaces these
            alongside SSURGO / SoilGrids adapter output. Persisted to
            projects.metadata.soilNotes. */}
        <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            Soil Observations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="notes-soil-ph">pH (measured or observed)</label>
              <input
                id="notes-soil-ph"
                type="text"
                value={data.soilPh}
                onChange={(e) => updateData({ soilPh: e.target.value })}
                placeholder="e.g. 6.4, or 'slightly acidic'"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="notes-soil-organic-matter">Organic Matter</label>
              <input
                id="notes-soil-organic-matter"
                type="text"
                value={data.soilOrganicMatter}
                onChange={(e) => updateData({ soilOrganicMatter: e.target.value })}
                placeholder="e.g. 3.2%, 'dark topsoil ~20cm'"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="notes-soil-compaction">Compaction</label>
            <textarea
              id="notes-soil-compaction"
              value={data.soilCompaction}
              onChange={(e) => updateData({ soilCompaction: e.target.value })}
              placeholder="Penetrometer readings, hardpan depth, observed compaction…"
              rows={2}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="notes-soil-biological-activity">Biological Activity</label>
            <textarea
              id="notes-soil-biological-activity"
              value={data.soilBiologicalActivity}
              onChange={(e) => updateData({ soilBiologicalActivity: e.target.value })}
              placeholder="Earthworms, fungal mats, root systems, smell, colour…"
              rows={2}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-field-observations">Field Observations</label>
          <textarea
            id="notes-field-observations"
            value={data.fieldObservations}
            onChange={(e) => updateData({ fieldObservations: e.target.value })}
            placeholder="Walk-through notes, visible features, seasonal signs…"
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="notes-restrictions-covenants">Restrictions & Covenants</label>
          <textarea
            id="notes-restrictions-covenants"
            value={data.restrictionsCovenants}
            onChange={(e) => updateData({ restrictionsCovenants: e.target.value })}
            placeholder="HOA rules, conservation easements, deed restrictions…"
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
              aria-label="Add attachments"
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
