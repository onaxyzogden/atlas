/**
 * B5.2.x.c — CoverCropPopoverEditor.
 *
 * Standalone, screen-anchored popover that surfaces the per-CropArea
 * cover-crop editor as a lightweight overlay (vs. the slide-up
 * `CoverCropPlannerCard`). Map entry: clicking a CropArea on the canvas
 * opens this popover for that area without leaving the map.
 *
 * Reuses the spine-write contract: every Save funnels through
 * `updateCropArea` + `pushCoverCropPlanToSpine`, identical to the slide-up
 * card — no second writer path. Renders a read-only list of existing windows
 * + the same MonthBandPicker-driven add-window form.
 *
 * State: per-instance `useCoverCropPopoverStore` carries `{ open, projectId,
 * cropAreaId, anchor? }`. Map tools call `open(...)`. Closing is via the
 * popover's Cancel button or Esc. The map-entry wiring from
 * CropAreaTool is parked for a follow-up — this file ships the popover
 * shell + store so callers can integrate when the click-an-existing-feature
 * surface lands.
 *
 * Covenant: agronomic + scheduling only. No riba/gharar/CSRA/salam/
 * investor/financing/cost-of-capital framing.
 */

import { useMemo, useState } from 'react';
import { create } from 'zustand';
import {
  useCropStore,
  type CropArea,
  type CropCoverWindow,
} from '../../store/cropStore.js';
import { CATALOG_BY_ID } from '../../data/plantCatalog.js';
import {
  COVER_CROP_CATALOG,
  coverCropEntryFor,
  type CoverCropRole,
} from './coverCropCatalog.js';
import {
  addWindow,
  removeWindow,
  defaultWindowFor,
  formatMonthRange,
  isValidMonth,
} from './coverCropPlannerMath.js';
import MonthBandPicker from './MonthBandPicker.js';
import { pushCoverCropPlanToSpine } from './coverCropSpineSync.js';
import css from './CoverCropPopoverEditor.module.css';

interface PopoverState {
  open: boolean;
  projectId: string | null;
  cropAreaId: string | null;
  anchor: { x: number; y: number } | null;
  openFor: (args: {
    projectId: string;
    cropAreaId: string;
    anchor?: { x: number; y: number } | null;
  }) => void;
  close: () => void;
}

export const useCoverCropPopoverStore = create<PopoverState>((set) => ({
  open: false,
  projectId: null,
  cropAreaId: null,
  anchor: null,
  openFor: ({ projectId, cropAreaId, anchor = null }) =>
    set({ open: true, projectId, cropAreaId, anchor }),
  close: () => set({ open: false, projectId: null, cropAreaId: null, anchor: null }),
}));

const ROLE_LABEL: Record<CoverCropRole, string> = {
  winter_cover: 'Winter cover',
  smother: 'Smother',
  green_manure: 'Green manure',
  scavenger: 'Scavenger',
  biofumigant: 'Biofumigant',
  living_mulch: 'Living mulch',
};

function speciesLabel(speciesId: string): string {
  const plant = CATALOG_BY_ID[speciesId];
  return plant?.commonName ?? speciesId;
}

export default function CoverCropPopoverEditor() {
  const popover = useCoverCropPopoverStore();
  const cropAreas = useCropStore((s) => s.cropAreas);
  const updateCropArea = useCropStore((s) => s.updateCropArea);

  const area = useMemo<CropArea | undefined>(
    () => cropAreas.find((a) => a.id === popover.cropAreaId),
    [cropAreas, popover.cropAreaId],
  );

  if (!popover.open || !area || !popover.projectId) return null;
  const projectId = popover.projectId;

  const style: React.CSSProperties = popover.anchor
    ? { left: popover.anchor.x, top: popover.anchor.y }
    : { left: '50%', top: '20vh', transform: 'translateX(-50%)' };

  return (
    <div className={css.shell} role="dialog" aria-label="Cover-crop editor" style={style}>
      <header className={css.head}>
        <span className={css.title}>Cover-crop · {area.name}</span>
        <button
          type="button"
          className={css.closeBtn}
          aria-label="Close"
          onClick={() => popover.close()}
        >
          ✕
        </button>
      </header>
      <PopoverBody
        area={area}
        onSave={(next) => {
          updateCropArea(area.id, { coverCropPlan: next });
          pushCoverCropPlanToSpine(projectId);
          popover.close();
        }}
      />
    </div>
  );
}

