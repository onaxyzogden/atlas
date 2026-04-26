/**
 * §28 GeotaggedPhotoGalleryCard — project-wide rolling gallery of every
 * geotagged field photo captured to date.
 *
 * Field-note capture (FieldNotesTab) stores photos inline per entry, but
 * before this card the steward had no consolidated surface to scan the
 * photographic record of a site across visits — only a chronological
 * notes list with one inline thumbnail per entry. This card surfaces:
 *
 *   - Total photo count, photos with GPS, photos missing GPS, date span
 *   - Filter chips (all / observation / question / issue / measurement)
 *   - Day-grouped thumbnail grid with click-to-enlarge inline
 *   - Per-photo location coords, timestamp, note-type badge, snippet
 *
 * Pure presentation; reads `useFieldworkStore`. No new entities.
 */

import { useMemo, useState } from 'react';
import { useFieldworkStore, type FieldworkEntry } from '../../store/fieldworkStore.js';
import css from './GeotaggedPhotoGalleryCard.module.css';

interface Props {
  projectId: string;
}

interface PhotoRow {
  entryId: string;
  photoIndex: number;
  url: string;
  timestamp: string;
  location: [number, number];
  hasGps: boolean;
  noteType: string;
  notes: string;
  dayKey: string; // YYYY-MM-DD
}

type FilterKey = 'all' | 'observation' | 'question' | 'issue' | 'measurement' | 'soil_sample' | 'water_issue' | 'structure_issue';

const FILTER_CHIPS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'observation', label: 'Observe' },
  { id: 'question', label: 'Question' },
  { id: 'issue', label: 'Issue' },
  { id: 'measurement', label: 'Measure' },
  { id: 'soil_sample', label: 'Soil' },
  { id: 'water_issue', label: 'Water' },
  { id: 'structure_issue', label: 'Structure' },
];

const TYPE_LABEL: Record<string, string> = {
  observation: 'Observe',
  question: 'Question',
  issue: 'Issue',
  measurement: 'Measure',
  annotation: 'Annotation',
  soil_sample: 'Soil',
  water_issue: 'Water',
  structure_issue: 'Structure',
};

