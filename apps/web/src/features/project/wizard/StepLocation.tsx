/**
 * Step 2 — Address, parcel ID, province/state, optional coordinates.
 */

import { useState } from 'react';
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

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

function isLatValid(s: string): boolean {
  if (s.trim() === '') return true;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function isLngValid(s: string): boolean {
  if (s.trim() === '') return true;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/** Parse "43.65, -79.38" or "43.65 -79.38" into [lat, lng] strings. */
function parsePastedCoords(raw: string): [string, string] | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return [m[1]!, m[2]!];
}

export default function StepLocation({ data, updateData, onNext, onBack, isFirst, isLast }: WizardStepProps) {
  const regions = data.country === 'CA' ? CA_PROVINCES : US_STATES;
  const regionLabel = data.country === 'CA' ? 'Province / Territory' : 'State';

  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const latValid = isLatValid(data.centerLat);
  const lngValid = isLngValid(data.centerLng);

  const handlePaste = (raw: string) => {
    setPasteValue(raw);
    if (raw.trim() === '') {
      setPasteError(null);
      return;
    }
    const parsed = parsePastedCoords(raw);
    if (!parsed) {
      setPasteError('Format: "lat, lng" (e.g. 43.65, -79.38)');
      return;
    }
    const [lat, lng] = parsed;
    if (!isLatValid(lat) || !isLngValid(lng)) {
      setPasteError('Coordinates out of range');
      return;
    }
    setPasteError(null);
    updateData({ centerLat: lat, centerLng: lng });
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 8, color: 'var(--color-text)' }}>
        Where is the property?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
        Help us locate the property. An address or parcel ID helps auto-fetch terrain, soils, and climate data.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Address */}
        <div>
          <label style={labelStyle}>Property Address</label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => updateData({ address: e.target.value })}
            placeholder="e.g. 1234 Concession Rd 5, Milton, ON"
            style={inputStyle}
            autoFocus
          />
        </div>

        {/* Province/State + Parcel ID row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>{regionLabel}</label>
            <select
              value={data.provinceState}
              onChange={(e) => updateData({ provinceState: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Parcel / PIN</label>
            <input
              type="text"
              value={data.parcelId}
              onChange={(e) => updateData({ parcelId: e.target.value })}
              placeholder="e.g. 2024-001-123-45"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Coordinates row */}
        <div>
          <label style={labelStyle}>Map Center Coordinates (optional)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={data.centerLat}
                onChange={(e) => updateData({ centerLat: e.target.value })}
                placeholder="Latitude (e.g. 43.65)"
                style={{
                  ...inputStyle,
                  borderColor: latValid ? 'var(--color-border)' : 'var(--color-confidence-low)',
                }}
              />
              {!latValid && (
                <div style={{ fontSize: 11, color: 'var(--color-confidence-low)', marginTop: 4 }}>
                  Latitude must be between -90 and 90
                </div>
              )}
            </div>
            <div>
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={data.centerLng}
                onChange={(e) => updateData({ centerLng: e.target.value })}
                placeholder="Longitude (e.g. -79.38)"
                style={{
                  ...inputStyle,
                  borderColor: lngValid ? 'var(--color-border)' : 'var(--color-confidence-low)',
                }}
              />
              {!lngValid && (
                <div style={{ fontSize: 11, color: 'var(--color-confidence-low)', marginTop: 4 }}>
                  Longitude must be between -180 and 180
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              value={pasteValue}
              onChange={(e) => handlePaste(e.target.value)}
              placeholder='Or paste "lat, lng" from Google Maps'
              style={{
                ...inputStyle,
                fontSize: 12,
                padding: '8px 12px',
                borderColor: pasteError ? 'var(--color-confidence-low)' : 'var(--color-border)',
              }}
            />
            {pasteError && (
              <div style={{ fontSize: 11, color: 'var(--color-confidence-low)', marginTop: 4 }}>
                {pasteError}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Used to center the map on Step 3 if the address can&apos;t be geocoded.
          </div>
        </div>

        {/* Helpful hint */}
        <div
          style={{
            background: 'var(--color-earth-100)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            fontSize: 12,
            color: 'var(--color-earth-700)',
            lineHeight: 1.6,
          }}
        >
          <strong>Tip:</strong> A parcel ID or precise address allows the Atlas to auto-populate elevation,
          soils, watershed, and climate data for your property. You can skip this and add it later.
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={onNext} isFirst={isFirst} isLast={isLast} />
    </div>
  );
}
