/**
 * Sample-entry panel. Records a soil/water/biology reading as an
 * `observation`-type regeneration event whose `observations` payload
 * carries the typed metric keys + optional zone label. Reuses the
 * existing create route via `regenerationEventStore` — no new endpoint.
 */

import { useState } from 'react';
import {
  MONITORED_METRICS,
  metricKeysForDomain,
  ROUND_LABEL_KEY,
  ZONE_REF_KEY,
  type MetricDomain,
  type MonitoredMetricKey,
  type RegenerationEventInput,
} from '@ogden/shared';
import { useRegenerationEventStore } from '../../../store/regenerationEventStore.js';

interface Props {
  projectId: string;
  /** Which metric family this form captures (A1 vs A3). */
  domain: MetricDomain;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function SampleEntryForm({ projectId, domain }: Props) {
  const createEvent = useRegenerationEventStore((s) => s.createEvent);
  const metricKeys = metricKeysForDomain(domain);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [zone, setZone] = useState('');
  const [round, setRound] = useState('');
  const [values, setValues] = useState<Partial<Record<MonitoredMetricKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDate(today());
    setZone('');
    setRound('');
    setValues({});
    setError(null);
  }

  async function submit() {
    setError(null);
    const observations: Record<string, number | string> = {};
    let metricCount = 0;
    for (const key of metricKeys) {
      const raw = values[key];
      if (raw == null || raw.trim() === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setError(`"${MONITORED_METRICS[key].label}" is not a valid number.`);
        return;
      }
      observations[key] = n;
      metricCount += 1;
    }
    if (metricCount === 0) {
      setError('Enter at least one metric value.');
      return;
    }
    if (zone.trim()) observations[ZONE_REF_KEY] = zone.trim();
    if (round.trim()) observations[ROUND_LABEL_KEY] = round.trim();

    const input: RegenerationEventInput = {
      eventType: 'observation',
      progress: 'observed',
      title: round.trim()
        ? `Monitoring sample — ${round.trim()}`
        : `Monitoring sample — ${date}`,
      eventDate: date,
      observations,
    };

    setBusy(true);
    try {
      await createEvent(projectId, input);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={btnStyle}
      >
        + Log a monitoring sample
      </button>
    );
  }

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 16,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={lblStyle}>
          Sample date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={lblStyle}>
          Zone / paddock <span style={{ opacity: 0.5 }}>(optional)</span>
          <input
            type="text"
            value={zone}
            placeholder="e.g. North paddock"
            onChange={(e) => setZone(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={lblStyle}>
          Round label <span style={{ opacity: 0.5 }}>(optional)</span>
          <input
            type="text"
            value={round}
            placeholder="e.g. Year 0 / Year 5"
            onChange={(e) => setRound(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {metricKeys.map((key) => {
          const meta = MONITORED_METRICS[key];
          return (
            <label key={key} style={lblStyle}>
              {meta.label} <span style={{ opacity: 0.5 }}>({meta.unit})</span>
              <input
                type="number"
                inputMode="decimal"
                value={values[key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                style={inputStyle}
              />
            </label>
          );
        })}
      </div>

      {error && (
        <p style={{ color: '#e07a5f', fontSize: 12, margin: '0 0 10px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Saving…' : 'Save sample'}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={busy}
          style={{ ...btnStyle, background: 'transparent' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(127,209,174,0.4)',
  background: 'rgba(127,209,174,0.12)',
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
