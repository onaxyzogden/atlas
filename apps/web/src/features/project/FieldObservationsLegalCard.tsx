/**
 * §3 FieldObservationsLegalCard — read-back surface for intake free-text.
 *
 * The intake wizard captures `fieldObservations` (steward walk-through
 * notes) and `legalDescription` (county-recorder language) on Step 4
 * (StepNotes) and persists them to `project.metadata`. Until now there
 * has been no read-back of those fields anywhere in the project view —
 * a steward could enter detailed notes and the only place they'd see
 * them again was the wizard itself, on edit.
 *
 * This card surfaces both fields plus their nearest supporting metadata
 * (parcelId, county, provinceState, restrictionsCovenants) so the
 * steward can confirm what was recorded and judge whether more detail
 * is needed before site work begins. Per-field richness signals run
 * over the saved text:
 *
 *   - Field observations: word count + freshness category (sparse /
 *     outline / detailed)
 *   - Legal description: word count + structural-cue detection
 *     (Lot/Block, Township/Range/Section, Concession, Plan #,
 *     metes-and-bounds verbs) + parcelId cross-reference (does the
 *     legal text mention the recorded parcel id?)
 *
 * Aggregate band: Documented (both filled, both rich) / Outlined
 * (both filled but at least one sparse) / Sparse (one filled) / Empty.
 *
 * Pure presentation — reads `project` only. No shared math, no entity
 * writes, no map overlays.
 *
 * Spec: §3 field-observations-legal (featureManifest line 89).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './FieldObservationsLegalCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const FIELD_OBS_DETAILED_WORDS = 60;
const FIELD_OBS_OUTLINE_WORDS = 15;
const LEGAL_DETAILED_WORDS = 40;
const LEGAL_OUTLINE_WORDS = 10;
const PREVIEW_CHAR_CAP = 320;

/** Structural cues that suggest a real legal description rather than a
 *  free-text approximation. Hits are reported but not weighted heavily —
 *  legal language varies by jurisdiction. */
