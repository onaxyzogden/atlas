/**
 * AdaptiveManagementCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s7-adaptive-management ("A sound adaptive management protocol",
 * ref EV-S7.9, 5 checklist items c1..c5). Ported from
 * olos_adaptive_management_act.html right-hand panels p1..p5. Catalogue item
 * order == mockup panel order:
 *
 *   c1 -> review         (mockup p1: annual review timing/duration/facilitator + agenda)
 *   c2 -> triggers       (mockup p2: 4 decision-trigger cards + response selects)
 *   c3 -> escalation     (mockup p3: 2 escalation tiers + record-filed select)
 *   c4 -> documentation  (mockup p4: what-gets-documented list + 3 selects)
 *   c5 -> fiveyear       (mockup p5: 5-year review structure + scope list)
 *
 * Structure mirrors PropagationInfraCapture (the canonical 5-item multi-mode
 * capture): an `adaptiveManagementModeFor(itemId)` mapper plus a single component
 * that renders ONE mode body. The third-column host (DecisionWorkingPanel) owns
 * the eyebrow / title / hint / Record-Defer chrome; this capture renders ONLY the
 * scrollable mode body (the mockup's `.rb` inner content).
 *
 * ADVISORY / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for persisted values. NO projectId prop; writes NOTHING to any
 * store. All five modes are ADVISORY (no Stratum gate). Each validity arm checks
 * only the capture's own FormValue (no sibling reads).
 *
 * decode is TOTAL / defensive: never throws, never fabricates seed/demo data. The
 * mockup's default-on toggles (first 6 agenda / first 5 doc / first 5 scope items)
 * are UI demo defaults ONLY -- decode never seeds them; an empty FormValue yields
 * all toggles off and all selects at the placeholder. Selection fields are stored
 * as RAW STRINGS constrained to their option list on decode; toggle-lists as
 * string[] subsets; per-row selects as positional fixed-length arrays.
 *
 * ASCII-only: middot -> " / "; em-dash -> " -- ". Apostrophes use double-quoted JS
 * strings. The capital-reserve trigger and financial response selects (p2) are
 * monitoring thresholds, NOT advance-sale instruments -- fiqh-clear, transcribed
 * verbatim with no finance-engineering framing introduced. All option / agenda /
 * threshold strings are fidelity-critical verbatim constants -- never reword. All
 * icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, Leaf, Users } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import { Dropdown, SectionEyebrow } from './captures/controls/index.js';
import css from './AdaptiveManagementCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type AdaptiveManagementMode =
  | 'review' // c1
  | 'triggers' // c2
  | 'escalation' // c3
  | 'documentation' // c4
  | 'fiveyear'; // c5

export const ADAPTIVE_MANAGEMENT_PREFIX = 'ev-s7-adaptive-management';
const PREFIX_DASH = ADAPTIVE_MANAGEMENT_PREFIX + '-';

export function adaptiveManagementModeFor(
  itemId: string,
): AdaptiveManagementMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'review';
    case 'c2':
      return 'triggers';
    case 'c3':
      return 'escalation';
    case 'c4':
      return 'documentation';
    case 'c5':
      return 'fiveyear';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword; ASCII-normalized per task spec)
// ---------------------------------------------------------------------------

interface SelectRowDef {
  label: string;
  options: readonly string[];
}

interface ToggleItemDef {
  name: string;
  desc: string;
}

// -- review (c1) -- annual review structure selects + agenda (mockup p1) --
export const REVIEW_TIMING_OPTIONS: readonly string[] = [
  "February -- after data year closes, before growing season",
  "January",
  "September -- after growing season",
];
export const REVIEW_DURATION_OPTIONS: readonly string[] = [
  "Full day (8 hours) -- all founding members",
  "Half day (4 hours)",
  "Two sessions -- data review + decision session",
];
export const REVIEW_FACILITATOR_OPTIONS: readonly string[] = [
  "SM -- consensus facilitation training",
  "External facilitator -- recommended for Year 3+ when community is larger",
  "Rotating founding member",
];

export interface AgendaItemDef extends ToggleItemDef {
  source: string;
}
export const AGENDA_ITEMS: readonly AgendaItemDef[] = [
  {
    name: "Soil health data -- organic matter, compaction, biology",
    desc: "Previous year's Observe data compared against Year 1 baseline",
    source: "Land data",
  },
  {
    name: "Water system performance -- yield, quality, seasonal variation",
    desc: "Spring flow trend, iron levels, storage sufficiency",
    source: "Land data",
  },
  {
    name: "Food production vs. target -- communal harvest outcomes",
    desc: "Actual yield vs. plan, variety performance, distribution effectiveness",
    source: "Land data",
  },
  {
    name: "Community health indicators -- social cohesion, conflict frequency, participation",
    desc: "Previous year's community health monitoring data reviewed",
    source: "Social data",
  },
  {
    name: "Financial performance -- levy compliance, fund levels, capital reserve progress",
    desc: "Previous year's financial summary vs. plan",
    source: "Financial data",
  },
  {
    name: "Decision triggers review -- any triggers fired, responses taken",
    desc: "Were any triggers activated? How were responses handled? Did the protocol work?",
    source: "Protocol review",
  },
  {
    name: "Planning compliance status -- all conditions current",
    desc: "External relations annual review feeds into the management review",
    source: "Compliance",
  },
];

// -- triggers (c2) -- 4 decision-trigger cards (mockup p2) --
export type TriggerTone = "eco" | "soc" | "fin";
export interface TriggerDef {
  domain: string;
  tone: TriggerTone;
  name: string;
  threshold: string;
  rows: readonly SelectRowDef[];
}
export const TRIGGERS: readonly TriggerDef[] = [
  {
    domain: "Ecological",
    tone: "eco",
    name: "Soil health decline",
    threshold:
      "Trigger: Organic matter falls below Year 1 baseline by >20% in any zone, or soil compaction test fails in productive zone",
    rows: [
      {
        label: "Required response",
        options: [
          "Soil rehabilitation plan -- within 30 days of annual review",
          "Immediate -- any time trigger fires",
        ],
      },
      {
        label: "Plan change required?",
        options: [
          "Yes -- affected zone management amended",
          "Response documented, plan unchanged",
        ],
      },
    ],
  },
  {
    domain: "Ecological",
    tone: "eco",
    name: "Water yield sustained decline",
    threshold:
      "Trigger: Spring flow below 1,900 L/day for 3 consecutive weekly measurements",
    rows: [
      {
        label: "Required response",
        options: [
          "Water cascade Tier 3 activated + steward investigates within 48 hours",
          "Community meeting within 5 days",
        ],
      },
    ],
  },
  {
    domain: "Social",
    tone: "soc",
    name: "Community health indicator deterioration",
    threshold:
      'Trigger: 3 or more health indicators in "attention" range at annual review, or any indicator in "critical" range',
    rows: [
      {
        label: "Required response",
        options: [
          "External facilitation engaged -- within 30 days",
          "Internal review meeting within 2 weeks",
        ],
      },
      {
        label: "Confidentiality",
        options: [
          "Founding member only -- no external disclosure",
          "Full community",
        ],
      },
    ],
  },
  {
    domain: "Financial",
    tone: "fin",
    name: "Capital reserve below minimum threshold",
    threshold:
      "Trigger: Capital reserve falls below 50% of target without approved draw reason",
    rows: [
      {
        label: "Required response",
        options: [
          "Emergency levy increase -- consent of all households required",
          "Reduce non-essential expenditure -- community vote",
        ],
      },
    ],
  },
];
const TRIGGER_ROWS: readonly SelectRowDef[] = TRIGGERS.flatMap((t) => t.rows);

// -- escalation (c3) -- 2 escalation tiers + record-filed select (mockup p3) --
export type EscTone = "eco" | "soc";
export interface EscTierDef {
  title: string;
  triggerTxt: string;
  tone: EscTone;
  rows: readonly SelectRowDef[];
}
export const ESC_TIERS: readonly EscTierDef[] = [
  {
    title: "Unexpected ecological event",
    triggerTxt: "Pest outbreak, flood, disease, fire",
    tone: "eco",
    rows: [
      {
        label: "First response",
        options: [
          "Steward for affected system acts immediately -- reports within 24h",
          "Community meeting required before action",
        ],
      },
      {
        label: "Emergency spend authority",
        options: [
          "Up to $2,000 -- steward alone; over $2,000 -- any 2 founding members",
          "Treasurer approval required for all",
        ],
      },
      {
        label: "Expert consultation",
        options: [
          "Contact -- within 48 hours of major event",
          "Community votes to engage expert",
        ],
      },
      {
        label: "Plan amendment required?",
        options: [
          "Yes -- if event reveals systemic vulnerability",
          "Only if recurrence is likely",
        ],
      },
    ],
  },
  {
    title: "Unexpected community event",
    triggerTxt: "Serious conflict, health emergency, security",
    tone: "soc",
    rows: [
      {
        label: "Serious conflict first response",
        options: [
          "SM facilitates -- external mediator within 2 weeks if unresolved",
          "Community meeting immediately",
        ],
      },
      {
        label: "Health or safety emergency",
        options: [
          "Emergency services first -- notify all households immediately",
          "Spokesperson coordinates response",
        ],
      },
      {
        label: "Community-wide notification",
        options: [
          "All founding households within 24 hours of significant event",
          "Spokesperson discretion",
        ],
      },
    ],
  },
];
const ESC_ROWS: readonly SelectRowDef[] = ESC_TIERS.flatMap((t) => t.rows);
export const ESC_FILED_OPTIONS: readonly string[] = [
  "OLOS -- incident log + response record",
  "Community shared drive",
];

// -- documentation (c4) -- what-gets-documented list + 3 selects (mockup p4) --
export const DOC_ITEMS: readonly ToggleItemDef[] = [
  {
    name: "What changed -- precise description of the amendment",
    desc: "Previous state and new state, both recorded explicitly",
  },
  {
    name: "Why it changed -- the data or event that triggered the change",
    desc: "Observation data, trigger fired, or community decision",
  },
  {
    name: "Who agreed -- decision record with names",
    desc: "Community consent, spokesperson decision, or steward response (within authority)",
  },
  {
    name: "Date of change and date of review (when effectiveness will be assessed)",
    desc: "Every plan change has a review date -- it is not open-ended",
  },
  {
    name: "Ecological or community data that prompted the change",
    desc: "The OLOS Observe record or community health data that was cited",
  },
  {
    name: "Dissenting views -- any household that did not agree",
    desc: "Recorded with dignity -- dissent is part of the record, not hidden from it",
  },
];
export const DOC_FILED_OPTIONS: readonly string[] = [
  "OLOS -- management plan amendment log",
  "Community shared drive -- plan change register",
  "Both",
];
export const DOC_EFFECTIVE_OPTIONS: readonly string[] = [
  "Date of community agreement -- immediate",
  "Next growing season / operating cycle",
];
export const DOC_NOTIFIED_OPTIONS: readonly string[] = [
  "Within 5 days of plan change -- written summary",
  "At next community check-in",
];

// -- fiveyear (c5) -- 5-year review structure + scope list (mockup p5) --
export const FIVE_STRUCTURE: readonly SelectRowDef[] = [
  {
    label: "When",
    options: [
      "Year 5 -- early in the year, before growing season",
      "Year 5 anniversary of founding",
    ],
  },
  {
    label: "Duration",
    options: [
      "2-day residential retreat -- all founding + full members",
      "Full-day session",
      "Multiple sessions over 2 weeks",
    ],
  },
  {
    label: "Facilitator",
    options: [
      "External facilitator -- recommended for 5-year depth",
      "SM (internal)",
      "Community vote on facilitator",
    ],
  },
  {
    label: "Data reviewed",
    options: [
      "All 5 years of Observe streams + annual review outputs",
      "Year 5 data only",
    ],
  },
];
export const SCOPE_ITEMS: readonly ToggleItemDef[] = [
  {
    name: "Stratum 1 vision -- are we still building this?",
    desc: "Read the original vision statement. Does the community still hold this intent? Has it evolved?",
  },
  {
    name: "Ecological outcome targets -- actual vs. projected",
    desc: "Soil health, water quality, biodiversity, food production -- 5-year trend against Tier 2 baseline",
  },
  {
    name: "Community health -- has communal living delivered what was expected?",
    desc: "Social cohesion, member wellbeing, quality of relationships -- honest assessment",
  },
  {
    name: "Financial sustainability -- is the model working?",
    desc: "Capital reserve progress, levy sufficiency, Phase 2 and 3 financial capacity",
  },
  {
    name: "Phase 3 readiness -- is the community ready to open?",
    desc: "Infrastructure, governance, social health -- is it right to invite new members?",
  },
  {
    name: "Exit review -- are all founding members still choosing this?",
    desc: "A formal, private reaffirmation -- or the honest recognition that circumstances have changed",
  },
];

// ---------------------------------------------------------------------------
// Models (selection fields constrained raw strings; toggle-lists string[]
// subsets; per-row selects positional fixed-length arrays)
// ---------------------------------------------------------------------------

export interface ReviewModel {
  kind: "review";
  timing: string;
  duration: string;
  facilitator: string;
  /** selected agenda-item names (subset of AGENDA_ITEMS[].name) */
  agenda: string[];
}

