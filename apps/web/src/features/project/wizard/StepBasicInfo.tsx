/**
 * Step 1 — Name, type, country, units, description.
 * Validates against CreateProjectInput schema constraints.
 */

import { useState } from 'react';
import type { WizardStepProps } from './types.js';
import WizardNav from './WizardNav.js';

const PROJECT_TYPES = [
  { value: 'regenerative_farm', label: 'Regenerative Farm' },
  { value: 'retreat_center', label: 'Retreat Center' },
  { value: 'homestead', label: 'Homestead' },
  { value: 'educational_farm', label: 'Educational Farm' },
  { value: 'conservation', label: 'Conservation' },
  { value: 'multi_enterprise', label: 'Multi-Enterprise' },
  { value: 'moontrance', label: 'OGDEN Template' },
] as const;

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

const NAME_MAX = 200;
const DESC_MAX = 2000;

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-confidence-low, #9b3a2a)',
  marginTop: 4,
};

const charCountStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--color-text-muted)',
  textAlign: 'right',
  marginTop: 2,
};

export default function StepBasicInfo({ data, updateData, onNext, onBack, isFirst, isLast }: WizardStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameError = touched.name && !data.name.trim()
    ? 'Project name is required'
    : data.name.length > NAME_MAX
      ? `Name must be ${NAME_MAX} characters or fewer`
      : null;

  const descError = data.description.length > DESC_MAX
    ? `Description must be ${DESC_MAX} characters or fewer`
    : null;

  const isValid = data.name.trim().length > 0 && !nameError && !descError;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 8, color: 'var(--color-text)' }}>
        Tell us about your project
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
        Start with the basics. You can always change these later.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Project Name */}
        <div>
          <label style={labelStyle}>Project Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Halton Hills Retreat"
            style={{
              ...inputStyle,
              borderColor: nameError ? 'var(--color-confidence-low, #9b3a2a)' : undefined,
            }}
            autoFocus
            maxLength={NAME_MAX + 10}
          />
          {nameError && <div style={errorStyle}>{nameError}</div>}
          {data.name.length > NAME_MAX * 0.8 && !nameError && (
            <div style={charCountStyle}>{data.name.length}/{NAME_MAX}</div>
          )}
        </div>

        {/* Project Type */}
        <div>
          <label style={labelStyle}>Project Type</label>
          <select
            value={data.projectType}
            onChange={(e) => updateData({ projectType: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Select a type…</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Country & Units row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Country</label>
            <select
              value={data.country}
              onChange={(e) => updateData({ country: e.target.value as 'US' | 'CA' | 'INTL' })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="INTL">International</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Units</label>
            <select
              value={data.units}
              onChange={(e) => updateData({ units: e.target.value as 'metric' | 'imperial' })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="metric">Metric (m, ha)</option>
              <option value="imperial">Imperial (ft, ac)</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Briefly describe the vision for this property…"
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              lineHeight: 1.5,
              borderColor: descError ? 'var(--color-confidence-low, #9b3a2a)' : undefined,
            }}
            maxLength={DESC_MAX + 100}
          />
          {descError && <div style={errorStyle}>{descError}</div>}
          {data.description.length > DESC_MAX * 0.8 && !descError && (
            <div style={charCountStyle}>{data.description.length}/{DESC_MAX}</div>
          )}
        </div>
      </div>

      <WizardNav
        onBack={onBack}
        onNext={onNext}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!isValid}
      />
    </div>
  );
}
