/**
 * DesignMapGeneratorModal — Phase B.5.2.
 *
 * Two-step dry-run + persist flow for the Design Map generator
 * (`POST /api/v1/design-map/project/:projectId/generate`).
 *
 *   1. On open, calls the route with `persist: false` and displays the
 *      summary (orchard rows, swales, paddocks, corridors, totals) and
 *      any warnings.
 *   2. "Save to design" re-calls with `persist: true`; the server inserts
 *      the features, broadcasts `features_bulk_created`, and returns the
 *      ids. We close the modal on success — the existing project layer
 *      loaders will surface the new rows when the user navigates back.
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/apiClient.js';
import { confidence, semantic, zIndex } from '../../lib/tokens.js';

interface Persisted {
  count: number;
  ids: string[];
}

interface DryRunResult {
  summary: Record<string, number>;
  warnings: string[];
  featureCount: number;
  persisted?: Persisted;
}

interface Props {
  projectId: string;
  onClose: () => void;
  onPersisted?: (persisted: Persisted) => void;
}

const SUMMARY_LABELS: Record<string, string> = {
  orchardRows: 'Orchard rows',
  estimatedTreeCount: 'Estimated trees',
  paddocks: 'Paddocks',
  totalPaddockAuDays: 'Total AU-days',
  swales: 'Keyline swales',
  totalSpongeCapacityM3: 'Sponge capacity (m³)',
  corridors: 'Habitat corridors',
  totalCorridorAreaHa: 'Corridor area (ha)',
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export default function DesignMapGeneratorModal({ projectId, onClose, onPersisted }: Props) {
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.designMap
      .generate(projectId, { persist: false })
      .then((res) => {
        if (cancelled) return;
        setDryRun({
          summary: res.data.summary,
          warnings: res.data.warnings,
          featureCount: res.data.features.length,
        });
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to generate design map';
        setError(msg);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const handlePersist = async () => {
    setPersisting(true);
    setError(null);
    try {
      const res = await api.designMap.generate(projectId, { persist: true });
      if (res.data.persisted) onPersisted?.(res.data.persisted);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to persist design map';
      setError(msg);
      setPersisting(false);
    }
  };

  const summaryEntries = dryRun
    ? Object.entries(SUMMARY_LABELS)
        .filter(([key]) => typeof dryRun.summary[key] === 'number')
        .map(([key, label]) => [label, dryRun.summary[key] as number] as const)
    : [];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: zIndex.modal,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-map-modal-title"
        style={{
          background: 'var(--color-panel-bg, #1a1611)', borderRadius: 12,
          padding: 24, maxWidth: 560, width: '90%', maxHeight: '85vh', overflowY: 'auto',
          border: '1px solid rgba(196,162,101,0.15)',
        }}
      >
        <h3
          id="design-map-modal-title"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-title, #d4af5f)', margin: '0 0 4px' }}
        >
          Generate Candidate Design Map
        </h3>
        <p style={{ fontSize: 11, color: 'var(--color-panel-muted, #9a8a74)', margin: '0 0 16px' }}>
          Dry-run summary of the orchards, swales, paddocks, and habitat corridors the generator
          would write to this project. Nothing is persisted until you choose to save.
        </p>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--color-panel-muted, #9a8a74)' }}>
            Computing candidate design…
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12,
              background: 'rgba(220,80,80,0.10)', border: '1px solid rgba(220,80,80,0.30)',
              color: '#e8b4b4',
            }}
          >
            {error}
          </div>
        )}

        {dryRun && !loading && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted, #9a8a74)', marginBottom: 6 }}>
                {dryRun.featureCount} candidate features
              </div>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <tbody>
                  {summaryEntries.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ padding: '6px 0', color: 'var(--color-panel-muted, #9a8a74)' }}>
                        No quantitative summary produced.
                      </td>
                    </tr>
                  )}
                  {summaryEntries.map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '4px 0', color: 'var(--color-panel-text, #f2ede3)' }}>{label}</td>
                      <td
                        style={{
                          padding: '4px 0', textAlign: 'right',
                          color: 'var(--color-panel-title, #d4af5f)', fontFamily: 'monospace',
                        }}
                      >
                        {formatNumber(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dryRun.warnings.length > 0 && (
              <div
                style={{
                  padding: 12, borderRadius: 8, marginBottom: 16,
                  background: 'rgba(196,162,101,0.08)', border: '1px solid rgba(196,162,101,0.20)',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: semantic.sidebarActive, marginBottom: 4 }}>
                  Warnings
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--color-panel-muted, #c4b49a)' }}>
                  {dryRun.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handlePersist}
            disabled={!dryRun || persisting || loading || dryRun.featureCount === 0}
            style={{
              flex: 1, padding: '10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6,
              background: !dryRun || persisting || dryRun?.featureCount === 0
                ? 'rgba(196,162,101,0.08)'
                : 'rgba(45,122,79,0.18)',
              color: !dryRun || persisting || dryRun?.featureCount === 0
                ? 'var(--color-panel-muted, #6b5b4a)'
                : confidence.high,
              cursor: !dryRun || persisting || dryRun?.featureCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {persisting ? 'Saving…' : 'Save to design'}
          </button>
          <button
            onClick={onClose}
            disabled={persisting}
            style={{
              padding: '10px 16px', fontSize: 12,
              border: '1px solid var(--color-panel-card-border, rgba(255,255,255,0.08))',
              borderRadius: 6, background: 'transparent',
              color: 'var(--color-panel-muted, #9a8a74)',
              cursor: persisting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
