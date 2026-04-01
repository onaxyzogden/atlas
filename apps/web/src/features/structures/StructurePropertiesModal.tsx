/**
 * StructurePropertiesModal — modal for configuring a structure.
 * Used both for new placement and editing existing structures.
 * Includes size (width/depth) and orientation (rotation) controls.
 */

import { useState } from 'react';
import type { StructureType, Structure } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from './footprints.js';

interface NewPlacementProps {
  mode: 'new';
  structureType: StructureType;
  onSave: (data: { name: string; phase: string; notes: string; widthM: number; depthM: number; rotationDeg: number }) => void;
  onCancel: () => void;
}

interface EditProps {
  mode: 'edit';
  structure: Structure;
  onSave: (data: { name: string; phase: string; notes: string; widthM: number; depthM: number; rotationDeg: number }) => void;
  onCancel: () => void;
}

type StructurePropertiesModalProps = NewPlacementProps | EditProps;

export default function StructurePropertiesModal(props: StructurePropertiesModalProps) {
  const { onSave, onCancel } = props;
  const isEdit = props.mode === 'edit';
  const structureType = isEdit ? props.structure.type : props.structureType;
  const template = STRUCTURE_TEMPLATES[structureType];

  const [name, setName] = useState(isEdit ? props.structure.name : template.label);
  const [phase, setPhase] = useState(isEdit ? props.structure.phase : 'Phase 1');
  const [notes, setNotes] = useState(isEdit ? props.structure.notes : '');
  const [widthM, setWidthM] = useState(isEdit ? props.structure.widthM : template.widthM);
  const [depthM, setDepthM] = useState(isEdit ? props.structure.depthM : template.depthM);
  const [rotationDeg, setRotationDeg] = useState(isEdit ? props.structure.rotationDeg : 0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), phase, notes, widthM, depthM, rotationDeg });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 12,
    background: 'var(--color-panel-subtle)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: 'var(--color-panel-text)',
    outline: 'none',
    fontFamily: 'inherit',
    marginBottom: 12,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440, maxWidth: '90vw',
          background: 'var(--color-panel-bg)',
          border: '1px solid rgba(196, 162, 101, 0.15)',
          borderRadius: 14,
          padding: '28px 32px',
          color: 'var(--color-panel-text)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          {isEdit ? 'Edit Structure' : 'Place Structure'}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 16 }}>
          {template.description}
        </p>

        {/* Info badge */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            padding: '8px 10px',
            background: 'rgba(196, 162, 101, 0.06)',
            borderRadius: 8,
            border: '1px solid rgba(196, 162, 101, 0.1)',
            fontSize: 11,
            color: 'var(--color-panel-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span>${template.costRange[0].toLocaleString()}{'\u2013'}${template.costRange[1].toLocaleString()}</span>
          {template.infrastructureReqs.length > 0 && (
            <>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>Requires: {template.infrastructureReqs.join(', ')}</span>
            </>
          )}
        </div>

        {/* Name */}
        <label style={labelStyle}>Structure Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ ...inputStyle, fontSize: 13, padding: '10px 12px' }} />

        {/* Size controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Width: {widthM}m</label>
            <input
              type="range"
              min={1} max={Math.max(30, widthM + 5)} step={0.5}
              value={widthM}
              onChange={(e) => setWidthM(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#c4a265' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Depth: {depthM}m</label>
            <input
              type="range"
              min={1} max={Math.max(30, depthM + 5)} step={0.5}
              value={depthM}
              onChange={(e) => setDepthM(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#c4a265' }}
            />
          </div>
        </div>

        {/* Rotation */}
        <label style={labelStyle}>Orientation: {rotationDeg}{'\u00B0'}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input
            type="range"
            min={0} max={360} step={5}
            value={rotationDeg}
            onChange={(e) => setRotationDeg(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#c4a265' }}
          />
          <div
            style={{
              width: 36, height: 36,
              border: '1px solid rgba(196,162,101,0.3)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 20, height: 14,
                background: 'rgba(196,162,101,0.3)',
                border: '1px solid rgba(196,162,101,0.6)',
                borderRadius: 2,
                transform: `rotate(${rotationDeg}deg)`,
                transition: 'transform 100ms ease',
              }}
            />
          </div>
        </div>

        {/* Footprint summary */}
        <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 12, textAlign: 'center' }}>
          {widthM}m {'\u00D7'} {depthM}m = {(widthM * depthM).toFixed(0)} m{'\u00B2'} ({(widthM * depthM / 4046.86 * 10000).toFixed(0)} ft{'\u00B2'})
        </div>

        {/* Phase */}
        <label style={labelStyle}>Build Phase</label>
        <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="Phase 1">Phase 1 {'\u2014'} Year 0-1</option>
          <option value="Phase 2">Phase 2 {'\u2014'} Year 1-3</option>
          <option value="Phase 3">Phase 3 {'\u2014'} Year 3-5</option>
          <option value="Phase 4">Phase 4 {'\u2014'} Year 5+</option>
        </select>

        {/* Notes */}
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Purpose, orientation, design notes..."
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 8, letterSpacing: '0.02em',
              background: name.trim() ? 'rgba(196, 162, 101, 0.2)' : 'var(--color-panel-subtle)',
              color: name.trim() ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {isEdit ? 'Save Changes' : 'Place Structure'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'transparent', color: 'var(--color-panel-muted)', cursor: 'pointer' };
