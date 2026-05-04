/**
 * LogObservationDialog — Phase 5.2 PR4.
 *
 * Minimalist modal for capturing a field observation against the active
 * project. Writes a `FieldworkEntry` into `useFieldworkStore` with
 * `type: 'observation'` and `noteType: 'observation'`. The new entry is
 * keyed to the project id so it surfaces in any v2 fieldwork view, and —
 * once `useFieldFlags` learns to merge fieldwork entries (deferred to a
 * later PR) — it will appear as a marker on `OperateMap` automatically.
 *
 * Location strategy: defaults to the parcel boundary centroid when the
 * project carries one, else the supplied `fallbackCenter`. Map-click
 * placement is intentionally out of scope — Phase 5.1 PR3 lands the
 * shared "drop a point" affordance and Operate adopts it then.
 */

import { useMemo, useState } from "react";
import { useFieldworkStore } from "../../store/fieldworkStore.js";
import css from "./LogObservationDialog.module.css";

export type ObservationCategory = "general" | "livestock" | "water" | "weather" | "ecology";

export interface LogObservationDialogProps {
  projectId: string;
  boundary?: GeoJSON.Polygon;
  fallbackCenter: [number, number];
  onClose: () => void;
}

function polygonCentroid(poly: GeoJSON.Polygon): [number, number] | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (const pt of ring) {
    const x = pt[0];
    const y = pt[1];
    if (x === undefined || y === undefined) continue;
    lng += x;
    lat += y;
    n += 1;
  }
  if (n === 0) return null;
  return [lng / n, lat / n];
}

export default function LogObservationDialog({
  projectId,
  boundary,
  fallbackCenter,
  onClose,
}: LogObservationDialogProps) {
  const addEntry = useFieldworkStore((s) => s.addEntry);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ObservationCategory>("general");
  const [saving, setSaving] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (boundary) {
      const c = polygonCentroid(boundary);
      if (c) return c;
    }
    return fallbackCenter;
  }, [boundary, fallbackCenter]);

  const canSave = notes.trim().length > 0 && !saving;

  const onSave = () => {
    if (!canSave) return;
    setSaving(true);
    addEntry({
      id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      type: "observation",
      noteType: "observation",
      location: center,
      timestamp: new Date().toISOString(),
      data: { category },
      notes: notes.trim(),
      photos: [],
      verified: false,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className={css.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-observation-title"
      onClick={onClose}
    >
      <div className={css.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={css.title} id="log-observation-title">Log Observation</h2>
        <p className={css.sub}>
          Captured against the parcel and stored under your fieldwork log.
        </p>

        <div className={css.field}>
          <label className={css.label} htmlFor="obs-category">Category</label>
          <select
            id="obs-category"
            className={css.select}
            value={category}
            onChange={(e) => setCategory(e.target.value as ObservationCategory)}
          >
            <option value="general">General</option>
            <option value="livestock">Livestock</option>
            <option value="water">Water</option>
            <option value="weather">Weather</option>
            <option value="ecology">Ecology</option>
          </select>
        </div>

        <div className={css.field}>
          <label className={css.label} htmlFor="obs-notes">What did you see?</label>
          <textarea
            id="obs-notes"
            className={css.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Brief field note — what's happening, where, and why it matters."
            autoFocus
          />
        </div>

        <div className={css.coords}>
          Location: {center[0].toFixed(5)}, {center[1].toFixed(5)} (parcel center)
        </div>

        <div className={css.row}>
          <button type="button" className={css.btn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={onSave}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save observation"}
          </button>
        </div>
      </div>
    </div>
  );
}
