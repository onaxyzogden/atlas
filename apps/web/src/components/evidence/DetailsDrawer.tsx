/**
 * DetailsDrawer — Tier-3 raw evidence pointer surface (Phase E.3).
 *
 * Opened from `<EvidenceSection>`'s "View details →" link when the EvidenceItem
 * carries `details.rawGeoJsonRef` / `details.rawSummaryRef` strings. Surfaces
 * those pointer strings + the result of an optional layer fetch from
 * `api.layers.get(projectId, layerType)`.
 *
 * The drawer is desktop-only by design (its parent `<EvidenceSection>`
 * already guards on `compactMode` for mobile). Keeps a11y light — modal
 * dialog, focus-visible ring, ESC/backdrop dismiss.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient.js';
import type { EvidenceItem } from '../../lib/evidence/types.js';
import s from './DetailsDrawer.module.css';

interface DetailsDrawerProps {
  title: string;
  details: NonNullable<EvidenceItem['details']>;
  /** When provided, the drawer attempts a layer fetch on open. */
  projectId?: string;
  onClose: () => void;
}

export default function DetailsDrawer({
  title,
  details,
  projectId,
  onClose,
}: DetailsDrawerProps) {
  const [layerPayload, setLayerPayload] = useState<unknown | null>(null);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'error' | 'done'>(
    'idle',
  );
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // ESC + initial-fetch effects.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!projectId || !details.rawGeoJsonRef) return;
    const layerType = details.rawGeoJsonRef.replace(/^layer:/, '');
    setFetchStatus('loading');
    api.layers
      .get(projectId, layerType)
      .then((payload) => {
        setLayerPayload(payload);
        setFetchStatus('done');
      })
      .catch(() => setFetchStatus('error'));
  }, [projectId, details.rawGeoJsonRef]);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(`${label} copied`);
      setTimeout(() => setCopyMsg(null), 1500);
    } catch {
      setCopyMsg('clipboard unavailable');
      setTimeout(() => setCopyMsg(null), 1500);
    }
  }, []);

  return (
    <>
      <div className={s.backdrop} onClick={onClose} data-testid="details-backdrop" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={s.drawer}
        data-testid="details-drawer"
      >
        <div className={s.header}>
          <div className={s.title}>{title}</div>
          <button
            type="button"
            className={s.closeBtn}
            onClick={onClose}
            aria-label="Close details"
            data-testid="details-close"
          >
            ×
          </button>
        </div>

        <div className={s.body}>
          {details.rawSummaryRef && (
            <section className={s.section}>
              <div className={s.sectionLabel}>Summary ref</div>
              <pre className={s.code} data-testid="details-summary-ref">
                {details.rawSummaryRef}
              </pre>
              <button
                type="button"
                className={s.copyBtn}
                onClick={() => copy(details.rawSummaryRef!, 'Summary ref')}
              >
                Copy ref
              </button>
            </section>
          )}

          {details.rawGeoJsonRef && (
            <section className={s.section}>
              <div className={s.sectionLabel}>GeoJSON ref</div>
              <pre className={s.code} data-testid="details-geojson-ref">
                {details.rawGeoJsonRef}
              </pre>
              <button
                type="button"
                className={s.copyBtn}
                onClick={() => copy(details.rawGeoJsonRef!, 'GeoJSON ref')}
              >
                Copy ref
              </button>
              {fetchStatus === 'loading' && (
                <div className={s.status}>Fetching layer payload…</div>
              )}
              {fetchStatus === 'error' && (
                <div className={s.status}>Layer fetch failed.</div>
              )}
              {fetchStatus === 'done' && layerPayload !== null && (
                <pre className={s.code} data-testid="details-layer-payload">
                  {JSON.stringify(layerPayload, null, 2).slice(0, 4000)}
                </pre>
              )}
            </section>
          )}

          {copyMsg && <div className={s.status}>{copyMsg}</div>}
        </div>
      </div>
    </>
  );
}
