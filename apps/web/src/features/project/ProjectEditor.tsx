/**
 * ProjectEditor — inline editing for project details.
 * Slides open in the dashboard panel, saves to the local store.
 */

import { useState } from 'react';
import { useProjectStore, type LocalProject } from '../../store/projectStore.js';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

interface ProjectEditorProps {
  project: LocalProject;
  onClose: () => void;
}

export default function ProjectEditor({ project, onClose }: ProjectEditorProps) {
  const updateProject = useProjectStore((s) => s.updateProject);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [address, setAddress] = useState(project.address ?? '');
  const [parcelId, setParcelId] = useState(project.parcelId ?? '');
  const [ownerNotes, setOwnerNotes] = useState(project.ownerNotes ?? '');
  const [zoningNotes, setZoningNotes] = useState(project.zoningNotes ?? '');
  const [accessNotes, setAccessNotes] = useState(project.accessNotes ?? '');
  const [waterRightsNotes, setWaterRightsNotes] = useState(project.waterRightsNotes ?? '');
  // §1 save-candidates: stewards can also flip status from inside the editor.
  // Only 'active' ⇄ 'candidate' are toggleable here — archived/shared are
  // managed elsewhere (permissions surface / archive action).
  const [isCandidate, setIsCandidate] = useState(project.status === 'candidate');

  const handleSave = () => {
    const nextStatus: typeof project.status =
      isCandidate
        ? 'candidate'
        : project.status === 'candidate'
          ? 'active'
          : project.status;
    updateProject(project.id, {
      name: name.trim() || project.name,
      description: description.trim() || null,
      address: address.trim() || null,
      parcelId: parcelId.trim() || null,
      ownerNotes: ownerNotes.trim() || null,
      zoningNotes: zoningNotes.trim() || null,
      accessNotes: accessNotes.trim() || null,
      waterRightsNotes: waterRightsNotes.trim() || null,
      status: nextStatus,
    });
    onClose();
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Edit Project</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Project Name" value={name} onChange={setName} />
        <Field label="Description" value={description} onChange={setDescription} multiline />
        <Field label="Address" value={address} onChange={setAddress} />
        <Field label="Parcel / PIN" value={parcelId} onChange={setParcelId} />
        <Field label="Owner / Stakeholder Notes" value={ownerNotes} onChange={setOwnerNotes} multiline />
        <Field label="Zoning & Regulatory Notes" value={zoningNotes} onChange={setZoningNotes} multiline />
        <Field label="Access & Utility Notes" value={accessNotes} onChange={setAccessNotes} multiline />
        <Field label="Water Rights Notes" value={waterRightsNotes} onChange={setWaterRightsNotes} multiline />

        {/* §1 save-candidates — exploratory-candidate toggle. */}
        <div>
          <label style={labelStyle}>Status</label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              fontSize: 13,
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isCandidate}
              onChange={(e) => setIsCandidate(e.target.checked)}
            />
            <span style={{ flex: 1 }}>Mark as candidate (exploratory property)</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {isCandidate ? 'Candidate' : 'Active'}
            </span>
          </label>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            Candidates are grouped on the home screen so you can scan exploratory properties separately from active builds. Uncheck to promote to an active project.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-earth-600)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}
