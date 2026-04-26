/**
 * §3 ManualLabTestsCard — Tier-2 manual lab-test rollup.
 *
 * The SSURGO + EPA Water Quality sections above this card surface the
 * Tier-1 authoritative datasets (county-scale soil survey + nearest
 * monitoring station). Stewards routinely supplement those with on-parcel
 * lab work — soil pH/texture/NPK from a county-extension test, water
 * hardness/coliform/TDS from a well sample. fieldworkStore already
 * persists `soil_sample` and `water_issue` entries via the FieldworkPanel
 * Data tab; this card surfaces them as a Tier-2 layer that complements
 * the Tier-1 fetches above.
 *
 * Pure presentation — reads useFieldworkStore. No new entity types, no
 * shared math, no map overlays.
 *
 * Closes manifest item `manual-soil-water-tests` (P2 planned → done).
 */

import { memo, useMemo } from 'react';
import { useFieldworkStore, type FieldworkEntry } from '../../../store/fieldworkStore.js';
import s from './ManualLabTestsCard.module.css';

interface Props {
  projectId: string;
}

interface TestRow {
  id: string;
  timestamp: string;
  noteExcerpt: string;
  hasPhotos: boolean;
  verified: boolean;
  ageDays: number;
}

function rowFor(entry: FieldworkEntry, nowMs: number): TestRow {
  const t = Date.parse(entry.timestamp);
  const ageDays = Number.isFinite(t) ? Math.max(0, Math.round((nowMs - t) / 86_400_000)) : 0;
  const note = (entry.notes ?? '').trim();
  const excerpt = note.length > 80 ? `${note.slice(0, 78)}\u2026` : note || '(no note)';
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    noteExcerpt: excerpt,
    hasPhotos: entry.photos.length > 0,
    verified: entry.verified,
    ageDays,
  };
}

function formatAge(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} d ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${(days / 365).toFixed(1)} yr ago`;
}

export const ManualLabTestsCard = memo(function ManualLabTestsCard({ projectId }: Props) {
  const allEntries = useFieldworkStore((st) => st.entries);

  const data = useMemo(() => {
    const nowMs = Date.now();
    const projectEntries = allEntries.filter((e) => e.projectId === projectId);
    const soils = projectEntries.filter((e) => e.type === 'soil_sample');
    const waters = projectEntries.filter((e) => e.type === 'water_issue');

    const soilRows = soils
      .slice()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .map((e) => rowFor(e, nowMs));
    const waterRows = waters
      .slice()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .map((e) => rowFor(e, nowMs));

    const allRows = [...soilRows, ...waterRows];
    const newestAgeDays = allRows.length > 0
      ? Math.min(...allRows.map((r) => r.ageDays))
      : null;
    const verifiedCount = allRows.filter((r) => r.verified).length;
    const photoCount = allRows.filter((r) => r.hasPhotos).length;

    return {
      soilRows,
      waterRows,
      total: allRows.length,
      newestAgeDays,
      verifiedCount,
      photoCount,
    };
  }, [allEntries, projectId]);

  const isEmpty = data.total === 0;

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Manual Lab Tests (Tier 2)</h3>
          <p className={s.cardHint}>
            Steward-captured soil and water lab results. Complements the{' '}
            <em>SSURGO</em> soil survey and <em>EPA Water Quality</em>{' '}
            sections above (Tier 1). Add tests via the <em>Fieldwork</em>{' '}
            tab {'\u2192'} Data Entry.
          </p>
        </div>
        <span className={s.tierBadge}>TIER 2</span>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────── */}
      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>Soil samples</span>
          <span className={s.statVal}>{data.soilRows.length}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Water tests</span>
          <span className={s.statVal}>{data.waterRows.length}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Most recent</span>
          <span className={s.statVal}>
            {data.newestAgeDays != null ? formatAge(data.newestAgeDays) : '\u2014'}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Verified</span>
          <span className={s.statVal}>
            {data.verifiedCount}/{data.total || 0}
          </span>
        </div>
      </div>

      {isEmpty && (
        <div className={s.empty}>
          No manual lab tests captured yet. Use the <strong>Fieldwork</strong>{' '}
          tab {'\u2192'} <strong>Data</strong> {'\u2192'} <em>Soil</em> or{' '}
          <em>Water</em> to record on-parcel lab results, well samples, or
          county-extension test reports.
        </div>
      )}

      {data.soilRows.length > 0 && (
        <>
          <div className={s.sectionLabel}>
            Soil samples ({data.soilRows.length})
          </div>
          <ul className={s.testList}>
            {data.soilRows.slice(0, 5).map((r) => (
              <li key={r.id} className={s.testRow}>
                <div className={s.testHead}>
                  <span className={s.testAge}>{formatAge(r.ageDays)}</span>
                  <span className={s.testFlags}>
                    {r.hasPhotos && <span className={s.flagChip}>photo</span>}
                    {r.verified && <span className={`${s.flagChip} ${s.flagVerified}`}>verified</span>}
                  </span>
                </div>
                <div className={s.testNote}>{r.noteExcerpt}</div>
              </li>
            ))}
          </ul>
          {data.soilRows.length > 5 && (
            <div className={s.moreNote}>
              +{data.soilRows.length - 5} older soil sample{data.soilRows.length - 5 === 1 ? '' : 's'} in Fieldwork tab.
            </div>
          )}
        </>
      )}

      {data.waterRows.length > 0 && (
        <>
          <div className={s.sectionLabel}>
            Water tests ({data.waterRows.length})
          </div>
          <ul className={s.testList}>
            {data.waterRows.slice(0, 5).map((r) => (
              <li key={r.id} className={s.testRow}>
                <div className={s.testHead}>
                  <span className={s.testAge}>{formatAge(r.ageDays)}</span>
                  <span className={s.testFlags}>
                    {r.hasPhotos && <span className={s.flagChip}>photo</span>}
                    {r.verified && <span className={`${s.flagChip} ${s.flagVerified}`}>verified</span>}
                  </span>
                </div>
                <div className={s.testNote}>{r.noteExcerpt}</div>
              </li>
            ))}
          </ul>
          {data.waterRows.length > 5 && (
            <div className={s.moreNote}>
              +{data.waterRows.length - 5} older water test{data.waterRows.length - 5 === 1 ? '' : 's'} in Fieldwork tab.
            </div>
          )}
        </>
      )}

      <p className={s.footnote}>
        <em>Tier convention:</em> <strong>Tier 1</strong> = authoritative
        public dataset fetched at parcel scale (SSURGO, NLCD, NHD, EPA WQP);{' '}
        <strong>Tier 2</strong> = steward-captured on-parcel measurement
        (lab test, well sample, county-extension report). The two tiers
        complement each other {'\u2014'} Tier-1 sets the regional baseline,
        Tier-2 grounds it to the actual soil under foot. Photos and
        verification flags carry through from the Fieldwork capture.
      </p>
    </div>
  );
});
