/**
 * AssumptionsCapture -- a bespoke, CONTROLLED renderer for the "Record
 * assumptions and known unknowns" Tier-0 decision (s1-vision-assumptions).
 *
 * It renders ONLY the body blocks (two sections: Assumptions + Known unknowns)
 * -- NOT the panel header, rationale, Record/Defer buttons, or generic gate-note
 * (those belong to DecisionWorkingPanel). Mirrors the pattern established by
 * ConstraintsCapture.
 *
 * DIVERGENCE NOTE: The gate-warning and feeds-info blocks live INSIDE this
 * capture (after both sections) rather than in the panel footer. This is
 * intentional: the panel's generic feedsLabel is null for s1-vision-assumptions
 * because its downstream signal is the feeds block copy, not an objective
 * title. The blocks are semantically part of the register surface.
 *
 * --- Central contract: flat FormValue encoding ---
 * Model: { assumptions: AssumptionEntry[]; unknowns: AssumptionEntry[] }
 * encoded as { assumptions: string[]; unknowns: string[] }
 * where each entry is JSON.stringify({ id, category, text, flag }).
 * decode/encode round-trip losslessly. decode is TOTAL/defensive.
 *
 * CONTROLLED / pure: entries are NEVER held in internal state. They are always
 * derived from decodeAssumptions(value) each render and the full next model is
 * emitted via onChange(encodeAssumptions(next)). The only internal state is
 * UI-only: which add-form is open ('assump' | 'unknown' | null) and the
 * transient composer state (selected category, draft text, flag toggle).
 *
 * ASCII-only: every non-ASCII glyph from the mockup is converted:
 *   em-dash (--) -> " -- " (space-hyphen-hyphen-space)
 *   en-dash in "Tier 1-2", "Tier 3" -> hyphen
 *   middot -> CSS dot span (NOT literal U+00B7)
 * All icons are lucide-react; no Unicode shapes in JSX.
 *
 * --- Category -> token color map ---
 * Infrastructure, Water  -> --color-info (blue)
 * Financial, Ecological  -> --color-success (green)
 * Environmental          -> --color-success (green)
 * Legal, Soil            -> --color-stage-act (amber/gold)
 * Community              -> --color-info (blue; no teal token available)
 * Technical              -> --color-info (blue)
 * (Two-category token collisions are acceptable; documented here.)
 */

import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Circle,
  Lock,
  Plus,
  Unlock,
  X,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './AssumptionsCapture.module.css';

// ---------------------------------------------------------------------------
// Stable id factory (module-scoped, pure -- no side-effects at import time)
// ---------------------------------------------------------------------------

function makeEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'asm-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Model + contract types
// ---------------------------------------------------------------------------

export interface AssumptionEntry {
  id: string;
  category: string;
  text: string;
  /** On assumptions: true = critical (design depends on this). On unknowns: true = blocking (design decision depends on resolving this). */
  flag: boolean;
}

export interface AssumptionsModel {
  assumptions: AssumptionEntry[];
  unknowns: AssumptionEntry[];
}

// ---------------------------------------------------------------------------
// Encode / decode helpers
// ---------------------------------------------------------------------------

/**
 * TOTAL / defensive decoder. Reads value.assumptions and value.unknowns via
 * array coercion; for each entry JSON.parses inside try/catch; drops entries
 * that fail to parse or lack a string text; coerces category to string
 * (default "General"); coerces flag to boolean (default false); id = parsed
 * non-empty string else "legacy-"+index.
 * NEVER fabricates a seed entry.
 */
export function decodeAssumptions(value: FormValue): AssumptionsModel {
  function decodeList(raw: unknown): AssumptionEntry[] {
    const arr: unknown[] = Array.isArray(raw) ? raw : [];
    const entries: AssumptionEntry[] = [];
    let index = 0;
    for (const entry of arr) {
      if (typeof entry !== 'string') { index++; continue; }
      try {
        const parsed: unknown = JSON.parse(entry);
        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          typeof (parsed as { text?: unknown }).text !== 'string'
        ) {
          index++;
          continue;
        }
        const p = parsed as { id?: unknown; category?: unknown; text: string; flag?: unknown };
        const id: string =
          typeof p.id === 'string' && p.id !== '' ? p.id : 'legacy-' + index;
        const category: string =
          typeof p.category === 'string' && p.category !== '' ? p.category : 'General';
        const flag: boolean = typeof p.flag === 'boolean' ? p.flag : false;
        entries.push({ id, category, text: p.text, flag });
      } catch {
        // drop malformed entry
      }
      index++;
    }
    return entries;
  }

  return {
    assumptions: decodeList(value.assumptions),
    unknowns: decodeList(value.unknowns),
  };
}

