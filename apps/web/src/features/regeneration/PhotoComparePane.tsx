/**
 * PhotoComparePane — modal overlay showing a before/after pair of
 * regeneration events side-by-side. Each column surfaces one event's
 * title, date, photos, and notes.
 *
 * Keeps it simple: two columns, no drag-slider overlay. Field photos
 * aren't pixel-aligned, so the side-by-side read is the honest one.
 */

import { useEffect } from 'react';
import type { RegenerationEvent } from '@ogden/shared';
import css from './RegenerationTimeline.module.css';

interface Props {
  before: RegenerationEvent;
  after: RegenerationEvent;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PhotoComparePane({ before, after, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const columns: { label: string; event: RegenerationEvent }[] = [
    { label: 'BEFORE', event: before },
    { label: 'AFTER', event: after },
  ];

  return (
    <div
      className={css.compareOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Before and after photo comparison"
    >
      <div className={css.compareModal} onClick={(e) => e.stopPropagation()}>
        <button
          className={css.compareClose}
          onClick={onClose}
          aria-label="Close comparison"
          type="button"
        >
          ×
        </button>
        <div className={css.compareGrid}>
          {columns.map(({ label, event }) => (
            <div key={label} className={css.compareColumn}>
              <div className={css.compareColumnHead}>
                <span className={css.compareColumnLabel}>{label}</span>
                <span className={css.compareColumnDate}>{formatDate(event.eventDate)}</span>
              </div>
              <div className={css.compareColumnTitle}>{event.title}</div>
              {event.mediaUrls && event.mediaUrls.length > 0 ? (
                <div className={css.comparePhotoList}>
                  {event.mediaUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={css.comparePhoto}
                    >
                      <img src={url} alt="" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className={css.comparePhotoEmpty}>No photos on this event.</div>
              )}
              {event.notes && <p className={css.compareNotes}>{event.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
