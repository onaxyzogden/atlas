/**
 * Step 2 — Address, parcel ID, province/state.
 */

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

export default function StepLocation({ data, updateData, onNext, onBack, isFirst, isLast }: WizardStepProps) {
  const regions = data.country === 'CA' ? CA_PROVINCES : US_STATES;
  const regionLabel = data.country === 'CA' ? 'Province / Territory' : 'State';

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
