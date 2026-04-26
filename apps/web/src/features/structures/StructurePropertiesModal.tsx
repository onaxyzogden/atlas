/**
 * StructurePropertiesModal — modal for configuring a structure.
 * Used both for new placement and editing existing structures.
 * Includes size (width/depth) and orientation (rotation) controls.
 */

import { useState } from 'react';
import type { StructureType, Structure } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from './footprints.js';
import { semantic, zIndex } from '../../lib/tokens.js';

/**
 * Save payload for both new-placement and edit flows. Labor / material
 * fields are optional so legacy call sites keep working, and a blank
 * input round-trips as `undefined` rather than `0`.
 */
export interface StructureModalSaveData {
  name: string;
  phase: string;
  notes: string;
  widthM: number;
  depthM: number;
  rotationDeg: number;
  /**
   * §9 infrastructure-cost-placeholder-per-structure. `null` preserves
   * the historical empty state (no cost set); a number overrides the
   * template midrange default. The caller decides how to round-trip
   * `undefined` (typically: treat it the same as a no-op and retain the
   * existing value on edit).
   */
  costEstimate?: number | null;
  laborHoursEstimate?: number;
  materialTonnageEstimate?: number;
  /**
   * §9 multi-story-structure-support. Number of habitable stories (1, 2,
   * or 3 in the UI). Multiplies usable floor area and rough cost.
   * Optional / absent = treat as 1.
   */
  storiesCount?: number;
}

interface NewPlacementProps {
  mode: 'new';
  structureType: StructureType;
  /**
   * Optional latitude (degrees) of the placement point. Enables the
   * §9 building-orientation feedback card. Omit to hide the card.
   */
  lat?: number;
  onSave: (data: StructureModalSaveData) => void;
  onCancel: () => void;
}

interface EditProps {
  mode: 'edit';
  structure: Structure;
  onSave: (data: StructureModalSaveData) => void;
  onCancel: () => void;
}

type StructurePropertiesModalProps = NewPlacementProps | EditProps;

/* §9 alternate-footprint-options — three preset sizes derived from the
   template's recommended dimensions. Lets stewards quickly see what a
   smaller / larger version of the same structure would mean for area
   and rough cost without having to fiddle with both sliders. */
const ALT_FOOTPRINT_PRESETS = [
  { id: 'compact', label: 'Compact', factor: 0.75, blurb: 'Tighter footprint' },
  { id: 'default', label: 'Default', factor: 1.0, blurb: 'Template midrange' },
  { id: 'roomy',   label: 'Roomy',   factor: 1.3, blurb: 'More floor area' },
] as const;

function snapToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/* §9 multi-story-structure-support — three stories is enough for any
   plausible homestead structure. The map polygon stays single-level;
   stories only multiply usable floor area + cost in the modal. */
const STORY_OPTIONS = [1, 2, 3] as const;