const LEGAL_CUES: { label: string; pattern: RegExp }[] = [
  { label: 'Lot / Block', pattern: /\b(lot|block)\s*(no\.?\s*)?\d+/i },
  { label: 'Township / Range / Section', pattern: /\b(township|range|section|sec\.|twp\.|rge\.)\b/i },
  { label: 'Concession', pattern: /\bconcession\b/i },
  { label: 'Plan / Parcel #', pattern: /\b(plan|parcel|pin)\s*(no\.?|#)?\s*[a-z0-9-]+/i },
  { label: 'Metes & bounds', pattern: /\b(thence|north[- ]?\d|south[- ]?\d|east[- ]?\d|west[- ]?\d|degrees?|°)/i },
  { label: 'Acres / hectares', pattern: /\b\d+(\.\d+)?\s*(acres?|hectares?|ha)\b/i },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '\u2026';
}

type Tier = 'detailed' | 'outline' | 'sparse' | 'empty';

function fieldObsTier(text: string): Tier {
  const w = wordCount(text);
  if (w === 0) return 'empty';
  if (w >= FIELD_OBS_DETAILED_WORDS) return 'detailed';
  if (w >= FIELD_OBS_OUTLINE_WORDS) return 'outline';
  return 'sparse';
}

function legalTier(text: string): Tier {
  const w = wordCount(text);
  if (w === 0) return 'empty';
  if (w >= LEGAL_DETAILED_WORDS) return 'detailed';
  if (w >= LEGAL_OUTLINE_WORDS) return 'outline';
  return 'sparse';
}

const TIER_LABEL: Record<Tier, string> = {
  detailed: 'Detailed',
  outline: 'Outline',
  sparse: 'Sparse',
  empty: 'Empty',
};

const TIER_CLS: Record<Tier, string> = {
  detailed: css.tierDetailed ?? '',
  outline: css.tierOutline ?? '',
  sparse: css.tierSparse ?? '',
  empty: css.tierEmpty ?? '',
};

/* ── Component ───────────────────────────────────────────────────── */

type Band = 'documented' | 'outlined' | 'sparse' | 'empty';

const BAND_CFG: Record<Band, { label: string; cls: string; blurb: string }> = {
  documented: { label: 'Documented', cls: css.bandDocumented ?? '', blurb: 'Both narrative and legal text recorded with detail' },
  outlined:   { label: 'Outlined',   cls: css.bandOutlined ?? '',   blurb: 'Both fields filled — at least one is sparse' },
  sparse:     { label: 'Sparse',     cls: css.bandSparse ?? '',     blurb: 'Only one of observations / legal recorded' },
  empty:      { label: 'Not recorded', cls: css.bandEmpty ?? '',    blurb: 'Neither field captured at intake' },
};

export default function FieldObservationsLegalCard({ project }: Props) {
  const md = project.metadata ?? {};
  const fieldObs = (md.fieldObservations ?? '').trim();
  const legal = (md.legalDescription ?? '').trim();
  const restrictions = (md.restrictionsCovenants ?? '').trim();
  const parcelId = (project.parcelId ?? '').trim();
  const county = (md.county ?? '').trim();
  const provinceState = (project.provinceState ?? '').trim();
  const country = (project.country ?? '').trim();

  const obsTier = fieldObsTier(fieldObs);
  const lTier = legalTier(legal);

  const band: Band = useMemo(() => {
    if (obsTier === 'empty' && lTier === 'empty') return 'empty';
    if (obsTier === 'empty' || lTier === 'empty') return 'sparse';
    if (obsTier === 'detailed' && lTier === 'detailed') return 'documented';
    return 'outlined';
  }, [obsTier, lTier]);

  const legalCueHits = useMemo(
    () => LEGAL_CUES.filter((c) => c.pattern.test(legal)).map((c) => c.label),
    [legal],
  );

  const parcelXref = useMemo(() => {
    if (!parcelId || !legal) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[\s-_]/g, '');
    return norm(legal).includes(norm(parcelId));
  }, [parcelId, legal]);

  const cfg = BAND_CFG[band];

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Field observations &amp; legal description
            <span className={css.badge}>INTAKE</span>
          </h3>
          <p className={css.cardHint}>
            Read-back of the two free-text intake fields captured at project
            creation, with structural-cue detection on the legal text and a
            cross-reference against the recorded parcel id.
          </p>
        </div>
        <div className={`${css.bandPill} ${cfg.cls}`}>
          <span className={css.bandLabel}>{cfg.label}</span>
          <span className={css.bandBlurb}>{cfg.blurb}</span>
        </div>
      </div>

      {/* Field observations */}
      <section className={css.field}>
        <div className={css.fieldHead}>
          <span className={css.fieldLabel}>Field observations</span>
          <span className={`${css.tierPill} ${TIER_CLS[obsTier]}`}>{TIER_LABEL[obsTier]}</span>
          <span className={css.fieldMeta}>{wordCount(fieldObs)} words</span>
        </div>
        {fieldObs ? (
          <p className={css.fieldText}>{clip(fieldObs, PREVIEW_CHAR_CAP)}</p>
        ) : (
          <p className={css.fieldEmpty}>
            No walk-through notes recorded. Add observations on the intake
            wizard&rsquo;s Notes step (drainage cues, exposure, existing
            vegetation, neighbour activity, off-site noise).
          </p>
        )}
      </section>

      {/* Legal description */}
      <section className={css.field}>
        <div className={css.fieldHead}>
          <span className={css.fieldLabel}>Legal description</span>
          <span className={`${css.tierPill} ${TIER_CLS[lTier]}`}>{TIER_LABEL[lTier]}</span>
          <span className={css.fieldMeta}>{wordCount(legal)} words</span>
        </div>
        {legal ? (
          <>
            <p className={css.fieldText}>{clip(legal, PREVIEW_CHAR_CAP)}</p>
            <div className={css.cueRow}>
              <span className={css.cueLabel}>Structural cues:</span>
              {legalCueHits.length > 0 ? (
                legalCueHits.map((c) => (
                  <span key={c} className={css.cueChip}>{c}</span>
                ))
              ) : (
                <span className={css.cueDim}>none detected {'\u2014'} text may be a free-form summary</span>
              )}
            </div>
            <div className={css.cueRow}>
              <span className={css.cueLabel}>Parcel ID cross-ref:</span>
              {parcelId ? (
                parcelXref ? (
                  <span className={`${css.cueChip} ${css.cueChipPass}`}>
                    legal text mentions parcel id <code>{parcelId}</code>
                  </span>
                ) : (
                  <span className={`${css.cueChip} ${css.cueChipWarn}`}>
                    parcel id <code>{parcelId}</code> not found in legal text
                  </span>
                )
              ) : (
                <span className={css.cueDim}>no parcel id recorded on the project</span>
              )}
            </div>
          </>
        ) : (
          <p className={css.fieldEmpty}>
            No legal description recorded. Paste the county-recorder language
            (lot / block, township / range / section, concession, plan number,
            or metes-and-bounds) on the intake wizard&rsquo;s Notes step.
          </p>
        )}
      </section>

      {/* Supporting metadata */}
      <section className={css.support}>
        <div className={css.supportHead}>Supporting jurisdiction</div>
        <div className={css.supportGrid}>
          <SupportCell label="Parcel ID" value={parcelId || null} />
          <SupportCell label="County" value={county || null} />
          <SupportCell label="Province / State" value={provinceState || null} />
          <SupportCell label="Country" value={country || null} />
          <SupportCell
            label="Restrictions / covenants"
            value={restrictions ? `${wordCount(restrictions)} words recorded` : null}
          />
        </div>
      </section>

      <p className={css.footnote}>
        Spec ref: §3 field-observations-legal. Tier thresholds: field
        observations {'\u2014 '}<em>{FIELD_OBS_DETAILED_WORDS}+ words detailed</em>,
        {' '}<em>{FIELD_OBS_OUTLINE_WORDS}+ outline</em>; legal description
        {' \u2014 '}<em>{LEGAL_DETAILED_WORDS}+ detailed</em>,
        {' '}<em>{LEGAL_OUTLINE_WORDS}+ outline</em>. Structural cues are a
        heuristic, not a validator.
      </p>
    </div>
  );
}

function SupportCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={css.supportCell}>
      <span className={css.supportLabel}>{label}</span>
      {value ? (
        <span className={css.supportValue}>{value}</span>
      ) : (
        <span className={css.supportMissing}>not recorded</span>
      )}
    </div>
  );
}
