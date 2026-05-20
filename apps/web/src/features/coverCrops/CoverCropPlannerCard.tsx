/**
 * CoverCropPlannerCard — B5.2.x per-CropArea cover-crop plan editor.
 *
 * Single new write-surface for `CropArea.coverCropPlan`: stewards
 * add / edit / remove `CropCoverWindow` rows against the 14-entry
 * COVER_CROP_CATALOG. Writes go through the existing single-writer
 * `updateCropArea(id, { coverCropPlan })` action — atomic array
 * replacement, no new store action. The read-only LivingRootsCard
 * (cross-registered into plant-systems + soil-fertility) picks up
 * the writes automatically through Zustand.
 *
 * Mounted under the plant-systems module (sibling of LivingRootsCard).
 * Not cross-registered — the audit travels to soil-fertility; the
 * editor stays on the plant-systems tab where stewards draw crop
 * areas.
 *
 * Covenant: agronomic only — no riba / gharar / CSRA / salam /
 * investor / financing / cost-of-capital framing. "Coverage" is
 * months of living roots in the ground, never a financial or
 * yield-as-return notion.
 */

import { useMemo, useState } from 'react';
import { useCropStore, type CropArea, type CropCoverWindow } from '../../store/cropStore.js';
import { CATALOG_BY_ID } from '../../data/plantCatalog.js';
import {
  COVER_CROP_CATALOG,
  coverCropEntryFor,
  livingRootMonthsFor,
  type CoverCropRole,
} from './coverCropCatalog.js';
import {
  addWindow,
  removeWindow,
  defaultWindowFor,
  windowsEqual,
  formatMonthRange,
  isValidMonth,
} from './coverCropPlannerMath.js';
import css from './CoverCropPlannerCard.module.css';

interface Props {
  projectId: string;
}

const ROLE_GROUP_ORDER: CoverCropRole[] = [
  'winter_cover',
  'smother',
  'green_manure',
  'scavenger',
  'biofumigant',
  'living_mulch',
];

const ROLE_LABEL: Record<CoverCropRole, string> = {
  winter_cover: 'Winter cover',
  smother: 'Smother',
  green_manure: 'Green manure',
  scavenger: 'Scavenger',
  biofumigant: 'Biofumigant',
  living_mulch: 'Living mulch',
};

const SEASON_LABEL: Record<'spring' | 'summer' | 'fall' | 'winter', string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

function speciesLabel(speciesId: string): string {
  const plant = CATALOG_BY_ID[speciesId];
  return plant?.commonName ?? speciesId;
}

function seasonsFor(months: number[]): string[] {
  const set = new Set<'spring' | 'summer' | 'fall' | 'winter'>();
  for (const m of months) {
    if (m >= 3 && m <= 5) set.add('spring');
    else if (m >= 6 && m <= 8) set.add('summer');
    else if (m >= 9 && m <= 11) set.add('fall');
    else set.add('winter');
  }
  return Array.from(set).map((s) => SEASON_LABEL[s]);
}

