/**
 * ConstraintsCapture -- a bespoke, CONTROLLED renderer for the "Identify
 * non-negotiables and hard constraints" Tier-0 decision (s1-vision-constraints).
 *
 * It renders ONLY the body blocks (two tabs: Suggest + Register) -- NOT the
 * panel header, rationale, Record/Defer buttons, or generic gate-note (those
 * belong to DecisionWorkingPanel). This mirrors the pattern established by
 * SuccessCriteriaCapture and LabourInventoryCapture.
 *
 * DIVERGENCE NOTE: The gate-warning and feeds-info blocks live INSIDE this
 * capture (in the Register tab) rather than in the panel footer. This is
 * intentional: the panel's generic feedsLabel is null for s1-vision-constraints
 * because its downstream signal is the gate-warning copy, not an objective
 * title. The blocks are semantically part of the register surface, not the
 * footer chrome.
 *
 * --- Central contract: flat FormValue encoding ---
 * The parent persists a FLAT FormValue (Record<string, string | string[]>).
 * Model: { constraints: Constraint[] } encoded as { constraints: string[] }
 * where each entry is JSON.stringify({ text, severity, note }). This is
 * delimiter-safe (constraint text/notes contain dashes, commas, punctuation).
 * decode/encode round-trip losslessly. decode is TOTAL/defensive.
 *
 * CONTROLLED / pure: the constraints array is NEVER held in internal state.
 * It is always derived from decode(value) each render and the full next model
 * is emitted via onChange(encode(next)). The only internal state is UI-only:
 * the active tab and which category sections are expanded.
 *
 * ASCII-only: every non-ASCII glyph from the mockup is converted:
 *   em-dash (--) -> " -- " (space-hyphen-hyphen-space)
 *   superscript 2 -> "2"  (e.g. "500m2")
 * All icons are lucide-react; no Unicode shapes in JSX.
 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Coins,
  Gavel,
  Heart,
  Leaf,
  Mountain,
  Plus,
  X,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './ConstraintsCapture.module.css';

// ---------------------------------------------------------------------------
// Stable id factory (module-scoped, pure -- no side-effects at import time)
// ---------------------------------------------------------------------------

function makeConstraintId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'cst-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Model + contract types
// ---------------------------------------------------------------------------

export type ConstraintSeverity = 'nn' | 'hc'; // nn = non-negotiable, hc = hard constraint

export interface Constraint {
  id: string;
  text: string;
  severity: ConstraintSeverity;
  note: string;
}

export interface ConstraintsModel {
  constraints: Constraint[];
}

// ---------------------------------------------------------------------------
// Encode / decode helpers
// ---------------------------------------------------------------------------

/**
 * TOTAL / defensive decoder. Reads value.constraints via array coercion; for
 * each entry JSON.parses inside try/catch; drops entries that fail to parse or
 * lack a string text; coerces severity to 'nn'|'hc' (default 'hc'); coerces
 * note to string (default ''). Empty/garbage value -> { constraints: [] }.
 * NEVER fabricates a seed constraint.
 */
export function decodeConstraints(value: FormValue): ConstraintsModel {
  const raw = value.constraints;
  const arr: unknown[] = Array.isArray(raw) ? raw : [];

  const constraints: Constraint[] = [];
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
      const p = parsed as { id?: unknown; text: string; severity?: unknown; note?: unknown };
      const id: string =
        typeof p.id === 'string' && p.id !== '' ? p.id : 'legacy-' + index;
      const severity: ConstraintSeverity =
        p.severity === 'nn' ? 'nn' : 'hc';
      const note: string = typeof p.note === 'string' ? p.note : '';
      constraints.push({ id, text: p.text, severity, note });
    } catch {
      // drop malformed entry
    }
    index++;
  }
  return { constraints };
}

/** Encodes the model back to a flat FormValue. Round-trips losslessly with decodeConstraints. */
export function encodeConstraints(model: ConstraintsModel): FormValue {
  return {
    constraints: model.constraints.map((c) => JSON.stringify(c)),
  };
}

/** True iff at least one constraint has non-empty trimmed text. */
export function isConstraintsValid(model: ConstraintsModel): boolean {
  return model.constraints.some((c) => c.text.trim() !== '');
}

/**
 * Pure summary. Counts constraints with non-empty text as total, of which nn
 * are non-negotiable. Format: "N constraint(s) recorded -- N non-negotiable(s)".
 */
export function summariseConstraints(model: ConstraintsModel): string {
  const filled = model.constraints.filter((c) => c.text.trim() !== '');
  const total = filled.length;
  const nn = filled.filter((c) => c.severity === 'nn').length;
  return (
    `${total} constraint${total !== 1 ? 's' : ''} recorded -- ` +
    `${nn} non-negotiable${nn !== 1 ? 's' : ''}`
  );
}