export interface TriggersModel {
  kind: "triggers";
  /** length === TRIGGER_ROWS.length; each constrained to its row options or "" */
  responses: string[];
}

export interface EscalationModel {
  kind: "escalation";
  /** length === ESC_ROWS.length; each constrained to its row options or "" */
  rows: string[];
  filedIn: string;
}

export interface DocumentationModel {
  kind: "documentation";
  /** selected documentation-item names (subset of DOC_ITEMS[].name) */
  documented: string[];
  filedIn: string;
  effectiveFrom: string;
  notified: string;
}

export interface FiveYearModel {
  kind: "fiveyear";
  /** length === FIVE_STRUCTURE.length; each constrained to its row options or "" */
  structure: string[];
  /** selected scope-item names (subset of SCOPE_ITEMS[].name) */
  scope: string[];
}

export type AdaptiveManagementModel =
  | ReviewModel
  | TriggersModel
  | EscalationModel
  | DocumentationModel
  | FiveYearModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === "string" ? v : "";
}

function asStrArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return typeof v === "string" && v !== "" ? [v] : [];
}

/** Positional fixed-length string[] from a possibly-short / scalar array. */
function fixedStrings(v: FormValue[string] | undefined, len: number): string[] {
  const arr = asStrArr(v);
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(arr[i] ?? "");
  return out;
}

