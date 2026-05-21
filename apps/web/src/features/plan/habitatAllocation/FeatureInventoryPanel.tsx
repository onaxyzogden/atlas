/**
 * Habitat-feature inventory — list + add/remove the discrete habitat
 * commitments (wildlife pond, owl boxes, hawk perches, hedgerow length,
 * …) recorded in the local-first `habitatFeatureStore`. Includes a
 * one-line rollup tally.
 */

import { useMemo, useState } from 'react';
import {
  useHabitatFeatureStore,
  featuresForProject,
  HABITAT_FEATURE_TYPES,
  HABITAT_FEATURE_TYPE_KEYS,
  type HabitatFeature,
  type HabitatFeatureType,
} from '../../../store/habitatFeatureStore.js';
import { useDesignElementsForProject } from '../../../store/builtEnvironmentSelectors.js';
import {
  selectPlacedHabitatCommitments,
  type HabitatCommitmentTally,
} from '../../biodiversity/habitatCommitments.js';

interface Props {
  projectId: string;
}

const uid = () =>
  `hf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function rollup(features: HabitatFeature[]): string {
  if (features.length === 0) return 'No habitat features recorded yet.';
  const byType = new Map<HabitatFeatureType, number>();
  const lineByType = new Map<HabitatFeatureType, number>();
  for (const f of features) {
    if (f.kind === 'line') {
      lineByType.set(f.type, (lineByType.get(f.type) ?? 0) + (f.lengthM ?? 0));
    } else {
      byType.set(f.type, (byType.get(f.type) ?? 0) + (f.quantity ?? 1));
    }
  }
  const parts: string[] = [];
  for (const [t, n] of byType)
    parts.push(`${n} ${HABITAT_FEATURE_TYPES[t].label.toLowerCase()}`);
  for (const [t, m] of lineByType)
    parts.push(`${Math.round(m)} m ${HABITAT_FEATURE_TYPES[t].label.toLowerCase()}`);
  return parts.join(' · ');
}

function formatCommitmentValue(row: HabitatCommitmentTally): string {
  if (row.unit === 'length-m') return `${Math.round(row.totalLengthM)} m`;
  if (row.unit === 'area-m2') return `${Math.round(row.totalAreaM2)} m²`;
  return `×${row.placed}`;
}

export default function FeatureInventoryPanel({ projectId }: Props) {
  const features = useHabitatFeatureStore((s) => s.features);
  const addFeature = useHabitatFeatureStore((s) => s.addFeature);
  const removeFeature = useHabitatFeatureStore((s) => s.removeFeature);
  const designElements = useDesignElementsForProject(projectId);
  const placedCommitments = useMemo(
    () => selectPlacedHabitatCommitments(designElements),
    [designElements],
  );

  const mine = useMemo(
    () => featuresForProject(features, projectId),
    [features, projectId],
  );

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<HabitatFeatureType>('owl_box');
  const [amount, setAmount] = useState('1');
  const [notes, setNotes] = useState('');

  const kind = HABITAT_FEATURE_TYPES[type].kind;
  const isLine = kind === 'line';

  function add() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    const now = new Date().toISOString();
    addFeature({
      id: uid(),
      projectId,
      type,
      kind,
      ...(isLine ? { lengthM: n } : { quantity: n }),
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setAmount('1');
    setNotes('');
    setOpen(false);
  }

  return (
    <div>
      {placedCommitments.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(127,209,174,0.25)',
            background: 'rgba(79,176,165,0.06)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: 'rgba(189,240,212,0.85)',
              marginBottom: 6,
            }}
          >
            Placed on map
          </div>
          {placedCommitments.map((row) => (
            <div
              key={row.kind}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                fontSize: 12,
                color: 'rgba(232,220,200,0.85)',
                padding: '3px 0',
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: 'rgba(232,220,200,0.7)' }}>
                {formatCommitmentValue(row)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p
        style={{
          fontSize: 13,
          color: 'rgba(232,220,200,0.75)',
          margin: '0 0 12px',
          lineHeight: 1.5,
        }}
      >
        {rollup(mine)}
      </p>

      {mine.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {mine.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                fontSize: 12,
                color: 'rgba(232,220,200,0.8)',
                padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span>
                {HABITAT_FEATURE_TYPES[f.type].label}
                {' — '}
                {f.kind === 'line'
                  ? `${Math.round(f.lengthM ?? 0)} m`
                  : `×${f.quantity ?? 1}`}
                {f.notes && (
                  <span style={{ opacity: 0.55 }}> · {f.notes}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => removeFeature(f.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(217,139,111,0.85)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={btnStyle}>
          + Add habitat feature
        </button>
      ) : (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}
          >
            <label style={lblStyle}>
              Feature
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as HabitatFeatureType;
                  setType(t);
                  setAmount(HABITAT_FEATURE_TYPES[t].kind === 'line' ? '100' : '1');
                }}
                style={inputStyle}
              >
                {HABITAT_FEATURE_TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {HABITAT_FEATURE_TYPES[k].label}
                  </option>
                ))}
              </select>
            </label>
            <label style={lblStyle}>
              {isLine ? 'Length (m)' : 'Count'}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ ...lblStyle, flex: '2 1 220px' }}>
              Notes <span style={{ opacity: 0.5 }}>(optional)</span>
              <input
                type="text"
                value={notes}
                placeholder="e.g. along the north riparian corridor"
                onChange={(e) => setNotes(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={add} style={btnStyle}>
              Add
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ ...btnStyle, background: 'transparent' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(79,176,165,0.4)',
  background: 'rgba(79,176,165,0.12)',
  color: '#cdeede',
  fontSize: 13,
  cursor: 'pointer',
};

const lblStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'rgba(232,220,200,0.7)',
  flex: '1 1 160px',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 9px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.25)',
  color: '#e8dcc8',
  fontSize: 13,
};
