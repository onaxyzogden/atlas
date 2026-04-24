/**
 * LogEventForm — inline disclosure form on EcologicalDashboard for §7
 * regeneration events. Creates observation / intervention / milestone /
 * photo rows via the RegenerationEvent API.
 *
 * Minimal by design: no media upload (separate ticket), no map-drawing
 * (Point via "Use boundary centre" or NULL site-wide).
 */

import { useState, useMemo } from 'react';
import {
  RegenerationEventInput,
  type RegenerationEventType,
  type RegenerationInterventionType,
  type RegenerationPhase,
  type RegenerationProgress,
} from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useRegenerationEventStore } from '../../store/regenerationEventStore.js';
import css from './RegenerationTimeline.module.css';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

const EVENT_TYPES: RegenerationEventType[] = ['observation', 'intervention', 'milestone', 'photo'];
const INTERVENTION_TYPES: RegenerationInterventionType[] = [
  'mulching_priority',
  'compost_application',
  'cover_crop_candidate',
  'silvopasture_candidate',
  'food_forest_candidate',
  'other',
];
const PHASES: RegenerationPhase[] = [
  'stabilize_erosion',
  'improve_drainage',
  'build_organic_matter',
  'introduce_perennials',
];
const PROGRESS: RegenerationProgress[] = ['planned', 'in_progress', 'completed', 'observed'];

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function boundaryCentroid(fc: GeoJSON.FeatureCollection | null): [number, number] | null {
  if (!fc || !fc.features.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const x = coords[0] as number, y = coords[1] as number;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) visit(c);
  };
  for (const f of fc.features) {
    if (f.geometry && 'coordinates' in f.geometry) visit(f.geometry.coordinates);
  }
  if (!isFinite(minX)) return null;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

interface LogEventFormProps {
  project: LocalProject;
  onSubmitted: () => void;
  onCancel: () => void;
}

export default function LogEventForm({ project, onSubmitted, onCancel }: LogEventFormProps) {
  const projectServerId = project.serverId ?? project.id;
  const createEvent = useRegenerationEventStore((s) => s.createEvent);

  const [eventType, setEventType] = useState<RegenerationEventType>('observation');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [interventionType, setInterventionType] = useState<RegenerationInterventionType | ''>('');
  const [phase, setPhase] = useState<RegenerationPhase | ''>('');
  const [progress, setProgress] = useState<RegenerationProgress | ''>('');
  const [notes, setNotes] = useState('');
  const [locationMode, setLocationMode] = useState<'site' | 'centre'>('site');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const centroid = useMemo(
    () => boundaryCentroid(project.parcelBoundaryGeojson),
    [project.parcelBoundaryGeojson],
  );

  async function submit() {
    setError(null);

    const location = locationMode === 'centre' && centroid
      ? { type: 'Point' as const, coordinates: centroid }
      : null;

    const candidate = {
      eventType,
      title: title.trim(),
      eventDate,
      interventionType: eventType === 'intervention' && interventionType ? interventionType : undefined,
      phase: phase || undefined,
      progress: progress || undefined,
      notes: notes.trim() || undefined,
      location,
    };

    const parsed = RegenerationEventInput.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setSubmitting(true);
    try {
      await createEvent(projectServerId, parsed.data);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={css.form}>
      <div className={css.fieldRow}>
        <label className={css.fieldLabel}>EVENT TYPE</label>
        <div className={css.segmented}>
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.segmentBtn} ${eventType === t ? css.segmentBtnActive : ''}`}
              onClick={() => setEventType(t)}
            >
              {humanize(t)}
            </button>
          ))}
        </div>
      </div>

      <div className={css.fieldRow}>
        <label className={css.fieldLabel} htmlFor="regen-event-title">TITLE</label>
        <input
          id="regen-event-title"
          className={css.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Seeded buckwheat cover crop, east paddock"
          maxLength={200}
        />
      </div>

      <div className={css.fieldRow}>
        <label className={css.fieldLabel} htmlFor="regen-event-date">DATE</label>
        <input
          id="regen-event-date"
          className={css.input}
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>

      {eventType === 'intervention' && (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor="regen-event-intervention">INTERVENTION TYPE</label>
          <select
            id="regen-event-intervention"
            className={css.input}
            value={interventionType}
            onChange={(e) => setInterventionType(e.target.value as RegenerationInterventionType | '')}
          >
            <option value="">Select…</option>
            {INTERVENTION_TYPES.map((t) => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </select>
        </div>
      )}

      <div className={css.fieldRow}>
        <label className={css.fieldLabel} htmlFor="regen-event-phase">PHASE</label>
        <select
          id="regen-event-phase"
          className={css.input}
          value={phase}
          onChange={(e) => setPhase(e.target.value as RegenerationPhase | '')}
        >
          <option value="">Select…</option>
          {PHASES.map((p) => (
            <option key={p} value={p}>{humanize(p)}</option>
          ))}
        </select>
      </div>

      <div className={css.fieldRow}>
        <label className={css.fieldLabel}>PROGRESS</label>
        <div className={css.segmented}>
          <button
            type="button"
            className={`${css.segmentBtn} ${progress === '' ? css.segmentBtnActive : ''}`}
            onClick={() => setProgress('')}
          >
            —
          </button>
          {PROGRESS.map((p) => (
            <button
              key={p}
              type="button"
              className={`${css.segmentBtn} ${progress === p ? css.segmentBtnActive : ''}`}
              onClick={() => setProgress(p)}
            >
              {humanize(p)}
            </button>
          ))}
        </div>
      </div>

      <div className={css.fieldRow}>
        <label className={css.fieldLabel} htmlFor="regen-event-notes">NOTES</label>
        <textarea
          id="regen-event-notes"
          className={css.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={10000}
          placeholder="Optional detail — conditions, materials, helpers, follow-up"
        />
      </div>

      <div className={css.fieldRow}>
        <label className={css.fieldLabel}>LOCATION</label>
        <div className={css.segmented}>
          <button
            type="button"
            className={`${css.segmentBtn} ${locationMode === 'site' ? css.segmentBtnActive : ''}`}
            onClick={() => setLocationMode('site')}
          >
            Site-wide
          </button>
          <DelayedTooltip label="No parcel boundary yet — use site-wide" disabled={!!centroid}>
          <button
            type="button"
            className={`${css.segmentBtn} ${locationMode === 'centre' ? css.segmentBtnActive : ''}`}
            onClick={() => setLocationMode('centre')}
            disabled={!centroid}
          >
            Use boundary centre
          </button>
          </DelayedTooltip>
        </div>
      </div>

      {error && <div className={css.formError}>{error}</div>}

      <div className={css.formActions}>
        <button type="button" className={css.btnSecondary} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className={css.btnPrimary} onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save event'}
        </button>
      </div>
    </div>
  );
}