// ---------------------------------------------------------------------------
// Suggestion chip catalogue
// ---------------------------------------------------------------------------

interface SuggestionChip {
  /** Short display text shown on the chip. */
  display: string;
  /** Full text added to the register when the chip is clicked. */
  full: string;
  severity: ConstraintSeverity;
}

interface Category {
  id: string;
  name: string;
  /** Lucide icon component. */
  Icon: typeof Mountain;
  chips: SuggestionChip[];
}

const CATEGORIES: Category[] = [
  {
    id: 'physical',
    name: 'Physical & Site',
    Icon: Mountain,
    chips: [
      {
        display: 'No permanent structures within 50m of the creek line',
        full: 'No permanent structures permitted within 50m of the creek line',
        severity: 'hc',
      },
      {
        display: 'Vehicle access limited to eastern gate only',
        full: 'Vehicle access limited to the eastern gate -- western boundary has no road access',
        severity: 'hc',
      },
      {
        display: 'Heavy machinery cannot access the north paddock',
        full: 'Heavy machinery cannot access the north paddock -- ground too soft year-round',
        severity: 'hc',
      },
      {
        display: 'Existing bore is not to be disturbed or decommissioned',
        full: 'Existing bore is not to be disturbed or decommissioned under any circumstances',
        severity: 'nn',
      },
    ],
  },
  {
    id: 'legal',
    name: 'Legal & Regulatory',
    Icon: Gavel,
    chips: [
      {
        display: 'Planning permit required before earthworks exceeding 500m2',
        full: 'Planning permit required before any earthworks exceeding 500m2 can begin',
        severity: 'nn',
      },
      {
        display: 'Heritage overlay on stone cottage -- no external modifications without council approval',
        full: 'Heritage overlay applies to the stone cottage -- no external modifications without council approval',
        severity: 'nn',
      },
      {
        display: 'Water entitlement capped at 5ML/year',
        full: 'Water entitlement is limited to 5ML/year -- no works that would increase extraction beyond this',
        severity: 'hc',
      },
      {
        display: 'No clearing within 10m of any waterway -- riparian zone protected',
        full: 'Riparian vegetation zone must be maintained -- no clearing within 10m of any waterway',
        severity: 'nn',
      },
    ],
  },
  {
    id: 'financial',
    name: 'Financial & Capacity',
    Icon: Coins,
    chips: [
      {
        display: 'No debt financing -- all capex from existing funds or grants only',
        full: 'No debt financing -- all capital expenditure must come from existing funds or grants',
        severity: 'nn',
      },
      {
        display: 'Annual opex cannot exceed $40,000 in the first cycle',
        full: 'Annual operating expenditure cannot exceed $40,000 in the first planning cycle',
        severity: 'hc',
      },
      {
        display: 'Must reach financial self-sufficiency within 5 years',
        full: 'Project must be financially self-sustaining within 5 years -- no ongoing subsidy from off-farm income',
        severity: 'nn',
      },
    ],
  },
  {
    id: 'ecological',
    name: 'Ecological & Ethical',
    Icon: Leaf,
    chips: [
      {
        display: 'No synthetic herbicides, pesticides, or fertilisers -- organic methods only',
        full: 'No synthetic herbicides, pesticides, or fertilisers -- certified organic methods only',
        severity: 'nn',
      },
      {
        display: 'Native vegetation remnants retained and fenced before any other works',
        full: 'Native vegetation remnants must be retained and fenced before any other works begin',
        severity: 'nn',
      },
      {
        display: 'No monocultures exceeding 0.5ha -- polyculture required throughout',
        full: 'No monoculture plantings exceeding 0.5ha -- polyculture and diversity required in all planted areas',
        severity: 'hc',
      },
    ],
  },
  {
    id: 'personal',
    name: 'Personal & Household',
    Icon: Heart,
    chips: [
      {
        display: 'Family home and garden remain private -- no visitor or enterprise access',
        full: 'Family home and garden must remain private and separate from any farm enterprise or visitor access',
        severity: 'nn',
      },
      {
        display: 'Primary steward cannot undertake sustained heavy lifting',
        full: 'Primary steward has a physical limitation that prevents sustained heavy lifting -- all tasks must accommodate this',
        severity: 'hc',
      },
      {
        display: 'Safety-critical infrastructure must be child-proofed before commissioning',
        full: 'School-age children on site -- safety-critical infrastructure must be child-proofed before commissioning',
        severity: 'nn',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConstraintsCaptureProps {
  value: FormValue;
  onChange: (next: FormValue) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConstraintsCapture({
  value,
  onChange,
}: ConstraintsCaptureProps): JSX.Element {
  // UI-only state: active tab + expanded category ids.
  const [activeTab, setActiveTab] = useState<'suggest' | 'register'>('suggest');
  // Physical & Site starts expanded; all others collapsed.
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(['physical']),
  );
  // Which register items have their note row expanded (by constraint.id).
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(
    () => new Set(),
  );

  // Derive model every render (CONTROLLED -- no model state).
  const model = decodeConstraints(value);
  const emit = (next: ConstraintsModel) => onChange(encodeConstraints(next));

  // Badge counts for the Register tab label.
  const nnCount = model.constraints.filter(
    (c) => c.severity === 'nn' && c.text.trim() !== '',
  ).length;
  const hcCount = model.constraints.filter(
    (c) => c.severity === 'hc' && c.text.trim() !== '',
  ).length;

  // ---- Suggest tab helpers ----

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** Memoized set of already-added constraint texts for O(1) chip-added lookup. */
  const addedTexts = useMemo(
    () => new Set(model.constraints.map((c) => c.text)),
    [model.constraints],
  );

  /** True if the chip's FULL text is already present in the register. */
  const isChipAdded = (full: string): boolean => addedTexts.has(full);

  const addFromChip = (chip: SuggestionChip) => {
    if (isChipAdded(chip.full)) return;
    emit({
      constraints: [
        ...model.constraints,
        { id: makeConstraintId(), text: chip.full, severity: chip.severity, note: '' },
      ],
    });
    setActiveTab('register');
  };

  const addBlankConstraint = () => {
    emit({
      constraints: [
        ...model.constraints,
        { id: makeConstraintId(), text: '', severity: 'hc', note: '' },
      ],
    });
    setActiveTab('register');
  };

  // ---- Register tab helpers ----

  const updateConstraint = (idx: number, patch: Partial<Constraint>) => {
    emit({
      constraints: model.constraints.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeConstraint = (idx: number) => {
    const removed = model.constraints[idx];
    emit({
      constraints: model.constraints.filter((_, i) => i !== idx),
    });
    // Remove the id from expanded notes (no re-indexing needed -- id-keyed).
    if (removed) {
      setExpandedNotes((prev) => {
        const next = new Set(prev);
        next.delete(removed.id);
        return next;
      });
    }
  };

  const toggleNote = (constraintId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(constraintId)) {
        next.delete(constraintId);
      } else {
        next.add(constraintId);
      }
      return next;
    });
  };

  const toggleSeverity = (idx: number) => {
    const c = model.constraints[idx];
    if (!c) return;
    updateConstraint(idx, { severity: c.severity === 'nn' ? 'hc' : 'nn' });
  };

  const isEmpty = model.constraints.length === 0;

  return (
    <div className={css.root}>
      {/* ---- Tab bar ---- */}
      <div className={css.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'suggest'}
          className={css.tab}
          data-active={activeTab === 'suggest' ? 'true' : 'false'}
          onClick={() => setActiveTab('suggest')}
        >
          Suggest
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'register'}
          className={css.tab}
          data-active={activeTab === 'register' ? 'true' : 'false'}
          onClick={() => setActiveTab('register')}
        >
          Register
          {nnCount > 0 ? (
            <span className={css.badgeNn} aria-label={`${nnCount} non-negotiable`}>
              {nnCount}
            </span>
          ) : null}
          {hcCount > 0 ? (
            <span className={css.badgeHc} aria-label={`${hcCount} hard constraint`}>
              {hcCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* ================================================================= */}
      {/* SUGGEST TAB                                                        */}
      {/* ================================================================= */}
      {activeTab === 'suggest' ? (
        <div className={css.tabContent}>
          <div className={css.secLbl}>Browse by category -- select to add</div>

          {CATEGORIES.map((cat, catIdx) => {
            const open = expandedCats.has(cat.id);
            const { Icon } = cat;
            return (
              <div key={cat.id} className={css.catSection}>
                {catIdx > 0 ? <div className={css.catDivider} /> : null}
                <button
                  type="button"
                  className={css.catHeader}
                  aria-expanded={open}
                  onClick={() => toggleCat(cat.id)}
                >
                  <span className={css.catIcon} aria-hidden="true">
                    <Icon size={13} />
                  </span>
                  <span className={css.catName}>{cat.name}</span>
                  <ChevronDown
                    size={12}
                    className={css.catArrow}
                    data-open={open ? 'true' : 'false'}
                    aria-hidden="true"
                  />
                </button>

                {open ? (
                  <div className={css.catChips}>
                    {cat.chips.map((chip) => {
                      const added = isChipAdded(chip.full);
                      return (
                        <button
                          key={chip.full}
                          type="button"
                          className={css.sChip}
                          data-added={added ? 'true' : 'false'}
                          disabled={added}
                          aria-disabled={added}
                          onClick={() => addFromChip(chip)}
                        >
                          <span className={css.sChipPlus} aria-hidden="true">
                            {added ? <Check size={12} /> : <Plus size={12} />}
                          </span>
                          <span className={css.sChipBody}>
                            <span className={css.sChipText}>{chip.display}</span>
                            <span className={css.sChipTag}>
                              <span className={css.tagCat}>{cat.name}</span>
                              <span className={css.tagDot} aria-hidden="true" />
                              <span className={css.tagSev}>
                                {chip.severity === 'nn'
                                  ? 'Non-negotiable'
                                  : 'Hard constraint'}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          <button
            type="button"
            className={css.addRowBtn}
            onClick={addBlankConstraint}
          >
            <Plus size={12} aria-hidden="true" />
            Write your own constraint
          </button>
        </div>
      ) : null}

      {/* ================================================================= */}
      {/* REGISTER TAB                                                       */}
      {/* ================================================================= */}
      {activeTab === 'register' ? (
        <div className={css.tabContent}>
          {/* Header + severity legend */}
          <div className={css.registerHeader}>
            <span className={css.secLbl}>Constraint register</span>
            <div className={css.sevLegend}>
              <span className={css.sevItem}>
                <span className={css.sevDotNn} aria-hidden="true" />
                Non-negotiable
              </span>
              <span className={css.sevItem}>
                <span className={css.sevDotHc} aria-hidden="true" />
                Hard constraint
              </span>
            </div>
          </div>

          {/* Register list */}
          {isEmpty ? (
            <div className={css.emptyRegister} data-testid="empty-register">
              No constraints recorded yet.
              <br />
              Add from suggestions or write your own.
            </div>
          ) : (
            <div className={css.registerList}>
              {model.constraints.map((constraint, idx) => {
                const noteOpen = expandedNotes.has(constraint.id);
                const severityLabel =
                  constraint.severity === 'nn' ? 'Non-neg.' : 'Hard';
                return (
                  <div
                    key={constraint.id}
                    className={css.cItem}
                    data-severity={constraint.severity}
                    data-testid="constraint-item"
                  >
                    {/* Item head (click toggles note row) */}
                    <div
                      className={css.cItemHead}
                      onClick={() => toggleNote(constraint.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleNote(constraint.id);
                        }
                      }}
                      aria-expanded={noteOpen}
                    >
                      <button
                        type="button"
                        className={css.cSeverityPill}
                        data-severity={constraint.severity}
                        title="Click to toggle severity"
                        aria-label={`Severity: ${severityLabel} -- click to toggle`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSeverity(idx);
                        }}
                      >
                        {severityLabel}
                      </button>
                      <input
                        className={css.cItemText}
                        type="text"
                        value={constraint.text}
                        placeholder="Describe the constraint..."
                        aria-label={`Constraint ${idx + 1} text`}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateConstraint(idx, { text: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        className={css.cItemDel}
                        aria-label={`Remove constraint ${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeConstraint(idx);
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Note row */}
                    <div
                      className={css.cItemNote}
                      data-open={noteOpen ? 'true' : 'false'}
                    >
                      <textarea
                        className={css.cNoteTa}
                        value={constraint.note}
                        placeholder="Add a note -- source, evidence, or context..."
                        aria-label={`Note for constraint ${idx + 1}`}
                        onChange={(e) =>
                          updateConstraint(idx, { note: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gate warning -- lives here (not in panel footer) because feedsLabel is null. */}
          <div className={css.gateWarning}>
            <AlertTriangle size={13} className={css.gwIcon} aria-hidden="true" />
            <div className={css.gwText}>
              Non-negotiables gate Act handoff packages. Any Act task that would
              violate a non-negotiable cannot be approved for execution.
            </div>
          </div>

          {/* Feeds info -- lives here for the same reason (see divergence note above). */}
          <div className={css.feedsBlock}>
            <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
            <div className={css.feedsTxt}>
              This register feeds{' '}
              <strong>all Act handoff packages</strong>. Non-negotiables are
              checked at every Plan approval gate in Tiers 3-6.
            </div>
          </div>

          <button
            type="button"
            className={css.addRowBtn}
            onClick={addBlankConstraint}
          >
            <Plus size={12} aria-hidden="true" />
            Add another constraint
          </button>
        </div>
      ) : null}
    </div>
  );
}