/** Encodes the model back to a flat FormValue. Round-trips losslessly with decodeAssumptions. */
export function encodeAssumptions(model: AssumptionsModel): FormValue {
  return {
    assumptions: model.assumptions.map((e) => JSON.stringify(e)),
    unknowns: model.unknowns.map((e) => JSON.stringify(e)),
  };
}

/** True iff >=1 assumption with non-empty trimmed text AND >=1 unknown with non-empty trimmed text. */
export function isAssumptionsValid(model: AssumptionsModel): boolean {
  const hasAssumption = model.assumptions.some((e) => e.text.trim() !== '');
  const hasUnknown = model.unknowns.some((e) => e.text.trim() !== '');
  return hasAssumption && hasUnknown;
}

/** Pure summary: "N assumption(s), N known unknown(s) recorded". */
export function summariseAssumptions(model: AssumptionsModel): string {
  const a = model.assumptions.filter((e) => e.text.trim() !== '').length;
  const u = model.unknowns.filter((e) => e.text.trim() !== '').length;
  return (
    `${a} assumption${a !== 1 ? 's' : ''}, ` +
    `${u} known unknown${u !== 1 ? 's' : ''} recorded`
  );
}

// ---------------------------------------------------------------------------
// Category -> CSS data-category attribute (one class-system via CSS attr selector)
// ---------------------------------------------------------------------------

// Assumptions add-form categories
const ASSUMP_CATEGORIES = [
  'Infrastructure',
  'Legal',
  'Financial',
  'Community',
  'Environmental',
  'Technical',
] as const;

// Unknowns add-form categories
const UNKNOWN_CATEGORIES = [
  'Soil',
  'Water',
  'Ecological',
  'Legal',
  'Infrastructure',
  'Financial',
] as const;

// ---------------------------------------------------------------------------
// Suggestion chip catalogue
// ---------------------------------------------------------------------------

interface SuggestionChip {
  display: string;
  full: string;
  category: string;
}

const ASSUMP_CHIPS: SuggestionChip[] = [
  {
    display: 'Market demand',
    full: 'Market demand will support the enterprise at planned scale',
    category: 'Financial',
  },
  {
    display: 'Neighbour cooperation',
    full: 'The neighbours will cooperate with shared access and fencing',
    category: 'Community',
  },
  {
    display: 'Capital sufficiency',
    full: 'Initial capital budget will be sufficient for Tier 0-2 establishment',
    category: 'Financial',
  },
  {
    display: 'Year-round access',
    full: 'Physical access to the site will remain viable year-round',
    category: 'Infrastructure',
  },
];

const UNKNOWN_CHIPS: SuggestionChip[] = [
  {
    display: 'Listed species?',
    full: 'Ecological value of the remnant vegetation patches -- presence of listed species',
    category: 'Ecological',
  },
  {
    display: 'Underground services',
    full: 'Exact location of underground water and sewer services -- affects earthworks',
    category: 'Infrastructure',
  },
  {
    display: 'Dam regulations',
    full: 'Regulatory requirements for the dam and any watercourse works',
    category: 'Legal',
  },
  {
    display: 'Fencing adequacy',
    full: 'Whether existing fencing meets stock containment requirements',
    category: 'Infrastructure',
  },
];

// ---------------------------------------------------------------------------
// RegisterSection config
// ---------------------------------------------------------------------------

interface SectionConfig {
  /** Section type key -- used for add-form open state. */
  type: 'assump' | 'unknown';
  /** Section header label. */
  label: string;
  /** Definition line under the header. */
  definition: string;
  /** Category chips in the add-form. */
  categories: readonly string[];
  /** Suggestion chips. */
  chips: SuggestionChip[];
  /** Placeholder for the add-form text input. */
  inputPlaceholder: string;
  /** Label for the flag toggle in the add-form. */
  flagLabel: string;
  /** Add button label. */
  addBtnLabel: string;
  /** Suggestion section label. */
  sugLabel: string;
}

