/**
 * FieldworkPanel — advanced field data collection for site visits.
 * Tabs: Field Notes, Soil/Water/Structure, Walk Routes, Site Checklist
 *
 * GPS, photo capture, voice memo, offline indicator.
 * Integrates with fieldworkStore for persistence.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useFieldworkStore,
  type FieldworkEntry,
  type FieldworkType,
  type NoteType,
} from '../../store/fieldworkStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import WalkRouteRecorder from './WalkRouteRecorder.js';
import SiteChecklist from './SiteChecklist.js';
import FieldNoteExport from './FieldNoteExport.js';
import FieldworkChecklistCard from './FieldworkChecklistCard.js';
import WalkChecklistCard from './WalkChecklistCard.js';
import css from './FieldworkPanel.module.css';

interface Props {
  project: LocalProject;
  map: maplibregl.Map | null;
}

type Tab = 'notes' | 'data' | 'walk' | 'checklist';

const DATA_TYPES: { id: FieldworkType; label: string }[] = [
  { id: 'soil_sample', label: 'Soil' },
  { id: 'water_issue', label: 'Water' },
  { id: 'structure_issue', label: 'Structure' },
  { id: 'measurement', label: 'Measure' },
];

const NOTE_TYPES: { id: NoteType; label: string }[] = [
  { id: 'observation', label: 'Observe' },
  { id: 'question', label: 'Question' },
  { id: 'measurement', label: 'Measure' },
  { id: 'issue', label: 'Issue' },
];

export default function FieldworkPanel({ project, map }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const entries = useFieldworkStore((s) => s.entries);
  const walkRoutes = useFieldworkStore((s) => s.walkRoutes);
  const addEntry = useFieldworkStore((s) => s.addEntry);
  const deleteEntry = useFieldworkStore((s) => s.deleteEntry);
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const pendingUploads = useFieldworkStore((s) => s.pendingUploads);

  const projectEntries = useMemo(
    () => entries.filter((e) => e.projectId === project.id),
    [entries, project.id],
  );
  const projectRoutes = useMemo(
    () => walkRoutes.filter((r) => r.projectId === project.id),
    [walkRoutes, project.id],
  );
  const fieldNotes = useMemo(
    () => projectEntries.filter((e) =>
      e.noteType || ['observation', 'question', 'issue'].includes(e.type),
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [projectEntries],
  );

  return (
    <div className={css.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={css.header}>
        <h2 className={css.title}>Fieldwork</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pendingUploads.length > 0 && (
            <span className={css.typeBadgeWarn}>{pendingUploads.length} pending</span>
          )}
          <span className={isOnline ? css.onlineBadge : css.offlineBadge}>
            <span className={css.statusDot} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────── */}
      <div className={css.tabBar}>
        {([
          { id: 'notes' as Tab, label: 'Field Notes' },
          { id: 'data' as Tab, label: 'Data' },
          { id: 'walk' as Tab, label: 'Routes' },
          { id: 'checklist' as Tab, label: 'Checklist' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? css.tabBtnActive : css.tabBtn}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────── */}
      {activeTab === 'notes' && (
        <FieldNotesTab
          project={project}
          entries={fieldNotes}
          addEntry={addEntry}
          deleteEntry={deleteEntry}
        />
      )}

      {activeTab === 'data' && (
        <DataEntryTab
          project={project}
          map={map}
          entries={projectEntries}
          addEntry={addEntry}
          deleteEntry={deleteEntry}
        />
      )}

      {activeTab === 'walk' && (
        <WalkRouteRecorder project={project} routes={projectRoutes} />
      )}

      {activeTab === 'checklist' && (
        <>
          <WalkChecklistCard projectId={project.id} />
          <FieldworkChecklistCard projectId={project.id} />
          <SiteChecklist projectId={project.id} />
        </>
      )}

      {/* ── Export ──────────────────────────────────────── */}
      {activeTab === 'notes' && fieldNotes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <FieldNoteExport entries={fieldNotes} projectName={project.name} />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Field Notes Tab                                                    */
/* ================================================================== */

interface FieldNotesTabProps {
  project: LocalProject;
  entries: FieldworkEntry[];
  addEntry: (entry: FieldworkEntry) => void;
  deleteEntry: (id: string) => void;
}

function FieldNotesTab({ project, entries, addEntry, deleteEntry }: FieldNotesTabProps) {
  const [noteType, setNoteType] = useState<NoteType>('observation');
  const [text, setText] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const captureGps = useCallback((): Promise<[number, number]> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve([0, 0]);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => resolve([0, 0]),
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

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAudioDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
    } catch {
      // Microphone not available
    }
  }, []);

  const stopAudioRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecordingAudio(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!text.trim() && !pendingPhoto && !audioDataUrl) return;
    setIsCapturing(true);

    const location = await captureGps();
    const entry: FieldworkEntry = {
      id: crypto.randomUUID(),
      projectId: project.id,
      type: noteType,
      noteType,
      location,
      timestamp: new Date().toISOString(),
      data: {},
      notes: text.trim(),
      photos: pendingPhoto ? [pendingPhoto] : [],
      verified: false,
      audioDataUrl: audioDataUrl ?? undefined,
    };

    addEntry(entry);
    setText('');
    setPendingPhoto(null);
    setAudioDataUrl(null);
    setIsCapturing(false);
  }, [text, pendingPhoto, audioDataUrl, noteType, project.id, captureGps, addEntry]);

  const TYPE_LABELS: Record<string, string> = {
    observation: 'Observe', question: 'Question', measurement: 'Measure', issue: 'Issue',
  };

  return (
    <div>
      {/* ── Note Type Selector ─────────────────────────── */}
      <div className={css.noteTypeRow}>
        {NOTE_TYPES.map((nt) => (
          <button
            key={nt.id}
            onClick={() => setNoteType(nt.id)}
            className={noteType === nt.id ? css.noteTypeBtnActive : css.noteTypeBtn}
          >
            {nt.label}
          </button>
        ))}
      </div>

      {/* ── Text Input ─────────────────────────────────── */}
      <textarea
        aria-label="Field note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you observe? Soil condition, drainage, vegetation, access..."
        rows={3}
        className={css.textInput}
      />

      {/* ── Photo Preview ──────────────────────────────── */}
      {pendingPhoto && (
        <div className={css.photoPreview}>
          <img src={pendingPhoto} alt="Captured" className={css.photoImg} />
          <button onClick={() => setPendingPhoto(null)} className={css.photoRemoveBtn} aria-label="Remove photo">
            {'\u00D7'}
          </button>
        </div>
      )}

      {/* ── Audio Preview ──────────────────────────────── */}
      {audioDataUrl && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <audio src={audioDataUrl} controls style={{ flex: 1, height: 32 }} />
          <button onClick={() => setAudioDataUrl(null)} className={css.deleteBtn} aria-label="Remove audio">
            {'\u00D7'}
          </button>
        </div>
      )}

      {/* ── Capture Buttons ────────────────────────────── */}
      <div className={css.captureRow}>
        <label className={css.captureBtn} style={{ cursor: 'pointer' }}>
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
          onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
          className={isRecordingAudio ? css.captureBtnActive : css.captureBtn}
        >
          {isRecordingAudio ? 'Stop' : 'Voice'}
        </button>
      </div>

      {/* ── Save Button ────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={isCapturing || (!text.trim() && !pendingPhoto && !audioDataUrl)}
        className={css.saveBtn}
      >
        {isCapturing ? 'Capturing GPS...' : 'Save Note'}
      </button>

      {/* ── Notes List ─────────────────────────────────── */}
      <div className={css.section} style={{ marginTop: 16 }}>
        <h4 className={css.sectionLabel}>FIELD NOTES ({entries.length})</h4>
        {entries.length === 0 ? (
          <div className={css.emptyState}>
            No field notes yet. Capture observations during your site visit.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={css.entryCard}>
              <div className={css.entryHeader}>
                <div style={{ flex: 1 }}>
                  <span className={css.typeBadge}>
                    {TYPE_LABELS[entry.noteType ?? ''] ?? entry.type}
                  </span>
                  {entry.verified && <span className={css.verifiedBadge}>Verified</span>}
                  {entry.notes && <div className={css.entryNotes} style={{ marginTop: 4 }}>{entry.notes}</div>}
                </div>
                <button onClick={() => deleteEntry(entry.id)} className={css.deleteBtn}>
                  {'\u00D7'}
                </button>
              </div>
              {entry.photos.length > 0 && entry.photos[0] && (
                <img
                  src={entry.photos[0]}
                  alt=""
                  style={{ width: '100%', borderRadius: 6, maxHeight: 120, objectFit: 'cover', marginTop: 6 }}
                />
              )}
              {entry.audioDataUrl && (
                <audio src={entry.audioDataUrl} controls style={{ width: '100%', height: 28, marginTop: 6 }} />
              )}
              <div className={css.entryMeta}>
                {new Date(entry.timestamp).toLocaleString()}
                {entry.location[0] !== 0 && ` \u00B7 ${entry.location[1].toFixed(5)}, ${entry.location[0].toFixed(5)}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Data Entry Tab (original fieldwork types)                          */
/* ================================================================== */

interface DataEntryTabProps {
  project: LocalProject;
  map: maplibregl.Map | null;
  entries: FieldworkEntry[];
  addEntry: (entry: FieldworkEntry) => void;
  deleteEntry: (id: string) => void;
}

function DataEntryTab({ project, map, entries, addEntry, deleteEntry }: DataEntryTabProps) {
  const [dataType, setDataType] = useState<FieldworkType>('soil_sample');
  const [isPlacing, setIsPlacing] = useState(false);

  const tabEntries = entries.filter((e) => e.type === dataType);

  const handleAddFromMap = () => {
    if (!map) return;
    setIsPlacing(true);
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: maplibregl.MapMouseEvent) => {
      const notes = prompt(`Add ${dataType.replace(/_/g, ' ')} note:`) ?? '';
      if (notes) {
        const entry: FieldworkEntry = {
          id: crypto.randomUUID(),
          projectId: project.id,
          type: dataType,
          location: [e.lngLat.lng, e.lngLat.lat],
          timestamp: new Date().toISOString(),
          data: {},
          notes,
          photos: [],
          verified: false,
        };
        addEntry(entry);
      }
      map.getCanvas().style.cursor = '';
      map.off('click', handler);
      setIsPlacing(false);
    };
    map.once('click', handler);
  };

  return (
    <div>
      {/* ── Data Type Selector ─────────────────────────── */}
      <div className={css.noteTypeRow}>
        {DATA_TYPES.map((dt) => (
          <button
            key={dt.id}
            onClick={() => setDataType(dt.id)}
            className={dataType === dt.id ? css.noteTypeBtnActive : css.noteTypeBtn}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* ── Add from Map ───────────────────────────────── */}
      <button
        onClick={handleAddFromMap}
        className={isPlacing ? css.captureBtnActive : css.captureBtn}
        style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
      >
        {isPlacing ? 'Click on map to place...' : `+ Add ${dataType.replace(/_/g, ' ')} on Map`}
      </button>

      {/* ── Entry List ─────────────────────────────────── */}
      <div className={css.section}>
        <h4 className={css.sectionLabel}>{dataType.replace(/_/g, ' ').toUpperCase()} ({tabEntries.length})</h4>
        {tabEntries.length === 0 ? (
          <div className={css.emptyState}>
            No {dataType.replace(/_/g, ' ')} entries yet.
          </div>
        ) : (
          tabEntries.map((entry) => (
            <div key={entry.id} className={css.entryCard}>
              <div className={css.entryHeader}>
                <span className={css.entryNotes}>
                  {entry.notes.slice(0, 60)}{entry.notes.length > 60 ? '...' : ''}
                </span>
                <button onClick={() => deleteEntry(entry.id)} className={css.deleteBtn}>
                  {'\u00D7'}
                </button>
              </div>
              <div className={css.entryMeta}>
                {new Date(entry.timestamp).toLocaleString()} &middot; [{entry.location[0].toFixed(4)}, {entry.location[1].toFixed(4)}]
                {entry.verified && <span className={css.verifiedBadge} style={{ marginLeft: 4 }}>Verified</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
