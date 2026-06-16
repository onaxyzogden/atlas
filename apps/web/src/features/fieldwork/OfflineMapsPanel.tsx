/**
 * OfflineMapsPanel — per-basemap offline-cache visibility + manual refresh,
 * for the Fieldwork panel. Sibling of OfflineSyncStatusCard (shares its CSS
 * idiom via OfflineMapsPanel.module.css).
 *
 * Caching is automatic (sync-driven via precacheAllBasemaps); this panel makes
 * that work VISIBLE — one row per basemap (name · status dot · tile count ·
 * last-saved relative time) — and adds a "Refresh offline maps" button so a
 * steward can top up before heading somewhere with no signal. The button runs
 * the same orchestrator and writes live status into mapCacheStore.
 *
 * Pure presentation + a manual trigger; no financial surface. Amanah-neutral.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  BASEMAP_OPTIONS,
  type BasemapKey,
} from '../../v3/observe/components/measure/useMapToolStore.js';
import {
  useMapCacheStore,
  type BasemapCacheStatus,
} from '../../store/mapCacheStore.js';
import { precacheAllBasemaps } from '../../lib/tilePrecache.js';
import { getBboxFromGeojson } from '../../lib/syncService.js';
import { maptilerKey } from '../../lib/maplibre.js';
import s from './OfflineMapsPanel.module.css';

interface Props {
  project: LocalProject;
}

const STATUS_WORD: Record<BasemapCacheStatus, string> = {
  ready: 'Saved',
  caching: 'Saving…',
  error: 'Failed',
  uncached: 'Not saved',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function OfflineMapsPanel({ project }: Props) {
  const projectId = project.id;
  const byProject = useMapCacheStore((st) => st.byProject);
  const setBasemapStatus = useMapCacheStore((st) => st.setBasemapStatus);
  const recordCacheResult = useMapCacheStore((st) => st.recordCacheResult);

  const [refreshing, setRefreshing] = useState(false);

  const entries = byProject[projectId];

  const bbox = useMemo(
    () => getBboxFromGeojson(project.parcelBoundaryGeojson),
    [project.parcelBoundaryGeojson],
  );

  const summary = useMemo(() => {
    const list = BASEMAP_OPTIONS.map((opt) => {
      const e = entries?.[opt.key];
      return {
        key: opt.key,
        label: opt.label,
        status: (e?.status ?? 'uncached') as BasemapCacheStatus,
        tilesCached: e?.tilesCached ?? 0,
        lastCachedAt: e?.lastCachedAt ?? null,
      };
    });
    const readyCount = list.filter((r) => r.status === 'ready').length;
    const totalTiles = list.reduce((sum, r) => sum + r.tilesCached, 0);
    return { list, readyCount, totalTiles };
  }, [entries]);

  async function handleRefresh() {
    if (!bbox || refreshing) return;
    setRefreshing(true);
    for (const opt of BASEMAP_OPTIONS) {
      setBasemapStatus(projectId, opt.key, 'caching');
    }
    try {
      const results = await precacheAllBasemaps(
        bbox,
        maptilerKey ?? undefined,
        (basemap) => setBasemapStatus(projectId, basemap as BasemapKey, 'caching'),
      );
      const ts = new Date().toISOString();
      for (const r of results) {
        if (r.cached > 0) recordCacheResult(projectId, r.basemap, r.cached, ts);
        else setBasemapStatus(projectId, r.basemap, 'error');
      }
    } catch {
      for (const opt of BASEMAP_OPTIONS) {
        setBasemapStatus(projectId, opt.key, 'error');
      }
    } finally {
      setRefreshing(false);
    }
  }

  const allReady = summary.readyCount === BASEMAP_OPTIONS.length;
  const headState = refreshing
    ? s.state_syncing
    : allReady
      ? s.state_clean
      : summary.readyCount > 0
        ? s.state_pending
        : s.state_offline;

  return (
    <div className={`${s.card} ${headState}`}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Offline Maps</h3>
          <p className={s.cardHint}>
            Map tiles for this site are saved automatically during sync so the
            map keeps working with no signal. Refresh before heading out for
            extra confidence.
          </p>
        </div>
        <span className={s.heuristicBadge}>FIELD MODE</span>
      </div>

      <div className={s.stateStrip}>
        <div className={s.stateBlock}>
          <span className={s.stateDot} />
          <div className={s.stateTextCol}>
            <span className={s.stateWord}>
              {refreshing
                ? 'Saving maps…'
                : allReady
                  ? 'All maps saved'
                  : summary.readyCount > 0
                    ? `${summary.readyCount} of ${BASEMAP_OPTIONS.length} maps saved`
                    : 'No maps saved yet'}
            </span>
            <span className={s.stateSub}>
              {summary.totalTiles.toLocaleString()} tiles cached for this site.
            </span>
          </div>
        </div>
      </div>

      <ul className={s.basemapList}>
        {summary.list.map((row) => (
          <li key={row.key} className={s.basemapRow}>
            <span className={`${s.dot} ${s[`dot_${row.status}`]}`} aria-hidden="true" />
            <span className={s.basemapLabel}>{row.label}</span>
            <span className={s.basemapMeta}>
              {row.status === 'ready'
                ? `${row.tilesCached.toLocaleString()} tiles · ${formatRelative(row.lastCachedAt)}`
                : STATUS_WORD[row.status]}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={s.refreshButton}
        onClick={handleRefresh}
        disabled={!bbox || refreshing}
        title={
          bbox
            ? 'Re-download map tiles for this site'
            : 'Set a parcel boundary first so we know the area to save'
        }
      >
        {refreshing ? 'Saving offline maps…' : 'Refresh offline maps'}
      </button>

      {!bbox && (
        <p className={s.footnote}>
          <em>No boundary yet.</em> Draw or import this project{'\''}s parcel
          boundary so we know which area to save for offline use.
        </p>
      )}
    </div>
  );
}