/** Constrain a raw value to the allowed set, else "". */
function constrain(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : "";
}

/** Decode a positional per-row select array: pad to defs length, constrain each. */
function decodePositional(
  v: FormValue[string] | undefined,
  defs: readonly SelectRowDef[],
): string[] {
  const arr = fixedStrings(v, defs.length);
  return arr.map((raw, i) => constrain(raw, defs[i]?.options ?? []));
}

/** Decode a toggle-list: keep only names that exist in the item set. */
function decodeToggle(
  v: FormValue[string] | undefined,
  items: readonly ToggleItemDef[],
): string[] {
  const names = items.map((it) => it.name);
  return asStrArr(v).filter((n) => names.includes(n));
}

// ---------------------------------------------------------------------------
// decode: FormValue -> AdaptiveManagementModel (TOTAL / defensive; never throws,
// never fabricates seed/demo defaults)
// ---------------------------------------------------------------------------

export function decodeAdaptiveManagement(
  mode: AdaptiveManagementMode,
  value: FormValue,
): AdaptiveManagementModel {
  switch (mode) {
    case "review":
      return {
        kind: "review",
        timing: constrain(asStr(value.amRevTiming), REVIEW_TIMING_OPTIONS),
        duration: constrain(asStr(value.amRevDuration), REVIEW_DURATION_OPTIONS),
        facilitator: constrain(
          asStr(value.amRevFacilitator),
          REVIEW_FACILITATOR_OPTIONS,
        ),
        agenda: decodeToggle(value.amRevAgenda, AGENDA_ITEMS),
      };
    case "triggers":
      return {
        kind: "triggers",
        responses: decodePositional(value.amTrigResponses, TRIGGER_ROWS),
      };
    case "escalation":
      return {
        kind: "escalation",
        rows: decodePositional(value.amEscRows, ESC_ROWS),
        filedIn: constrain(asStr(value.amEscFiledIn), ESC_FILED_OPTIONS),
      };
    case "documentation":
      return {
        kind: "documentation",
        documented: decodeToggle(value.amDocItems, DOC_ITEMS),
        filedIn: constrain(asStr(value.amDocFiledIn), DOC_FILED_OPTIONS),
        effectiveFrom: constrain(
          asStr(value.amDocEffective),
          DOC_EFFECTIVE_OPTIONS,
        ),
        notified: constrain(asStr(value.amDocNotified), DOC_NOTIFIED_OPTIONS),
      };
    case "fiveyear":
      return {
        kind: "fiveyear",
        structure: decodePositional(value.amFiveStructure, FIVE_STRUCTURE),
        scope: decodeToggle(value.amFiveScope, SCOPE_ITEMS),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown AdaptiveManagementMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: AdaptiveManagementModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeAdaptiveManagement(
  _mode: AdaptiveManagementMode,
  model: AdaptiveManagementModel,
): FormValue {
  switch (model.kind) {
    case "review":
      return {
        amRevTiming: model.timing,
        amRevDuration: model.duration,
        amRevFacilitator: model.facilitator,
        amRevAgenda: [...model.agenda],
      };
    case "triggers":
      return { amTrigResponses: [...model.responses] };
    case "escalation":
      return {
        amEscRows: [...model.rows],
        amEscFiledIn: model.filedIn,
      };
    case "documentation":
      return {
        amDocItems: [...model.documented],
        amDocFiledIn: model.filedIn,
        amDocEffective: model.effectiveFrom,
        amDocNotified: model.notified,
      };
    case "fiveyear":
      return {
        amFiveStructure: [...model.structure],
        amFiveScope: [...model.scope],
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(
        `Unknown AdaptiveManagementModel kind: ${String(_exhaustive)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only)
// ---------------------------------------------------------------------------

export function isAdaptiveManagementValid(
  mode: AdaptiveManagementMode,
  value: FormValue,
): boolean {
  switch (mode) {
    case "review": {
      const m = decodeAdaptiveManagement("review", value) as ReviewModel;
      return m.agenda.length >= 1;
    }
    case "triggers": {
      const m = decodeAdaptiveManagement("triggers", value) as TriggersModel;
      return m.responses.some((r) => r !== "");
    }
    case "escalation": {
      const m = decodeAdaptiveManagement("escalation", value) as EscalationModel;
      return m.rows.some((r) => r !== "") || m.filedIn !== "";
    }
    case "documentation": {
      const m = decodeAdaptiveManagement(
        "documentation",
        value,
      ) as DocumentationModel;
      return m.documented.length >= 1;
    }
    case "fiveyear": {
      const m = decodeAdaptiveManagement("fiveyear", value) as FiveYearModel;
      return m.scope.length >= 1;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown AdaptiveManagementMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseAdaptiveManagement(
  mode: AdaptiveManagementMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
): string {
  void siblingValues;
  switch (mode) {
    case "review": {
      const m = decodeAdaptiveManagement("review", value) as ReviewModel;
      return `${m.agenda.length} of ${AGENDA_ITEMS.length} agenda items selected`;
    }
    case "triggers": {
      const m = decodeAdaptiveManagement("triggers", value) as TriggersModel;
      const set = m.responses.filter((r) => r !== "").length;
      return `${set} of ${TRIGGER_ROWS.length} trigger responses set`;
    }
    case "escalation": {
      const m = decodeAdaptiveManagement("escalation", value) as EscalationModel;
      const set = m.rows.filter((r) => r !== "").length + (m.filedIn !== "" ? 1 : 0);
      return `${set} of ${ESC_ROWS.length + 1} escalation responses set`;
    }
    case "documentation": {
      const m = decodeAdaptiveManagement(
        "documentation",
        value,
      ) as DocumentationModel;
      return `${m.documented.length} of ${DOC_ITEMS.length} documentation items selected`;
    }
    case "fiveyear": {
      const m = decodeAdaptiveManagement("fiveyear", value) as FiveYearModel;
      return `${m.scope.length} of ${SCOPE_ITEMS.length} review scope items selected`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown AdaptiveManagementMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (P1..P5)
// ===========================================================================

export interface AdaptiveManagementCaptureProps {
  mode: AdaptiveManagementMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s7-adaptive-management-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function AdaptiveManagementCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: AdaptiveManagementCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- P1: review -----------------------------------------------------------
  if (mode === "review") {
    const model = decodeAdaptiveManagement("review", value) as ReviewModel;
    const set = (patch: Partial<ReviewModel>): void =>
      onChange(
        encodeAdaptiveManagement("review", { ...model, ...patch }),
      );
    const toggleAgenda = (name: string): void => {
      const agenda = model.agenda.includes(name)
        ? model.agenda.filter((a) => a !== name)
        : [...model.agenda, name];
      set({ agenda });
    };
    return (
      <div className={css.root} data-am-mode="review">
        <div className={css.rowGroup}>
          <SelectRow
            label="Annual review timing"
            options={REVIEW_TIMING_OPTIONS}
            value={model.timing}
            onChange={(v) => set({ timing: v })}
          />
          <SelectRow
            label="Review duration"
            options={REVIEW_DURATION_OPTIONS}
            value={model.duration}
            onChange={(v) => set({ duration: v })}
          />
          <SelectRow
            label="Facilitator"
            options={REVIEW_FACILITATOR_OPTIONS}
            value={model.facilitator}
            onChange={(v) => set({ facilitator: v })}
          />
        </div>

        <div>
          <SectionEyebrow>
            Review agenda items{" "}
            <span className={css.hintInline}>(tap to include)</span>
          </SectionEyebrow>
          {AGENDA_ITEMS.map((item) => (
            <ToggleRow
              key={item.name}
              tone="teal"
              on={model.agenda.includes(item.name)}
              name={item.name}
              desc={item.desc}
              source={item.source}
              onToggle={() => toggleAgenda(item.name)}
            />
          ))}
        </div>

        <FeedsNote>
          Annual review generates the{" "}
          <strong>management plan update record</strong> -- if any trigger is
          activated at the review, it feeds the{" "}
          <strong>decision trigger response process</strong> (decision 2). Review
          output is filed in OLOS.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: triggers ---------------------------------------------------------
  if (mode === "triggers") {
    const model = decodeAdaptiveManagement("triggers", value) as TriggersModel;
    const setResponse = (i: number, v: string): void => {
      const responses = model.responses.slice();
      responses[i] = v;
      onChange(
        encodeAdaptiveManagement("triggers", { kind: "triggers", responses }),
      );
    };
    let rowOffset = 0;
    return (
      <div className={css.root} data-am-mode="triggers">
        <div>
          {TRIGGERS.map((trig) => {
            const base = rowOffset;
            rowOffset += trig.rows.length;
            return (
              <div
                key={trig.name}
                className={css.triggerItem}
                data-tone={trig.tone}
              >
                <div className={css.tiHead}>
                  <span className={css.tiDomain} data-tone={trig.tone}>
                    {trig.domain}
                  </span>
                  <span className={css.tiName}>{trig.name}</span>
                </div>
                <div className={css.tiThreshold} data-tone={trig.tone}>
                  {trig.threshold}
                </div>
                <div className={css.tiRows}>
                  {trig.rows.map((row, j) => {
                    const idx = base + j;
                    return (
                      <div key={row.label} className={css.tiRow}>
                        <span className={css.tiLbl}>{row.label}</span>
                        <Dropdown
                          options={row.options}
                          value={model.responses[idx] ?? ""}
                          onChange={(v) => setResponse(idx, v)}
                          ariaLabel={`${trig.name} -- ${row.label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <FeedsNote>
          Decision triggers feed{" "}
          <strong>Observe: Community health monitoring</strong> -- each trigger
          is a named Observe stream threshold. When the threshold is crossed, the
          trigger fires automatically and creates an Act response task.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: escalation -------------------------------------------------------
  if (mode === "escalation") {
    const model = decodeAdaptiveManagement(
      "escalation",
      value,
    ) as EscalationModel;
    const setRow = (i: number, v: string): void => {
      const rows = model.rows.slice();
      rows[i] = v;
      onChange(
        encodeAdaptiveManagement("escalation", { ...model, rows }),
      );
    };
    const setFiledIn = (v: string): void =>
      onChange(encodeAdaptiveManagement("escalation", { ...model, filedIn: v }));
    let rowOffset = 0;
    return (
      <div className={css.root} data-am-mode="escalation">
        <div>
          {ESC_TIERS.map((tier) => {
            const base = rowOffset;
            rowOffset += tier.rows.length;
            const Icon = tier.tone === "eco" ? Leaf : Users;
            return (
              <div
                key={tier.title}
                className={css.escTier}
                data-tone={tier.tone}
              >
                <div className={css.etHead}>
                  <Icon size={14} className={css.etIcon} aria-hidden="true" />
                  <span className={css.etTitle}>{tier.title}</span>
                  <span className={css.etTriggerTxt}>{tier.triggerTxt}</span>
                </div>
                <div className={css.etRows}>
                  {tier.rows.map((row, j) => {
                    const idx = base + j;
                    return (
                      <div key={row.label} className={css.etRow}>
                        <span className={css.etLbl}>{row.label}</span>
                        <Dropdown
                          options={row.options}
                          value={model.rows[idx] ?? ""}
                          onChange={(v) => setRow(idx, v)}
                          ariaLabel={`${tier.title} -- ${row.label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <SelectRow
          label="Escalation record filed in"
          options={ESC_FILED_OPTIONS}
          value={model.filedIn}
          onChange={setFiledIn}
        />

        <FeedsNote>
          Escalation responses feed{" "}
          <strong>documentation requirements</strong> (decision 4) -- every
          escalated event must generate a documented record regardless of how it
          is resolved.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: documentation ----------------------------------------------------
  if (mode === "documentation") {
    const model = decodeAdaptiveManagement(
      "documentation",
      value,
    ) as DocumentationModel;
    const set = (patch: Partial<DocumentationModel>): void =>
      onChange(
        encodeAdaptiveManagement("documentation", { ...model, ...patch }),
      );
    const toggleDoc = (name: string): void => {
      const documented = model.documented.includes(name)
        ? model.documented.filter((d) => d !== name)
        : [...model.documented, name];
      set({ documented });
    };
    return (
      <div className={css.root} data-am-mode="documentation">
        <div>
          <SectionEyebrow>
            What gets documented{" "}
            <span className={css.hintInline}>(tap to include)</span>
          </SectionEyebrow>
          {DOC_ITEMS.map((item) => (
            <ToggleRow
              key={item.name}
              tone="amber"
              on={model.documented.includes(item.name)}
              name={item.name}
              desc={item.desc}
              onToggle={() => toggleDoc(item.name)}
            />
          ))}
        </div>

        <div className={css.rowGroup}>
          <SelectRow
            label="Documentation filed in"
            options={DOC_FILED_OPTIONS}
            value={model.filedIn}
            onChange={(v) => set({ filedIn: v })}
          />
          <SelectRow
            label="Change effective from"
            options={DOC_EFFECTIVE_OPTIONS}
            value={model.effectiveFrom}
            onChange={(v) => set({ effectiveFrom: v })}
          />
          <SelectRow
            label="All members notified"
            options={DOC_NOTIFIED_OPTIONS}
            value={model.notified}
            onChange={(v) => set({ notified: v })}
          />
        </div>

        <FeedsNote>
          Documentation standard feeds the{" "}
          <strong>annual review agenda</strong> (decision 1) -- the review begins
          by reading the previous year's change log, not trying to remember what
          changed.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: fiveyear ---------------------------------------------------------
  const model = decodeAdaptiveManagement("fiveyear", value) as FiveYearModel;
  const setStructure = (i: number, v: string): void => {
    const structure = model.structure.slice();
    structure[i] = v;
    onChange(encodeAdaptiveManagement("fiveyear", { ...model, structure }));
  };
  const toggleScope = (name: string): void => {
    const scope = model.scope.includes(name)
      ? model.scope.filter((s) => s !== name)
      : [...model.scope, name];
    onChange(encodeAdaptiveManagement("fiveyear", { ...model, scope }));
  };
  return (
    <div className={css.root} data-am-mode="fiveyear">
      <div className={css.fiveSection}>
        <div className={css.fysLbl}>Review structure</div>
        <div className={css.fysRows}>
          {FIVE_STRUCTURE.map((row, i) => (
            <div key={row.label} className={css.fysRow}>
              <span className={css.fysLblR}>{row.label}</span>
              <Dropdown
                options={row.options}
                value={model.structure[i] ?? ""}
                onChange={(v) => setStructure(i, v)}
                ariaLabel={`5-year review -- ${row.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionEyebrow>5-year review scope -- what it assesses</SectionEyebrow>
        {SCOPE_ITEMS.map((item) => (
          <ToggleRow
            key={item.name}
            tone="mauve"
            on={model.scope.includes(item.name)}
            name={item.name}
            desc={item.desc}
            onToggle={() => toggleScope(item.name)}
          />
        ))}
      </div>

      <FeedsNote>
        The 5-year review outputs feed a{" "}
        <strong>major management plan revision</strong> -- not an amendment, but a
        full revisit of the community's direction. The output is filed in OLOS and
        feeds Phase 3 planning.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** A labelled dropdown row (mockup `.row` -- label + native select). */
function SelectRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <div className={css.row}>
      <span className={css.rowLbl}>{label}</span>
      <Dropdown
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={label}
      />
    </div>
  );
}

/** A toggle-list row (mockup `.agenda-item` / `.doc-item` / `.outcome-item`). */
function ToggleRow({
  tone,
  on,
  name,
  desc,
  source,
  onToggle,
}: {
  tone: "teal" | "amber" | "mauve";
  on: boolean;
  name: string;
  desc: string;
  source?: string;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={css.toggleRow}
      data-tone={tone}
      data-on={on}
      aria-pressed={on}
      onClick={onToggle}
    >
      <span className={css.toggleDot} aria-hidden="true" />
      <span className={css.toggleBody}>
        <span className={css.toggleName}>{name}</span>
        <span className={css.toggleDesc}>{desc}</span>
      </span>
      {source ? <span className={css.toggleSource}>{source}</span> : null}
    </button>
  );
}

/** Feeds callout (mockup `.fb`). */
function FeedsNote({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default AdaptiveManagementCapture;