const ASSUMP_CONFIG: SectionConfig = {
  type: 'assump',
  label: 'Assumptions',
  definition:
    "Things you're treating as true but haven't verified. Flagging as critical means design decisions depend on this being correct.",
  categories: ASSUMP_CATEGORIES,
  chips: ASSUMP_CHIPS,
  inputPlaceholder: 'We are assuming that...',
  flagLabel: 'Critical -- design depends on this',
  addBtnLabel: 'Add assumption',
  sugLabel: 'Common assumptions -- click to add',
};

const UNKNOWN_CONFIG: SectionConfig = {
  type: 'unknown',
  label: 'Known unknowns',
  definition:
    "Things you know you don't know yet. Flagging as blocking means a design decision depends on resolving this first.",
  categories: UNKNOWN_CATEGORIES,
  chips: UNKNOWN_CHIPS,
  inputPlaceholder: 'We don\'t yet know...',
  flagLabel: 'Blocks a design decision',
  addBtnLabel: 'Add known unknown',
  sugLabel: 'Common unknowns -- click to add',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AssumptionsCaptureProps {
  value: FormValue;
  onChange: (next: FormValue) => void;
}

// ---------------------------------------------------------------------------
// Composer state (add-form)
// ---------------------------------------------------------------------------

interface ComposerState {
  category: string;
  text: string;
  flag: boolean;
}

function defaultComposer(config: SectionConfig): ComposerState {
  return { category: config.categories[0] ?? 'General', text: '', flag: false };
}

// ---------------------------------------------------------------------------
// Internal RegisterSection subcomponent
// ---------------------------------------------------------------------------

interface RegisterSectionProps {
  config: SectionConfig;
  entries: AssumptionEntry[];
  openForm: 'assump' | 'unknown' | null;
  composer: ComposerState;
  onOpenForm: (type: 'assump' | 'unknown') => void;
  onCloseForm: () => void;
  onComposerChange: (next: Partial<ComposerState>) => void;
  onAddEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onToggleFlag: (id: string) => void;
  onAddChip: (chip: SuggestionChip) => void;
}

function RegisterSection({
  config,
  entries,
  openForm,
  composer,
  onOpenForm,
  onCloseForm,
  onComposerChange,
  onAddEntry,
  onDeleteEntry,
  onToggleFlag,
  onAddChip,
}: RegisterSectionProps): JSX.Element {
  const count = entries.filter((e) => e.text.trim() !== '').length;
  const isFormOpen = openForm === config.type;

  return (
    <div className={css.section}>
      {/* Section header */}
      <div className={css.sectHead}>
        <span className={css.sectLbl}>{config.label}</span>
        <span className={css.sectCount} data-testid={`${config.type}-count`}>{count}</span>
      </div>
      <div className={css.sectDef}>{config.definition}</div>

      {/* Entry list */}
      {entries.length > 0 ? (
        <div className={css.entryList}>
          {entries.map((entry) => {
            const isCritOrBlock = entry.flag;
            const isAssump = config.type === 'assump';
            return (
              <div
                key={entry.id}
                className={css.entryCard}
                data-testid={`${config.type}-entry`}
              >
                <span
                  className={css.entryCat}
                  data-category={entry.category}
                  aria-label={entry.category}
                >
                  {entry.category}
                </span>
                <span className={css.entryText}>{entry.text}</span>
                <button
                  type="button"
                  className={css.entryFlag}
                  data-flag-on={isCritOrBlock ? 'true' : 'false'}
                  data-flag-type={isAssump ? 'crit' : 'block'}
                  title={
                    isCritOrBlock
                      ? isAssump
                        ? 'Critical -- toggle off if not critical'
                        : 'Blocking -- toggle off if not blocking'
                      : isAssump
                        ? 'Not critical -- toggle to mark critical'
                        : 'Not blocking -- toggle to mark blocking'
                  }
                  aria-label={
                    isCritOrBlock
                      ? isAssump
                        ? 'Mark as not critical'
                        : 'Mark as not blocking'
                      : isAssump
                        ? 'Mark as critical'
                        : 'Mark as blocking'
                  }
                  onClick={() => onToggleFlag(entry.id)}
                >
                  {isAssump ? (
                    isCritOrBlock ? (
                      <AlertCircle size={10} aria-hidden="true" />
                    ) : (
                      <Circle size={10} aria-hidden="true" />
                    )
                  ) : isCritOrBlock ? (
                    <Lock size={10} aria-hidden="true" />
                  ) : (
                    <Unlock size={10} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className={css.entryDel}
                  aria-label={`Remove entry`}
                  onClick={() => onDeleteEntry(entry.id)}
                >
                  <X size={9} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Suggestion chips */}
      <div className={css.sugSection}>
        <div className={css.sugLabel}>{config.sugLabel}</div>
        <div className={css.sugChips}>
          {config.chips.map((chip) => (
            <button
              key={chip.full}
              type="button"
              className={css.sugChip}
              data-testid={`${config.type}-chip-${chip.display}`}
              onClick={() => onAddChip(chip)}
            >
              {chip.display}
            </button>
          ))}
        </div>
      </div>

      {/* Compact add-form -- shown when isFormOpen */}
      {isFormOpen ? (
        <div className={css.cafWrap}>
          <div className={css.cafCatRow}>
            {config.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={css.cafCatChip}
                data-selected={composer.category === cat ? 'true' : 'false'}
                onClick={() => onComposerChange({ category: cat })}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            className={css.cafInp}
            type="text"
            placeholder={config.inputPlaceholder}
            value={composer.text}
            aria-label={`New ${config.label.toLowerCase()} text`}
            onChange={(e) => onComposerChange({ text: e.target.value })}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className={css.cafBottom}>
            <div className={css.cafFlagRow}>
              <button
                type="button"
                className={css.cafToggle}
                data-on={composer.flag ? 'true' : 'false'}
                aria-checked={composer.flag}
                aria-label={config.flagLabel}
                role="switch"
                onClick={() => onComposerChange({ flag: !composer.flag })}
              />
              <span className={css.cafFlagLbl}>{config.flagLabel}</span>
            </div>
            <div className={css.cafBtns}>
              <button
                type="button"
                className={css.cafAddBtn}
                onClick={onAddEntry}
              >
                Add
              </button>
              <button
                type="button"
                className={css.cafCancelBtn}
                onClick={onCloseForm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dashed add button */}
      {!isFormOpen ? (
        <button
          type="button"
          className={css.addRowBtn}
          data-testid={`${config.type}-add-btn`}
          onClick={() => onOpenForm(config.type)}
        >
          <Plus size={10} aria-hidden="true" />
          {config.addBtnLabel}
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssumptionsCapture({
  value,
  onChange,
}: AssumptionsCaptureProps): JSX.Element {
  // UI-only state: which add-form is open + transient composer per-section.
  const [openForm, setOpenForm] = useState<'assump' | 'unknown' | null>(null);
  const [assumpComposer, setAssumpComposer] = useState<ComposerState>(
    () => defaultComposer(ASSUMP_CONFIG),
  );
  const [unknownComposer, setUnknownComposer] = useState<ComposerState>(
    () => defaultComposer(UNKNOWN_CONFIG),
  );

  // Derive model every render (CONTROLLED -- no model state).
  const model = decodeAssumptions(value);
  const emit = (next: AssumptionsModel) => onChange(encodeAssumptions(next));

  // ---- Section-generic handlers (parameterised by 'assump' | 'unknown') ----

  const handleOpenForm = (type: 'assump' | 'unknown') => {
    setOpenForm(type);
  };

  const handleCloseForm = () => {
    setOpenForm(null);
    setAssumpComposer(defaultComposer(ASSUMP_CONFIG));
    setUnknownComposer(defaultComposer(UNKNOWN_CONFIG));
  };

  const handleComposerChange = (
    type: 'assump' | 'unknown',
    patch: Partial<ComposerState>,
  ) => {
    if (type === 'assump') {
      setAssumpComposer((prev) => ({ ...prev, ...patch }));
    } else {
      setUnknownComposer((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleAddEntry = (type: 'assump' | 'unknown') => {
    const composer = type === 'assump' ? assumpComposer : unknownComposer;
    if (composer.text.trim() === '') return;
    const newEntry: AssumptionEntry = {
      id: makeEntryId(),
      category: composer.category,
      text: composer.text.trim(),
      flag: composer.flag,
    };
    if (type === 'assump') {
      emit({ ...model, assumptions: [...model.assumptions, newEntry] });
    } else {
      emit({ ...model, unknowns: [...model.unknowns, newEntry] });
    }
    handleCloseForm();
  };

  const handleDeleteEntry = (type: 'assump' | 'unknown', id: string) => {
    if (type === 'assump') {
      emit({ ...model, assumptions: model.assumptions.filter((e) => e.id !== id) });
    } else {
      emit({ ...model, unknowns: model.unknowns.filter((e) => e.id !== id) });
    }
  };

  const handleToggleFlag = (type: 'assump' | 'unknown', id: string) => {
    if (type === 'assump') {
      emit({
        ...model,
        assumptions: model.assumptions.map((e) =>
          e.id === id ? { ...e, flag: !e.flag } : e,
        ),
      });
    } else {
      emit({
        ...model,
        unknowns: model.unknowns.map((e) =>
          e.id === id ? { ...e, flag: !e.flag } : e,
        ),
      });
    }
  };

  const handleAddChip = (type: 'assump' | 'unknown', chip: SuggestionChip) => {
    const newEntry: AssumptionEntry = {
      id: makeEntryId(),
      category: chip.category,
      text: chip.full,
      flag: false,
    };
    if (type === 'assump') {
      emit({ ...model, assumptions: [...model.assumptions, newEntry] });
    } else {
      emit({ ...model, unknowns: [...model.unknowns, newEntry] });
    }
  };

  return (
    <div className={css.root}>
      {/* ---- SECTION 1: Assumptions ---- */}
      <RegisterSection
        config={ASSUMP_CONFIG}
        entries={model.assumptions}
        openForm={openForm}
        composer={assumpComposer}
        onOpenForm={handleOpenForm}
        onCloseForm={handleCloseForm}
        onComposerChange={(patch) => handleComposerChange('assump', patch)}
        onAddEntry={() => handleAddEntry('assump')}
        onDeleteEntry={(id) => handleDeleteEntry('assump', id)}
        onToggleFlag={(id) => handleToggleFlag('assump', id)}
        onAddChip={(chip) => handleAddChip('assump', chip)}
      />

      {/* ---- Section divider ---- */}
      <div className={css.sectionDivider} aria-hidden="true" />

      {/* ---- SECTION 2: Known unknowns ---- */}
      <RegisterSection
        config={UNKNOWN_CONFIG}
        entries={model.unknowns}
        openForm={openForm}
        composer={unknownComposer}
        onOpenForm={handleOpenForm}
        onCloseForm={handleCloseForm}
        onComposerChange={(patch) => handleComposerChange('unknown', patch)}
        onAddEntry={() => handleAddEntry('unknown')}
        onDeleteEntry={(id) => handleDeleteEntry('unknown', id)}
        onToggleFlag={(id) => handleToggleFlag('unknown', id)}
        onAddChip={(chip) => handleAddChip('unknown', chip)}
      />

      {/* ---- Legend ---- */}
      <div className={css.legend}>
        <div className={css.legItem}>
          <span className={css.legDot} data-leg="crit" aria-hidden="true">
            <AlertCircle size={9} aria-hidden="true" />
          </span>
          Critical assumption
        </div>
        <div className={css.legItem}>
          <span className={css.legDot} data-leg="block" aria-hidden="true">
            <Lock size={9} aria-hidden="true" />
          </span>
          Blocks design
        </div>
        <div className={css.legItem}>
          <span className={css.legDot} data-leg="off" aria-hidden="true">
            <Circle size={9} aria-hidden="true" />
          </span>
          Non-critical
        </div>
      </div>

      {/* ---- Feeds info block -- lives here (not in panel footer) because feedsLabel is null. ---- */}
      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          <strong>Blocking unknowns</strong> are surfaced in the Tier 1-2
          survey objectives as investigation priorities.{' '}
          <strong>Critical assumptions</strong> are re-checked at the Tier 3
          project direction review.
        </div>
      </div>
    </div>
  );
}
