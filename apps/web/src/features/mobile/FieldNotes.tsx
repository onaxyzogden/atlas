/**
 * FieldNotes — geotagged note and photo capture for site visits.
 * Integrated with fieldworkStore for persistence.
 * Uses browser Geolocation API and file input with camera capture.
 */

import { useState, useCallback, useMemo } from 'react';
import { useFieldworkStore, type FieldworkEntry, type NoteType } from '../../store/fieldworkStore.js';
import { group, warning } from '../../lib/tokens.js';

export interface FieldNote {
  id: string;
  text: string;
  timestamp: string;
  location: { lat: number; lng: number } | null;
  photoDataUrl: string | null;
}

interface FieldNotesProps {
  projectId: string;
  onNoteAdded?: (note: FieldNote) => void;
}

const NOTE_TYPE_OPTIONS: { id: NoteType; label: string }[] = [
  { id: 'observation', label: 'Observe' },
  { id: 'question', label: 'Question' },
  { id: 'measurement', label: 'Measure' },
  { id: 'issue', label: 'Issue' },
];

export default function FieldNotes({ projectId, onNoteAdded }: FieldNotesProps) {
  const allEntries = useFieldworkStore((s) => s.entries);
  const addEntry = useFieldworkStore((s) => s.addEntry);
  const deleteEntry = useFieldworkStore((s) => s.deleteEntry);

  // Filter field notes for this project
  const notes = useMemo(
    () => allEntries
      .filter((e) => e.projectId === projectId && (
        e.noteType || ['observation', 'question', 'issue'].includes(e.type)
      ))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allEntries, projectId],
  );

  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('observation');
  const [isCapturing, setIsCapturing] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const captureLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!text.trim() && !pendingPhoto) return;
    setIsCapturing(true);

    const location = await captureLocation();

    // Save to fieldworkStore
    const entry: FieldworkEntry = {
      id: crypto.randomUUID(),
      projectId,
      type: noteType,
      noteType,
      location: location ? [location.lng, location.lat] : [0, 0],
      timestamp: new Date().toISOString(),
      data: {},
      notes: text.trim(),
      photos: pendingPhoto ? [pendingPhoto] : [],
      verified: false,
    };
    addEntry(entry);

    // Also fire legacy callback
    const legacyNote: FieldNote = {
      id: entry.id,
      text: text.trim(),
      timestamp: entry.timestamp,
      location,
      photoDataUrl: pendingPhoto,
    };
    onNoteAdded?.(legacyNote);

    setText('');
    setPendingPhoto(null);
    setIsCapturing(false);
  }, [text, pendingPhoto, noteType, projectId, captureLocation, addEntry, onNoteAdded]);

  const TYPE_LABELS: Record<string, string> = {
    observation: 'Observe', question: 'Question', measurement: 'Measure', issue: 'Issue',
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 12 }}>
        Field Notes
      </h3>

      {/* ── Note Type Selector ─────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {NOTE_TYPE_OPTIONS.map((nt) => (
          <button
            key={nt.id}
            onClick={() => setNoteType(nt.id)}
            style={{
              flex: 1, padding: '8px', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              border: noteType === nt.id ? '1px solid rgba(21,128,61,0.25)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              background: noteType === nt.id ? 'rgba(21,128,61,0.12)' : 'rgba(255,255,255,0.02)',
              color: noteType === nt.id ? group.reporting : 'rgba(240,253,244,0.4)',
              cursor: 'pointer', minHeight: 44,
            }}
          >
            {nt.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <textarea
        aria-label="Field observation notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you observe? Soil condition, drainage, vegetation, access..."
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 13,
          background: 'var(--color-panel-subtle)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: 'var(--color-panel-text)',
          outline: 'none',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: 8,
          boxSizing: 'border-box',
          minHeight: 44,
        }}
      />

      {/* Photo preview */}
      {pendingPhoto && (
        <div style={{ marginBottom: 8, position: 'relative' }}>
          <img
            src={pendingPhoto}
            alt="Captured"
            style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }}
          />
          <button
            onClick={() => setPendingPhoto(null)}
            aria-label="Remove photo"
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: 'none',
              color: '#fff', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {'\u00D7'}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <label
          style={{
            flex: 1, padding: '10px', fontSize: 12, fontWeight: 500,
            border: '1px solid rgba(21,128,61,0.2)',
            borderRadius: 8, background: 'rgba(21,128,61,0.06)',
            color: group.reporting, cursor: 'pointer',
            textAlign: 'center', minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            style={{ display: 'none' }}
          />
        </label>
        <button
          onClick={handleSaveNote}
          disabled={isCapturing || (!text.trim() && !pendingPhoto)}
          style={{
            flex: 2, padding: '10px', fontSize: 12, fontWeight: 600,
            border: 'none', borderRadius: 8, minHeight: 44,
            background: (text.trim() || pendingPhoto) ? 'rgba(202,138,4,0.2)' : 'var(--color-panel-subtle)',
            color: (text.trim() || pendingPhoto) ? warning.DEFAULT : 'var(--color-panel-muted)',
            cursor: (text.trim() || pendingPhoto) ? 'pointer' : 'not-allowed',
            letterSpacing: '0.02em',
          }}
        >
          {isCapturing ? 'Capturing GPS...' : 'Save Note'}
        </button>
      </div>

      {/* Notes list */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Notes ({notes.length})
      </div>
      {notes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>
          No field notes yet. Capture observations during your site visit.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map((note) => (
            <div key={note.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 3,
                    background: 'rgba(21,128,61,0.12)', color: 'rgba(21,128,61,0.7)',
                    marginRight: 4,
                  }}>
                    {TYPE_LABELS[note.noteType ?? ''] ?? note.type}
                  </span>
                </div>
                <button
                  onClick={() => deleteEntry(note.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                >
                  {'\u00D7'}
                </button>
              </div>
              {note.photos.length > 0 && note.photos[0] && (
                <img src={note.photos[0]} alt="" style={{ width: '100%', borderRadius: 6, maxHeight: 120, objectFit: 'cover', marginTop: 6, marginBottom: 4 }} />
              )}
              {note.notes && (
                <div style={{ fontSize: 12, color: 'var(--color-panel-text)', lineHeight: 1.5, marginTop: 4, marginBottom: 4 }}>{note.notes}</div>
              )}
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', display: 'flex', gap: 8 }}>
                <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
                {note.location[0] !== 0 && <span>{note.location[1].toFixed(5)}, {note.location[0].toFixed(5)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
