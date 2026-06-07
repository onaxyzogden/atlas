/**
 * StakeholderCapture -- store-direct (NOT controlled-over-draft).
 *
 * Architecture note:
 *   - The panel (ST4) owns completion/rationale/defer and passes a thin
 *     per-item completion MARKER (`markerValue` / `onMarkerChange`), a flat
 *     FormValue. That marker only carries "none acknowledged" flags -- it does
 *     NOT carry stakeholder rows. Rows live in `stakeholderRegisterStore` and
 *     are shared across all six s1-stakeholders items for the same project.
 *   - This component subscribes to the store DIRECTLY and performs CRUD inline.
 *     It does NOT lift row state to the panel; the panel never touches rows.
 *   - Pure helpers (`stakeholderModeFor`, `isStakeholderValid`,
 *     `summariseStakeholder`) operate on a SNAPSHOT (rows array passed as arg)
 *     so they remain unit-testable without store wiring.
 *
 * REVIEW flags in this file:
 *   R1 -- pixel layout deferred pending operator's olos_stakeholders_mixed_surface.html mockup
 *   R2 -- type/role/contact selects and full add form are visual extras (omitted from skeleton)
 *   R3 -- isStakeholderValid semantics are placeholder-defensible; operator must confirm
 *   R4 -- summariseStakeholder copy is placeholder; operator must confirm
 *   R5 -- stakeholder-type-preview select is disabled/preview only (enum mapping R8 unresolved)
 *   R6 -- copy strings in render are minimal review placeholders
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../../../store/stakeholderRegisterStore.js';
import type { StakeholderRecord, RelationshipStatus } from '../../../store/stakeholderRegisterStore.js';
import css from './StakeholderCapture.module.css';

// --------------------------------------------------------------------------
// Mode type + router (exported pure helper)
// --------------------------------------------------------------------------

export type StakeholderMode = 'mapContact' | 'contact' | 'cultural' | 'annotate';

export function stakeholderModeFor(itemId: string): StakeholderMode {
  switch (itemId) {
    case 's1-stakeholders-c1': return 'mapContact';
    case 's1-stakeholders-c3': return 'cultural';
    case 's1-stakeholders-c5':
    case 's1-stakeholders-c6': return 'annotate';
    case 's1-stakeholders-c2':
    case 's1-stakeholders-c4': return 'contact';
    default: return 'contact';
  }
}

// --------------------------------------------------------------------------
// Internal marker-flag reader (pure)
// --------------------------------------------------------------------------

function markerFlag(marker: FormValue, key: string): boolean {
  return marker[key] === 'true';
}

// --------------------------------------------------------------------------
// Validity helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

// REVIEW R3: semantics are placeholder-defensible pending operator confirmation.
export function isStakeholderValid(
  itemId: string,
  rows: readonly StakeholderRecord[],
  marker: FormValue,
): boolean {
  const mode = stakeholderModeFor(itemId);
  switch (mode) {
    case 'mapContact':
    case 'contact':
      return rows.length >= 1 || markerFlag(marker, 'none');
    case 'cultural':
      return (
        rows.some((r) => r.isIndigenousOrCultural === true) ||
        markerFlag(marker, 'culturalNone')
      );
    case 'annotate':
      if (itemId === 's1-stakeholders-c5') {
        return rows.some((r) => !!r.relationshipStatus) || markerFlag(marker, 'none');
      }
      // c6
      return rows.some((r) => !!r.commsChannel) || markerFlag(marker, 'none');
  }
}

// --------------------------------------------------------------------------
// Summary helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

// REVIEW R4: copy is placeholder pending operator confirmation.
export function summariseStakeholder(
  itemId: string,
  rows: readonly StakeholderRecord[],
  marker: FormValue,
): string {
  const mode = stakeholderModeFor(itemId);
  switch (mode) {
    case 'mapContact':
    case 'contact': {
      if (rows.length === 0 && markerFlag(marker, 'none')) {
        return 'No stakeholders in this category - acknowledged';
      }
      const n = rows.length;
      return `${n} stakeholder${n === 1 ? '' : 's'} recorded`;
    }
    case 'cultural': {
      const n = rows.filter((r) => r.isIndigenousOrCultural).length;
      if (n === 0) {
        return 'No Indigenous relationships identified - acknowledged';
      }
      return `${n} Indigenous/cultural relationship${n === 1 ? '' : 's'} recorded`;
    }
    case 'annotate': {
      if (itemId === 's1-stakeholders-c5') {
        const n = rows.filter((r) => !!r.relationshipStatus).length;
        if (n === 0) return 'No relationships to annotate - acknowledged';
        return `${n} relationship status${n === 1 ? '' : 'es'} recorded`;
      }
      // c6
      const n = rows.filter((r) => !!r.commsChannel).length;
      if (n === 0) return 'No comms channels to annotate - acknowledged';
      return `${n} comms channel${n === 1 ? '' : 's'} recorded`;
    }
  }
}

// --------------------------------------------------------------------------
// Component props
// --------------------------------------------------------------------------

export interface StakeholderCaptureProps {
  itemId: string;
  projectId: string;
  resolveOptions: (optionSetId: string) => readonly string[];
  markerValue: FormValue;
  onMarkerChange: (next: FormValue) => void;
}

// --------------------------------------------------------------------------
// Default component
// --------------------------------------------------------------------------

export default function StakeholderCapture(props: StakeholderCaptureProps): JSX.Element {
  const { itemId, projectId, resolveOptions, markerValue, onMarkerChange } = props;

  // --- stable-snapshot selector (CRITICAL: avoids Zustand v5 infinite-render trap) ---
  const rowsById = useStakeholderRegisterStore(
    (s) => s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID,
  );
  const rows = useMemo(() => Object.values(rowsById), [rowsById]);

  // --- store actions (stable references) ---
  const createStakeholder = useStakeholderRegisterStore((s) => s.createStakeholder);
  const updateStakeholder = useStakeholderRegisterStore((s) => s.updateStakeholder);
  const deleteStakeholder = useStakeholderRegisterStore((s) => s.deleteStakeholder);

  const mode = stakeholderModeFor(itemId);

  // --- marker helpers ---
  const setMarkerFlag = (key: string, value: boolean) => {
    onMarkerChange({ ...markerValue, [key]: value ? 'true' : 'false' });
  };

  // ---------- builder modes (mapContact / contact) ----------
  if (mode === 'mapContact' || mode === 'contact') {
    return (
      <BuilderBody
        itemId={itemId}
        projectId={projectId}
        rows={rows}
        resolveOptions={resolveOptions}
        markerValue={markerValue}
        mode={mode}
        createStakeholder={createStakeholder}
        deleteStakeholder={deleteStakeholder}
        setMarkerFlag={setMarkerFlag}
      />
    );
  }

  // ---------- cultural mode (c3) ----------
  if (mode === 'cultural') {
    return (
      <CulturalBody
        projectId={projectId}
        rows={rows}
        markerValue={markerValue}
        createStakeholder={createStakeholder}
        deleteStakeholder={deleteStakeholder}
        setMarkerFlag={setMarkerFlag}
      />
    );
  }

  // ---------- annotate modes (c5 / c6) ----------
  return (
    <AnnotateBody
      itemId={itemId}
      projectId={projectId}
      rows={rows}
      resolveOptions={resolveOptions}
      markerValue={markerValue}
      updateStakeholder={updateStakeholder}
      setMarkerFlag={setMarkerFlag}
    />
  );
}

// --------------------------------------------------------------------------
// BuilderBody (mapContact + contact)
// --------------------------------------------------------------------------

interface BuilderBodyProps {
  itemId: string;
  projectId: string;
  rows: StakeholderRecord[];
  resolveOptions: (id: string) => readonly string[];
  markerValue: FormValue;
  mode: StakeholderMode;
  createStakeholder: (
    projectId: string,
    seed: Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<StakeholderRecord, 'id' | 'createdAt'>>,
  ) => StakeholderRecord;
  deleteStakeholder: (projectId: string, id: string) => void;
  setMarkerFlag: (key: string, value: boolean) => void;
}

function BuilderBody({
  projectId,
  rows,
  resolveOptions,
  markerValue,
  mode,
  createStakeholder,
  deleteStakeholder,
  setMarkerFlag,
}: BuilderBodyProps): JSX.Element {
  const [name, setName] = useState('');
  const typeOptions = resolveOptions('stakeholderType');
  const noneActive = markerFlag(markerValue, 'none');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createStakeholder(projectId, { name: trimmed, type: '', role: '' });
    setName('');
  };

  return (
    // REVIEW R1: pixel layout deferred
    <div className={css.root} data-mode={mode}>
      {/* disabled map affordance for mapContact only -- mirror BoundaryCapture */}
      {mode === 'mapContact' && (
        <div className={css.section}>
          {/* REVIEW R6: copy placeholder */}
          <button
            type="button"
            disabled
            data-testid="stakeholder-open-map"
            className={css.btn}
          >
            Open map -- coming soon
          </button>
        </div>
      )}

      {/* existing rows */}
      {rows.length > 0 && (
        <div className={css.section}>
          {rows.map((r) => (
            <div key={r.id} className={css.row}>
              <span className={css.rowName}>{r.name}</span>
              <button
                type="button"
                className={css.btn}
                data-testid="stakeholder-remove"
                aria-label={`Remove ${r.name}`}
                onClick={() => deleteStakeholder(projectId, r.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* add sub-form -- REVIEW R2: type/role/contact selects deferred */}
      <div className={css.addForm}>
        <input
          type="text"
          className={css.input}
          data-testid="stakeholder-name"
          placeholder="Stakeholder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {/* REVIEW R5: type-preview select -- wiring alive, write deferred (R8 enum mapping) */}
        <select
          className={css.input}
          data-testid="stakeholder-type-preview"
          disabled
          defaultValue=""
        >
          <option value="">Type (coming soon)</option>
          {typeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={css.btn}
          data-testid="stakeholder-add"
          onClick={handleAdd}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* none-in-category toggle */}
      <div className={css.section}>
        <button
          type="button"
          className={css.toggle}
          data-testid="stakeholder-none-toggle"
          aria-pressed={noneActive}
          onClick={() => setMarkerFlag('none', !noneActive)}
        >
          {/* REVIEW R6: copy placeholder */}
          None in this category - acknowledged
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// CulturalBody (c3)
// --------------------------------------------------------------------------

interface CulturalBodyProps {
  projectId: string;
  rows: StakeholderRecord[];
  markerValue: FormValue;
  createStakeholder: (
    projectId: string,
    seed: Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<StakeholderRecord, 'id' | 'createdAt'>>,
  ) => StakeholderRecord;
  deleteStakeholder: (projectId: string, id: string) => void;
  setMarkerFlag: (key: string, value: boolean) => void;
}

function CulturalBody({
  projectId,
  rows,
  markerValue,
  createStakeholder,
  deleteStakeholder,
  setMarkerFlag,
}: CulturalBodyProps): JSX.Element {
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const culturalRows = rows.filter((r) => r.isIndigenousOrCultural);
  const culturalNoneActive = markerFlag(markerValue, 'culturalNone');

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createStakeholder(projectId, {
      name: trimmedName,
      type: '',
      role: '',
      isIndigenousOrCultural: true,
      culturalContext: context.trim(),
    });
    setName('');
    setContext('');
  };

  return (
    // REVIEW R1: pixel layout deferred
    <div className={css.root} data-mode="cultural">
      {/* existing cultural rows */}
      {culturalRows.length > 0 && (
        <div className={css.section}>
          {culturalRows.map((r) => (
            <div key={r.id} className={css.row}>
              <span className={css.rowName}>{r.name}</span>
              {r.culturalContext && (
                <span className={css.rowMeta}>{r.culturalContext}</span>
              )}
              <button
                type="button"
                className={css.btn}
                data-testid="cultural-remove"
                aria-label={`Remove ${r.name}`}
                onClick={() => deleteStakeholder(projectId, r.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* add cultural sub-form */}
      <div className={css.addForm}>
        <input
          type="text"
          className={css.input}
          data-testid="cultural-name"
          placeholder="Name or group"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          className={css.input}
          data-testid="cultural-context"
          placeholder="Cultural context (optional)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <button
          type="button"
          className={css.btn}
          data-testid="cultural-add"
          onClick={handleAdd}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* explicit acknowledgement toggle */}
      <div className={css.section}>
        <button
          type="button"
          className={css.toggle}
          data-testid="cultural-none-toggle"
          aria-pressed={culturalNoneActive}
          onClick={() => setMarkerFlag('culturalNone', !culturalNoneActive)}
        >
          {/* REVIEW R6: copy placeholder */}
          No Indigenous land relationships or cultural obligations identified - acknowledged
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// AnnotateBody (c5 / c6)
// --------------------------------------------------------------------------

interface AnnotateBodyProps {
  itemId: string;
  projectId: string;
  rows: StakeholderRecord[];
  resolveOptions: (id: string) => readonly string[];
  markerValue: FormValue;
  updateStakeholder: (projectId: string, id: string, patch: Partial<StakeholderRecord>) => void;
  setMarkerFlag: (key: string, value: boolean) => void;
}

function AnnotateBody({
  itemId,
  projectId,
  rows,
  resolveOptions,
  markerValue,
  updateStakeholder,
  setMarkerFlag,
}: AnnotateBodyProps): JSX.Element {
  const isC5 = itemId === 's1-stakeholders-c5';
  const noneActive = markerFlag(markerValue, 'none');

  const relationshipOptions = resolveOptions('stakeholderRelationship');
  const commsOptions = resolveOptions('stakeholderCommsChannel');

  if (rows.length === 0) {
    return (
      // REVIEW R1: pixel layout deferred
      <div className={css.root} data-mode="annotate">
        <div className={css.section}>
          {/* REVIEW R6: copy placeholder */}
          <p className={css.emptyNote}>No stakeholders to annotate yet - acknowledged</p>
          <button
            type="button"
            className={css.toggle}
            data-testid="annotate-none-toggle"
            aria-pressed={noneActive}
            onClick={() => setMarkerFlag('none', !noneActive)}
          >
            None to annotate - acknowledged
          </button>
        </div>
      </div>
    );
  }

  return (
    // REVIEW R1: pixel layout deferred
    <div className={css.root} data-mode="annotate">
      <div className={css.section}>
        {rows.map((r) => (
          <div key={r.id} className={css.row}>
            <span className={css.rowName}>{r.name}</span>
            {isC5 ? (
              <select
                className={css.input}
                data-testid="annotate-relationship"
                aria-label={`Relationship status for ${r.name}`}
                value={r.relationshipStatus ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateStakeholder(projectId, r.id, {
                    relationshipStatus: val as RelationshipStatus,
                  });
                }}
              >
                <option value="">-- Select status --</option>
                {relationshipOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={css.input}
                data-testid="annotate-comms"
                aria-label={`Comms channel for ${r.name}`}
                value={r.commsChannel ?? ''}
                onChange={(e) => {
                  updateStakeholder(projectId, r.id, { commsChannel: e.target.value });
                }}
              >
                <option value="">-- Select channel --</option>
                {commsOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