interface BodyProps {
  area: CropArea;
  onSave: (next: CropCoverWindow[]) => void;
}

function PopoverBody({ area, onSave }: BodyProps) {
  const stored = area.coverCropPlan ?? [];
  const [draft, setDraft] = useState<CropCoverWindow[]>(stored);
  const [adding, setAdding] = useState(false);

  return (
    <div className={css.body}>
      {draft.length === 0 ? (
        <div className={css.empty}>No cover-crop windows yet.</div>
      ) : (
        <ul className={css.list}>
          {draft.map((w, i) => (
            <li key={`${w.speciesId}-${i}`} className={css.row}>
              <span className={css.species}>{speciesLabel(w.speciesId)}</span>
              <span className={css.role}>{ROLE_LABEL[w.role]}</span>
              <span className={css.range}>
                {formatMonthRange(w.startMonth, w.endMonth)}
              </span>
              <button
                type="button"
                className={css.remove}
                onClick={() => setDraft((cur) => removeWindow(cur, i))}
                aria-label={`Remove ${speciesLabel(w.speciesId)} window`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <PopoverAddForm
          onAdd={(w) => {
            setDraft((cur) => addWindow(cur, w));
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          className={css.addBtn}
          onClick={() => setAdding(true)}
        >
          + Add cover-crop window
        </button>
      )}

      <div className={css.actions}>
        <button
          type="button"
          className={css.saveBtn}
          onClick={() => onSave(draft)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

interface AddFormProps {
  onAdd: (w: CropCoverWindow) => void;
  onCancel: () => void;
}

function PopoverAddForm({ onAdd, onCancel }: AddFormProps) {
  const firstEntry = COVER_CROP_CATALOG[0]!;
  const firstDefault = defaultWindowFor(firstEntry);
  const [speciesId, setSpeciesId] = useState<string>(firstEntry.speciesId);
  const [role, setRole] = useState<CoverCropRole>(firstEntry.roles[0]!);
  const [startMonth, setStartMonth] = useState<number>(firstDefault.startMonth);
  const [endMonth, setEndMonth] = useState<number>(firstDefault.endMonth);

  const entry = coverCropEntryFor(speciesId);
  const allowedRoles = entry?.roles ?? [];
  const canSubmit =
    !!entry &&
    !!role &&
    allowedRoles.includes(role) &&
    isValidMonth(startMonth) &&
    isValidMonth(endMonth);

  return (
    <div className={css.addForm}>
      <label className={css.field}>
        <span className={css.fieldLabel}>Species</span>
        <select
          className={css.select}
          value={speciesId}
          onChange={(e) => {
            const next = coverCropEntryFor(e.target.value);
            setSpeciesId(e.target.value);
            if (next) {
              setRole(next.roles[0]!);
              const def = defaultWindowFor(next);
              setStartMonth(def.startMonth);
              setEndMonth(def.endMonth);
            }
          }}
        >
          {COVER_CROP_CATALOG.map((e) => {
            const plant = CATALOG_BY_ID[e.speciesId];
            return (
              <option key={e.speciesId} value={e.speciesId}>
                {plant?.commonName ?? e.speciesId}
              </option>
            );
          })}
        </select>
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Role</span>
        <select
          className={css.select}
          value={role}
          onChange={(e) => setRole(e.target.value as CoverCropRole)}
        >
          {allowedRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>

      <div className={css.field}>
        <span className={css.fieldLabel}>Months</span>
        <MonthBandPicker
          startMonth={startMonth}
          endMonth={endMonth}
          ariaLabel="Cover-crop month range"
          onChange={(next) => {
            setStartMonth(next.startMonth);
            setEndMonth(next.endMonth);
          }}
        />
      </div>

      <div className={css.actions}>
        <button
          type="button"
          className={css.saveBtn}
          disabled={!canSubmit}
          onClick={() => onAdd({ speciesId, role, startMonth, endMonth })}
        >
          Add window
        </button>
        <button type="button" className={css.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