function dayKeyFor(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dayKey: string): string {
  if (dayKey === 'unknown') return 'Undated';
  const d = new Date(`${dayKey}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function buildPhotoRows(entries: FieldworkEntry[]): PhotoRow[] {
  const rows: PhotoRow[] = [];
  for (const entry of entries) {
    if (!Array.isArray(entry.photos) || entry.photos.length === 0) continue;
    entry.photos.forEach((url, idx) => {
      if (!url) return;
      const hasGps = !(entry.location[0] === 0 && entry.location[1] === 0);
      rows.push({
        entryId: entry.id,
        photoIndex: idx,
        url,
        timestamp: entry.timestamp,
        location: entry.location,
        hasGps,
        noteType: entry.noteType ?? entry.type,
        notes: entry.notes ?? '',
        dayKey: dayKeyFor(entry.timestamp),
      });
    });
  }
  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function GeotaggedPhotoGalleryCard({ projectId }: Props): React.ReactElement {
  const allEntries = useFieldworkStore((s) => s.entries);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { rows, headline } = useMemo(() => {
    const projectEntries = allEntries.filter((e) => e.projectId === projectId);
    const allRows = buildPhotoRows(projectEntries);
    const totalPhotos = allRows.length;
    const withGps = allRows.filter((r) => r.hasGps).length;
    const sortedAsc = [...allRows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const earliest = sortedAsc[0]?.timestamp ?? null;
    const latest = sortedAsc[sortedAsc.length - 1]?.timestamp ?? null;
    let span = '\u2014';
    if (earliest && latest) {
      const days = Math.max(
        1,
        Math.round((new Date(latest).getTime() - new Date(earliest).getTime()) / 86_400_000) + 1,
      );
      span = `${days} day${days === 1 ? '' : 's'}`;
    }
    const filtered = filter === 'all' ? allRows : allRows.filter((r) => r.noteType === filter);
    return {
      rows: filtered,
      headline: { totalPhotos, withGps, withoutGps: totalPhotos - withGps, span },
    };
  }, [allEntries, projectId, filter]);

  const grouped = useMemo(() => {
    const out = new Map<string, PhotoRow[]>();
    for (const r of rows) {
      const list = out.get(r.dayKey) ?? [];
      list.push(r);
      out.set(r.dayKey, list);
    }
    return [...out.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [rows]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Geotagged photo gallery</h3>
          <p className={css.cardHint}>
            Rolling photographic record across every site visit. Photos are captured inside Field Notes
            with timestamp + GPS; this card consolidates them so the steward can scan the visual log of
            the site without scrolling the per-entry list.
          </p>
        </div>
        <span className={css.modeBadge}>§28 {'\u00B7'} Field record</span>
      </header>

      <div className={css.headline}>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Total photos</div>
          <div className={css.headlineValue}>{headline.totalPhotos}</div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>With GPS</div>
          <div className={css.headlineValue}>{headline.withGps}</div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>No GPS</div>
          <div className={`${css.headlineValue} ${headline.withoutGps > 0 ? css.headlineWarn : ''}`}>
            {headline.withoutGps}
          </div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Span</div>
          <div className={css.headlineValue}>{headline.span}</div>
        </div>
      </div>

      <div className={css.filterBar}>
        {FILTER_CHIPS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={filter === f.id ? css.filterChipActive : css.filterChip}
          >
            {f.label}
          </button>
        ))}
      </div>

      {headline.totalPhotos === 0 ? (
        <div className={css.empty}>
          No photos captured yet. Use the Field Notes tab to capture geotagged photos during a site visit.
        </div>
      ) : rows.length === 0 ? (
        <div className={css.empty}>No photos match the {'\u201C'}{FILTER_CHIPS.find((f) => f.id === filter)?.label}{'\u201D'} filter.</div>
      ) : (
        <div className={css.dayList}>
          {grouped.map(([dayKey, dayRows]) => (
            <div key={dayKey} className={css.dayGroup}>
              <div className={css.dayLabel}>
                {formatDayLabel(dayKey)} {'\u00B7'} {dayRows.length} photo{dayRows.length === 1 ? '' : 's'}
              </div>
              <div className={css.thumbGrid}>
                {dayRows.map((r) => {
                  const id = `${r.entryId}-${r.photoIndex}`;
                  const isActive = activeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={isActive ? css.thumbActive : css.thumb}
                      onClick={() => setActiveId(isActive ? null : id)}
                      aria-label={`Photo from ${new Date(r.timestamp).toLocaleString()}`}
                    >
                      <img src={r.url} alt="" className={css.thumbImg} />
                      <div className={css.thumbMeta}>
                        <span className={css.thumbType}>{TYPE_LABEL[r.noteType] ?? r.noteType}</span>
                        <span className={css.thumbTime}>
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {dayRows
                .filter((r) => activeId === `${r.entryId}-${r.photoIndex}`)
                .map((r) => (
                  <div key={`detail-${r.entryId}-${r.photoIndex}`} className={css.detail}>
                    <img src={r.url} alt="" className={css.detailImg} />
                    <div className={css.detailMeta}>
                      <div className={css.detailRow}>
                        <span className={css.detailLabel}>Type</span>
                        <span className={css.detailValue}>{TYPE_LABEL[r.noteType] ?? r.noteType}</span>
                      </div>
                      <div className={css.detailRow}>
                        <span className={css.detailLabel}>When</span>
                        <span className={css.detailValue}>{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                      <div className={css.detailRow}>
                        <span className={css.detailLabel}>Where</span>
                        <span className={css.detailValue}>
                          {r.hasGps ? `${r.location[1].toFixed(5)}, ${r.location[0].toFixed(5)}` : 'No GPS recorded'}
                        </span>
                      </div>
                      {r.notes ? (
                        <div className={css.detailNotes}>{r.notes}</div>
                      ) : (
                        <div className={css.detailMuted}>No notes attached.</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className={css.footnote}>
        Photos missing GPS were captured before location permission was granted, or the device {'\u2019'}s
        geolocation timed out. Re-capture if precise pin location matters for the report.
      </div>
    </section>
  );
}