export default function CoverCropPlannerCard({ projectId }: Props) {
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const updateCropArea = useCropStore((s) => s.updateCropArea);

  const areas = useMemo(
    () => allCropAreas.filter((a) => a.projectId === projectId),
    [projectId, allCropAreas],
  );

  const Head = () => (
    <div className={css.cardHead}>
      <div>
        <h3 className={css.cardTitle}>Cover-crop planner</h3>
        <p className={css.cardHint}>
          Schedule cover-crop windows per crop area against the cited
          catalog. Coverage flows into the living-roots audit below.
        </p>
      </div>
      <span className={css.modeBadge}>Writes to cover-crop plan</span>
    </div>
  );

  if (areas.length === 0) {
    return (
      <section className={css.card}>
        <Head />
        <div className={css.empty}>
          No crop areas yet — draw a row crop, garden bed, or orchard in
          the plant-systems module to begin planning cover crops.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <Head />
      <div className={css.areaList}>
        {areas.map((area) => (
          <AreaEditor
            key={area.id}
            area={area}
            onSave={(next) => updateCropArea(area.id, { coverCropPlan: next })}
          />
        ))}
      </div>
    </section>
  );
}

interface AreaEditorProps {
  area: CropArea;
  onSave: (next: CropCoverWindow[]) => void;
}

function AreaEditor({ area, onSave }: AreaEditorProps) {
  const stored = area.coverCropPlan ?? [];
  const [draft, setDraft] = useState<CropCoverWindow[]>(stored);
  const [storedSnapshot, setStoredSnapshot] = useState<CropCoverWindow[]>(stored);

  // Reconcile if the stored array changed under us (e.g. another tab wrote).
  if (!windowsEqual(stored, storedSnapshot) && windowsEqual(draft, storedSnapshot)) {
    setStoredSnapshot(stored);
    setDraft(stored);
  }

  const [adding, setAdding] = useState(false);

  const dirty = !windowsEqual(draft, stored);

  return (
    <div className={css.areaRow}>
      <div className={css.areaHead}>
        <span className={css.areaName}>{area.name}</span>
        <span className={css.areaMeta}>
          {area.type.replace(/_/g, ' ')} · {area.areaM2.toFixed(0)} m²
        </span>
      </div>

      {draft.length === 0 ? (
        <div className={css.noWindows}>No cover-crop windows yet.</div>
      ) : (
        <ul className={css.windowList}>
          {draft.map((w, i) => (
            <li key={`${w.speciesId}-${i}`} className={css.windowItem}>
              <span className={css.windowSpecies}>{speciesLabel(w.speciesId)}</span>
              <span className={css.windowRole}>{ROLE_LABEL[w.role]}</span>
              <span className={css.windowRange}>
                {formatMonthRange(w.startMonth, w.endMonth)}
              </span>
              <button
                type="button"
                className={css.windowRemove}
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
        <AddWindowForm
          onAdd={(w) => {
            setDraft((cur) => addWindow(cur, w));
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          className={css.addButton}
          onClick={() => setAdding(true)}
        >
          + Add cover-crop window
        </button>
      )}

      <div className={css.actions}>
        <button
          type="button"
          className={css.saveButton}
          disabled={!dirty}
          onClick={() => {
            onSave(draft);
            setStoredSnapshot(draft);
          }}
        >
          Save changes
        </button>
        <button
          type="button"
          className={css.discardButton}
          disabled={!dirty}
          onClick={() => setDraft(stored)}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

interface AddWindowFormProps {
  onAdd: (w: CropCoverWindow) => void;
  onCancel: () => void;
}

function AddWindowForm({ onAdd, onCancel }: AddWindowFormProps) {
  const grouped = useMemo(() => {
    const out: Record<CoverCropRole, typeof COVER_CROP_CATALOG[number][]> = {
      winter_cover: [],
      smother: [],
      green_manure: [],
      scavenger: [],
      biofumigant: [],
      living_mulch: [],
    };
    for (const entry of COVER_CROP_CATALOG) {
      const primary = entry.roles[0] as CoverCropRole | undefined;
      if (primary && out[primary]) out[primary].push(entry);
    }
    return out;
  }, []);

  const firstEntry = COVER_CROP_CATALOG[0]!;
  const firstDefault = defaultWindowFor(firstEntry);

  const [speciesId, setSpeciesId] = useState<string>(firstEntry.speciesId);
  const [role, setRole] = useState<CoverCropRole>(firstEntry.roles[0]!);
  const [startMonth, setStartMonth] = useState<number>(firstDefault.startMonth);
  const [endMonth, setEndMonth] = useState<number>(firstDefault.endMonth);

  const entry = coverCropEntryFor(speciesId);
  const allowedRoles = entry?.roles ?? [];

  const months = livingRootMonthsFor({ startMonth, endMonth });
  const seasons = seasonsFor(months);

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
            const nextId = e.target.value;
            const next = coverCropEntryFor(nextId);
            setSpeciesId(nextId);
            if (next) {
              setRole(next.roles[0]!);
              const def = defaultWindowFor(next);
              setStartMonth(def.startMonth);
              setEndMonth(def.endMonth);
            }
          }}
        >
          {ROLE_GROUP_ORDER.map((groupRole) =>
            grouped[groupRole].length > 0 ? (
              <optgroup key={groupRole} label={ROLE_LABEL[groupRole]}>
                {grouped[groupRole].map((e) => {
                  const plant = CATALOG_BY_ID[e.speciesId];
                  return (
                    <option key={e.speciesId} value={e.speciesId}>
                      {plant?.commonName ?? e.speciesId}
                      {plant?.latinName ? ` · ${plant.latinName}` : ''}
                    </option>
                  );
                })}
              </optgroup>
            ) : null,
          )}
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

      <div className={css.monthRow}>
        <label className={css.field}>
          <span className={css.fieldLabel}>Start month</span>
          <input
            className={css.monthInput}
            type="number"
            min={1}
            max={12}
            value={startMonth}
            onChange={(e) => setStartMonth(Number(e.target.value))}
          />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>End month</span>
          <input
            className={css.monthInput}
            type="number"
            min={1}
            max={12}
            value={endMonth}
            onChange={(e) => setEndMonth(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={css.seasonHint}>
        Living roots: {seasons.length > 0 ? seasons.join(', ') : '—'}
      </div>

      <div className={css.formActions}>
        <button
          type="button"
          className={css.addConfirm}
          disabled={!canSubmit}
          onClick={() => onAdd({ speciesId, role, startMonth, endMonth })}
        >
          Add window
        </button>
        <button type="button" className={css.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
