/**
 * CreateFieldTaskDialog — Phase 6.4.
 *
 * Counterpart to LogObservationDialog: where Log captures *what
 * happened*, Create Field Task records *what needs to happen*. Writes a
 * `FieldTask` into `useFieldTaskStore` keyed to the active project.
 *
 * Reuses LogObservationDialog's CSS module so the two dialogs read as a
 * matching pair. Defaults due-date to "today + 1d" so a task always
 * lands somewhere sensible on the calendar.
 */

import { useMemo, useState } from "react";
import {
  useFieldTaskStore,
  type FieldTaskCategory,
  type FieldTaskPriority,
} from "../../store/fieldTaskStore.js";
import css from "./LogObservationDialog.module.css";

export interface CreateFieldTaskDialogProps {
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

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  // YYYY-MM-DD for the date input
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CreateFieldTaskDialog({
  projectId,
  boundary,
  fallbackCenter,
  onClose,
}: CreateFieldTaskDialogProps) {
  const addTask = useFieldTaskStore((s) => s.addTask);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<FieldTaskCategory>("ops");
  const [priority, setPriority] = useState<FieldTaskPriority>("normal");
  const [dueDate, setDueDate] = useState<string>(defaultDueDate());
  const [saving, setSaving] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (boundary) {
      const c = polygonCentroid(boundary);
      if (c) return c;
    }
    return fallbackCenter;
  }, [boundary, fallbackCenter]);

  const canSave = title.trim().length > 0 && dueDate.length > 0 && !saving;

  const onSave = () => {
    if (!canSave) return;
    setSaving(true);
    const now = new Date().toISOString();
    // Anchor the due time to noon local on the selected date so tasks
    // sort sensibly on the calendar without requiring a time picker.
    const due = new Date(`${dueDate}T12:00:00`);
    addTask({
      id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      title: title.trim(),
      category,
      dueAt: due.toISOString(),
      priority,
      status: "todo",
      notes: notes.trim(),
      location: center,
      createdAt: now,
      updatedAt: now,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className={css.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      onClick={onClose}
    >
      <div className={css.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={css.title} id="create-task-title">Create Field Task</h2>
        <p className={css.sub}>
          Captured against the parcel and added to your project's task list.
        </p>

        <div className={css.field}>
          <label className={css.label} htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className={css.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        <div className={css.field}>
          <label className={css.label} htmlFor="task-category">Category</label>
          <select
            id="task-category"
            className={css.select}
            value={category}
            onChange={(e) => setCategory(e.target.value as FieldTaskCategory)}
          >
            <option value="ops">Ops</option>
            <option value="weather">Weather</option>
            <option value="regulation">Regulation</option>
            <option value="team">Team</option>
            <option value="education">Education</option>
          </select>
        </div>

        <div className={css.field}>
          <label className={css.label} htmlFor="task-priority">Priority</label>
          <select
            id="task-priority"
            className={css.select}
            value={priority}
            onChange={(e) => setPriority(e.target.value as FieldTaskPriority)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className={css.field}>
          <label className={css.label} htmlFor="task-due">Due date</label>
          <input
            id="task-due"
            type="date"
            className={css.input}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className={css.field}>
          <label className={css.label} htmlFor="task-notes">Notes</label>
          <textarea
            id="task-notes"
            className={css.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, constraints, who's responsible — optional."
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
            {saving ? "Saving…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