export default function StructurePropertiesModal(props: StructurePropertiesModalProps) {
  const { onSave, onCancel } = props;
  const isEdit = props.mode === 'edit';
  const structureType = isEdit ? props.structure.type : props.structureType;
  const template = STRUCTURE_TEMPLATES[structureType];
  // §9 building-orientation feedback — needs a latitude to know which
  // hemisphere the steward is designing in. Edit mode reads it off the
  // existing structure; new mode accepts it as an optional prop.
  const lat: number | null = isEdit ? props.structure.center[1] : props.lat ?? null;

  const [name, setName] = useState(isEdit ? props.structure.name : template.label);
  const [phase, setPhase] = useState(isEdit ? props.structure.phase : 'Phase 1');
  const [notes, setNotes] = useState(isEdit ? props.structure.notes : '');
  const [widthM, setWidthM] = useState(isEdit ? props.structure.widthM : template.widthM);
  const [depthM, setDepthM] = useState(isEdit ? props.structure.depthM : template.depthM);
  const [rotationDeg, setRotationDeg] = useState(isEdit ? props.structure.rotationDeg : 0);
  // §15 cost-labor-material-per-phase — optional rollup inputs. Stored as
  // strings so a blank field round-trips as `undefined` on save rather
  // than an accidental `0`.
  const [laborHours, setLaborHours] = useState<string>(
    isEdit && typeof props.structure.laborHoursEstimate === 'number'
      ? String(props.structure.laborHoursEstimate)
      : '',
  );
  const [materialTons, setMaterialTons] = useState<string>(
    isEdit && typeof props.structure.materialTonnageEstimate === 'number'
      ? String(props.structure.materialTonnageEstimate)
      : '',
  );
  // §9 infrastructure-cost-placeholder-per-structure — editable cost.
  // On new placement, prefill with the template midrange so the value
  // stewards see in the info badge is the same number stored on save.
  // On edit, prefill with the saved value (or empty if it was cleared).
  const templateMidCost = Math.round((template.costRange[0] + template.costRange[1]) / 2);
  const [costEstimate, setCostEstimate] = useState<string>(
    isEdit
      ? typeof props.structure.costEstimate === 'number'
        ? String(props.structure.costEstimate)
        : ''
      : String(templateMidCost),
  );
  // §9 multi-story-structure-support — defaults to 1 (no behaviour change
  // for legacy structures that don't have the field).
  const [storiesCount, setStoriesCount] = useState<number>(
    isEdit ? props.structure.storiesCount ?? 1 : 1,
  );

  /* §9 alternate-footprint-options — three preset sizes derived from the
     template. Clicking a preset snaps width / depth and updates cost
     proportional to area (linear approximation; foundation and plumbing
     don't actually scale linearly, but this is a steward-facing
     conversation starter, not a quote). */
  const altPresets = ALT_FOOTPRINT_PRESETS.map((p) => {
    const w = snapToHalf(template.widthM * p.factor);
    const d = snapToHalf(template.depthM * p.factor);
    const area = w * d;
    const defaultArea = template.widthM * template.depthM;
    /* §9 multi-story-structure-support — preset cost scales with both
       footprint area and stories count so the chip preview matches what
       the steward will actually save. */
    const cost = Math.round(
      templateMidCost * (defaultArea === 0 ? 1 : area / defaultArea) * storiesCount,
    );
    const isActive = w === widthM && d === depthM;
    return { ...p, w, d, area, cost, isActive };
  });

  const applyPreset = (w: number, d: number, cost: number) => {
    setWidthM(w);
    setDepthM(d);
    setCostEstimate(String(cost));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const parseOptionalPositive = (raw: string): number | undefined => {
      const trimmed = raw.trim();
      if (trimmed === '') return undefined;
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    // §9 cost: blank → null (explicit "no cost set"); non-positive → null;
    // positive number → that number.
    const parseCost = (raw: string): number | null => {
      const trimmed = raw.trim();
      if (trimmed === '') return null;
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    };
    onSave({
      name: name.trim(),
      phase,
      notes,
      widthM,
      depthM,
      rotationDeg,
      costEstimate: parseCost(costEstimate),
      laborHoursEstimate: parseOptionalPositive(laborHours),
      materialTonnageEstimate: parseOptionalPositive(materialTons),
      storiesCount,
    });
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
        zIndex: zIndex.modal,
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
        <label style={labelStyle} htmlFor="structure-name">Structure Name *</label>
        <input id="structure-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ ...inputStyle, fontSize: 13, padding: '10px 12px' }} />

        {/* Size controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="structure-width">Width: {widthM}m</label>
            <input
              id="structure-width"
              type="range"
              min={1} max={Math.max(30, widthM + 5)} step={0.5}
              value={widthM}
              onChange={(e) => setWidthM(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: semantic.sidebarActive }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="structure-depth">Depth: {depthM}m</label>
            <input
              id="structure-depth"
              type="range"
              min={1} max={Math.max(30, depthM + 5)} step={0.5}
              value={depthM}
              onChange={(e) => setDepthM(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: semantic.sidebarActive }}
            />
          </div>
        </div>

        {/* §9 alternate-footprint-options — preset chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Alternate sizes</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {altPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.w, p.d, p.cost)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: 8,
                  border: p.isActive
                    ? '1px solid rgba(196, 162, 101, 0.55)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: p.isActive
                    ? 'rgba(196, 162, 101, 0.12)'
                    : 'rgba(255,255,255,0.025)',
                  color: 'var(--color-panel-text)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  lineHeight: 1.2,
                }}
                title={p.blurb}
              >
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--color-panel-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {p.w}{'\u00D7'}{p.d}m {'\u00B7'} {p.area.toFixed(0)}m{'\u00B2'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--color-panel-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  ~${p.cost.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--color-panel-muted)', marginTop: 6, opacity: 0.7 }}>
            Cost scales linearly with floor area {'\u2014'} a conversation starter, not a quote.
          </div>
        </div>

        {/* Rotation */}
        <label style={labelStyle} htmlFor="structure-rotation">Orientation: {rotationDeg}{'\u00B0'}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input
            id="structure-rotation"
            type="range"
            min={0} max={360} step={5}
            value={rotationDeg}
            onChange={(e) => setRotationDeg(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: semantic.sidebarActive }}
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

        {/* §9 building-orientation feedback — only when we know lat */}
        <OrientationFeedback rotationDeg={rotationDeg} widthM={widthM} depthM={depthM} lat={lat} onRecommend={(r) => setRotationDeg(r)} />

        {/* Footprint summary */}
        <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 12, textAlign: 'center' }}>
          {widthM}m {'\u00D7'} {depthM}m = {(widthM * depthM).toFixed(0)} m{'\u00B2'} ({(widthM * depthM / 4046.86 * 10000).toFixed(0)} ft{'\u00B2'})
          {storiesCount > 1 && (
            <>
              {' '}{'\u00B7'} {storiesCount} stories ={' '}
              <strong style={{ color: 'var(--color-panel-text)', fontWeight: 600 }}>
                {(widthM * depthM * storiesCount).toFixed(0)} m{'\u00B2'} floor
              </strong>
            </>
          )}
        </div>

        {/* §9 multi-story-structure-support — stories selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Stories</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STORY_OPTIONS.map((n) => {
              const active = n === storiesCount;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStoriesCount(n)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: active
                      ? '1px solid rgba(196, 162, 101, 0.55)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: active
                      ? 'rgba(196, 162, 101, 0.12)'
                      : 'rgba(255,255,255,0.025)',
                    color: 'var(--color-panel-text)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                  title={`${n}${n === 1 ? ' story' : ' stories'}`}
                >
                  {n} {n === 1 ? 'story' : 'stories'}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--color-panel-muted)', marginTop: 6, opacity: 0.7 }}>
            Multiplies usable floor area and the rough cost preview. Map footprint stays single-level.
          </div>
        </div>

        {/* Phase */}
        <label style={labelStyle} htmlFor="structure-phase">Build Phase</label>
        <select id="structure-phase" value={phase} onChange={(e) => setPhase(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="Phase 1">Phase 1 {'\u2014'} Year 0-1</option>
          <option value="Phase 2">Phase 2 {'\u2014'} Year 1-3</option>
          <option value="Phase 3">Phase 3 {'\u2014'} Year 3-5</option>
          <option value="Phase 4">Phase 4 {'\u2014'} Year 5+</option>
        </select>

        {/* §9 infrastructure-cost-placeholder-per-structure — editable cost */}
        <label style={labelStyle} htmlFor="structure-cost">
          Estimated Cost ($){' '}
          <span style={{ opacity: 0.55 }}>
            template midrange ${template.costRange[0].toLocaleString()}{'\u2013'}${template.costRange[1].toLocaleString()}
          </span>
        </label>
        <input
          id="structure-cost"
          type="number"
          min={0}
          step={100}
          value={costEstimate}
          onChange={(e) => setCostEstimate(e.target.value)}
          placeholder="e.g. 12000"
          style={inputStyle}
        />

        {/* §15 cost-labor-material-per-phase — optional rollup inputs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="structure-labor">
              Labor (hrs) <span style={{ opacity: 0.55 }}>optional</span>
            </label>
            <input
              id="structure-labor"
              type="number"
              min={0}
              step={1}
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              placeholder="e.g. 120"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="structure-material">
              Material (t) <span style={{ opacity: 0.55 }}>optional</span>
            </label>
            <input
              id="structure-material"
              type="number"
              min={0}
              step={0.1}
              value={materialTons}
              onChange={(e) => setMaterialTons(e.target.value)}
              placeholder="e.g. 3.5"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <label style={labelStyle} htmlFor="structure-notes">Notes</label>
        <textarea
          id="structure-notes"
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

/* ─── §9 Building-Orientation Feedback ────────────────────────────────
 *
 * Surfaces live feedback as the steward rotates the structure: how far
 * the long axis sits from true East–West (the passive-solar baseline in
 * both hemispheres), an estimated impact on winter solar gain, which
 * face is the "long" side, and a one-click "snap to optimal" action.
 *
 * Heuristic, not a building-physics simulation. The cosine-squared
 * impact estimate is a steward-facing conversation starter sized to
 * match the rest of the modal's costing/labor placeholders.
 *
 * Convention assumed: rotationDeg = 0 means the structure's `widthM`
 * axis runs East–West (the long side faces South in the NH). This
 * matches how `createFootprintPolygon` lays the rectangle out before
 * applying rotation.
 */
function OrientationFeedback({
  rotationDeg,
  widthM,
  depthM,
  lat,
  onRecommend,
}: {
  rotationDeg: number;
  widthM: number;
  depthM: number;
  lat: number | null;
  onRecommend: (rot: number) => void;
}) {
  if (lat === null || !Number.isFinite(lat)) return null;

  // The "long axis" runs along the longer dimension. If depth > width,
  // the user has flipped what counts as the long side, so the optimal
  // rotation is 90° offset.
  const longIsWidth = widthM >= depthM;
  const optimalRot = longIsWidth ? 0 : 90;

  // Effective offset (0–90°) of the long axis from true East–West.
  let raw = ((rotationDeg - optimalRot) % 180 + 180) % 180;
  if (raw > 90) raw = 180 - raw;
  const offsetDeg = raw;

  // cos²(theta) impact on direct south-facing exposure. Rough.
  const cosTheta = Math.cos((offsetDeg * Math.PI) / 180);
  const exposureFactor = cosTheta * cosTheta;
  const lossPct = Math.round((1 - exposureFactor) * 100);

  let tone: 'good' | 'fair' | 'poor';
  let toneLabel: string;
  let toneColor: string;
  if (offsetDeg <= 15) {
    tone = 'good';
    toneLabel = 'Well-aligned';
    toneColor = 'rgba(180, 200, 150, 0.85)';
  } else if (offsetDeg <= 35) {
    tone = 'fair';
    toneLabel = 'Acceptable';
    toneColor = 'rgba(220, 180, 100, 0.85)';
  } else {
    tone = 'poor';
    toneLabel = 'Off-axis';
    toneColor = 'rgba(220, 130, 110, 0.85)';
  }

  const hemisphere = lat >= 0 ? 'NH' : 'SH';
  const longFaces = hemisphere === 'NH' ? 'south' : 'north';
  const recommendation =
    tone === 'good'
      ? `Long side faces ${longFaces} within ${offsetDeg.toFixed(0)}° of optimal — winter sun captured efficiently.`
      : tone === 'fair'
        ? `Long side ${offsetDeg.toFixed(0)}° off ${longFaces}-facing axis — losing roughly ${lossPct}% of direct winter exposure vs. an aligned ridge.`
        : `Long side ${offsetDeg.toFixed(0)}° off ${longFaces}-facing axis — roughly ${lossPct}% direct winter exposure lost. Consider rotating toward optimal.`;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.022)',
        border: '1px solid rgba(232,220,200,0.06)',
        borderLeft: `3px solid ${toneColor}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-panel-text)' }}>
          Solar orientation
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 4,
            color: toneColor,
            border: `1px solid ${toneColor}`,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {toneLabel}
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.5,
          color: 'rgba(220,210,185,0.82)',
          fontStyle: 'italic',
        }}
      >
        {recommendation}
      </div>
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 10.5,
          color: 'var(--color-panel-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>
          {hemisphere} · lat {lat.toFixed(2)}° · {offsetDeg.toFixed(0)}° off E–W
        </span>
        {tone !== 'good' && (
          <button
            type="button"
            onClick={() => onRecommend(optimalRot)}
            style={{
              fontSize: 10.5,
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid rgba(196,162,101,0.35)',
              background: 'rgba(196,162,101,0.08)',
              color: 'rgba(232,200,130,0.9)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            title={`Snap rotation to ${optimalRot}°`}
          >
            Snap to {optimalRot}°
          </button>
        )}
      </div>
    </div>
  );
}
