/**
 * FieldNotes — geotagged note and photo capture for site visits.
 * Uses browser Geolocation API and file input with camera capture.
 */

import { useState, useCallback } from 'react';

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

export default function FieldNotes({ projectId, onNoteAdded }: FieldNotesProps) {
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [text, setText] = useState('');
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
    const note: FieldNote = {
      id: crypto.randomUUID(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      location,
      photoDataUrl: pendingPhoto,
    };

    setNotes((prev) => [note, ...prev]);
    onNoteAdded?.(note);
    setText('');
    setPendingPhoto(null);
    setIsCapturing(false);
  }, [text, pendingPhoto, captureLocation, onNoteAdded]);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 12 }}>
        Field Notes
      </h3>

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
              width: 24, height: 24, borderRadius: '50%',
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
            border: '1px solid var(--color-panel-card-border)',
            borderRadius: 8, background: 'transparent',
            color: 'var(--color-panel-muted)', cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {'\u{1F4F7}'} Photo
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
            border: 'none', borderRadius: 8,
            background: (text.trim() || pendingPhoto) ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)',
            color: (text.trim() || pendingPhoto) ? '#c4a265' : 'var(--color-panel-muted)',
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
              {note.photoDataUrl && (
                <img src={note.photoDataUrl} alt="" style={{ width: '100%', borderRadius: 6, maxHeight: 120, objectFit: 'cover', marginBottom: 6 }} />
              )}
              {note.text && (
                <div style={{ fontSize: 12, color: 'var(--color-panel-text)', lineHeight: 1.5, marginBottom: 4 }}>{note.text}</div>
              )}
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', display: 'flex', gap: 8 }}>
                <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
                {note.location && <span>{note.location.lat.toFixed(5)}, {note.location.lng.toFixed(5)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
