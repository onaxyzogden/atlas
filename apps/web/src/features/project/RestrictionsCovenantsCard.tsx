/**
 * §3 RestrictionsCovenantsCard — read-back surface for the covenants
 * intake field plus the four sibling governance notes that constrain
 * what can actually be built on the parcel.
 *
 * The intake wizard (`StepNotes.tsx`) saves `metadata.restrictionsCovenants`
 * (max 2000 chars) and exposes the four root governance notes
 * (`ownerNotes`, `zoningNotes`, `accessNotes`, `waterRightsNotes`) for
 * later edit through the project editor. Together these five fields
 * carry the bulk of the legal/operational constraints on the design,
 * but no read-back groups them into a constraint summary. A steward
 * scrolling the project dashboard previously had no single place to
 * audit "what are the rules I'm designing under?"
 *
 * This card surfaces the covenants text with clause detection (HOA,
 * easement, conservation easement, deed restriction, mineral / water /
 * timber rights, right-of-way, setback / height / no-build clauses,
 * agricultural-use restrictions, density caps), pulls the four
 * governance notes into a compact grid with per-field word counts and
 * a recorded / not-recorded flag, and rolls the whole bundle into a
 * coverage band (Documented / Outlined / Sparse / Not recorded) so the
 * steward can see at a glance whether the constraint picture is
 * complete enough to start design or still needs digging.
 *
 * Pure presentation — reads `project` only. No shared math, no entity
 * writes, no map overlays. Distinct from sibling
 * `FieldObservationsLegalCard` (covers the narrative + legal-text
 * fields, not the constraint fields).
 *
 * Spec: §3 restrictions-covenants (featureManifest line 91).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './RestrictionsCovenantsCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const COV_DETAILED_WORDS = 50;
const COV_OUTLINE_WORDS = 12;
const PREVIEW_CHAR_CAP = 320;

/** Clause-detection heuristics. Hits surface as chips and contribute to
 *  the coverage band — the broader the legal picture, the more bands of
 *  design risk are accounted for. */
const CLAUSE_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'HOA / association', pattern: /\b(hoa|home\s*owners?|association)\b/i },
  { label: 'Easement', pattern: /\beasement\b/i },
  { label: 'Conservation easement', pattern: /\bconservation\s+easement\b/i },
  { label: 'Deed restriction', pattern: /\bdeed\s+restriction|restrictive\s+covenant/i },
  { label: 'Mineral rights', pattern: /\bmineral\s+rights?\b/i },
  { label: 'Water rights', pattern: /\bwater\s+rights?\b|water[- ]?taking|riparian/i },
  { label: 'Timber rights', pattern: /\btimber\s+rights?\b|logging\s+restriction/i },
  { label: 'Right-of-way', pattern: /\bright[- ]?of[- ]?way|row\b/i },
  { label: 'Setback rule', pattern: /\bsetback\b/i },
  { label: 'Height limit', pattern: /\bheight\s+(limit|restriction|cap)|max(imum)?\s+height/i },
  { label: 'No-build zone', pattern: /\bno[- ]?build|building\s+envelope|construction\s+prohibited/i },
  { label: 'Agricultural-use only', pattern: /\bagricultural[- ]use|farm\s+only|ag(\s|\.)?\s*use/i },
  { label: 'Density / lot-split cap', pattern: /\bdensity\s+(limit|cap)|severance\s+restriction|lot[- ]?split/i },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function wordCount(s: string | null | undefined): number {
  if (!s) return 0;
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '\u2026';
}

type Tier = 'detailed' | 'outline' | 'sparse' | 'empty';

function covenantTier(text: string, clauseHits: number): Tier {
  const w = wordCount(text);
  if (w === 0) return 'empty';
  // Clause hits can promote a short text up one tier (well-targeted vs verbose).
  if (w >= COV_DETAILED_WORDS || (w >= COV_OUTLINE_WORDS && clauseHits >= 3)) return 'detailed';
  if (w >= COV_OUTLINE_WORDS || clauseHits >= 2) return 'outline';
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

type Band = 'documented' | 'outlined' | 'sparse' | 'empty';

const BAND_CFG: Record<Band, { label: string; cls: string; blurb: string }> = {
  documented: { label: 'Documented', cls: css.bandDocumented ?? '', blurb: 'Covenants detailed and 3+ governance notes recorded' },
  outlined:   { label: 'Outlined',   cls: css.bandOutlined ?? '',   blurb: 'Covenants present, governance partially captured' },
  sparse:     { label: 'Sparse',     cls: css.bandSparse ?? '',     blurb: 'Few constraint fields filled — risk of design rework' },
  empty:      { label: 'Not recorded', cls: css.bandEmpty ?? '',    blurb: 'No covenants or governance notes captured at intake' },
};

interface GovernanceField {
  key: 'ownerNotes' | 'zoningNotes' | 'accessNotes' | 'waterRightsNotes';
  label: string;
  hint: string;
  text: string;
}

/* ── Component ───────────────────────────────────────────────────── */

export default function RestrictionsCovenantsCard({ project }: Props) {
  const md = project.metadata ?? {};
  const covenants = (md.restrictionsCovenants ?? '').trim();

  const governance: GovernanceField[] = useMemo(() => [
    { key: 'ownerNotes',       label: 'Owner notes',       hint: 'history / use / family context', text: (project.ownerNotes ?? '').trim() },
    { key: 'zoningNotes',      label: 'Zoning notes',      hint: 'permitted / conditional uses',   text: (project.zoningNotes ?? '').trim() },
    { key: 'accessNotes',      label: 'Access notes',      hint: 'roads / lanes / emergency exits', text: (project.accessNotes ?? '').trim() },
    { key: 'waterRightsNotes', label: 'Water rights notes', hint: 'permits / regulated areas',      text: (project.waterRightsNotes ?? '').trim() },
  ], [project.ownerNotes, project.zoningNotes, project.accessNotes, project.waterRightsNotes]);

  const clauseHits = useMemo(
    () => CLAUSE_PATTERNS.filter((c) => c.pattern.test(covenants)).map((c) => c.label),
    [covenants],
  );

  const covTier = covenantTier(covenants, clauseHits.length);
  const filledGovernance = governance.filter((g) => g.text.length > 0).length;

  const band: Band = useMemo(() => {
    if (covTier === 'empty' && filledGovernance === 0) return 'empty';
    if (covTier === 'detailed' && filledGovernance >= 3) return 'documented';
    if ((covTier === 'detailed' || covTier === 'outline') && filledGovernance >= 2) return 'outlined';
    if (covTier !== 'empty' || filledGovernance >= 1) return 'sparse';
    return 'empty';
  }, [covTier, filledGovernance]);

  const cfg = BAND_CFG[band];

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Restrictions &amp; covenants
            <span className={css.badge}>INTAKE</span>
          </h3>
          <p className={css.cardHint}>
            Constraints picture across the covenants intake field and the four
            governance note fields (owner / zoning / access / water rights).
            Clause-detection on the covenants text surfaces the legal risk
            categories already accounted for.
          </p>
        </div>
        <div className={`${css.bandPill} ${cfg.cls}`}>
          <span className={css.bandLabel}>{cfg.label}</span>
          <span className={css.bandBlurb}>{cfg.blurb}</span>
        </div>
      </div>

      {/* Covenants text + clauses */}
      <section className={css.field}>
        <div className={css.fieldHead}>
          <span className={css.fieldLabel}>Restrictions / covenants</span>
          <span className={`${css.tierPill} ${TIER_CLS[covTier]}`}>{TIER_LABEL[covTier]}</span>
          <span className={css.fieldMeta}>
            {wordCount(covenants)} words {'\u00B7'} {clauseHits.length} clause
            {clauseHits.length !== 1 ? 's' : ''} detected
          </span>
        </div>
        {covenants ? (
          <>
            <p className={css.fieldText}>{clip(covenants, PREVIEW_CHAR_CAP)}</p>
            <div className={css.clauseRow}>
              <span className={css.clauseLabel}>Clauses:</span>
              {clauseHits.length > 0 ? (
                clauseHits.map((c) => (
                  <span key={c} className={css.clauseChip}>{c}</span>
                ))
              ) : (
                <span className={css.clauseDim}>
                  none of the {CLAUSE_PATTERNS.length} watched patterns matched
                </span>
              )}
            </div>
          </>
        ) : (
          <p className={css.fieldEmpty}>
            No covenant or restriction text recorded. Pull HOA bylaws, the deed
            page, conservation-easement language, or municipal covenants into
            the intake wizard&rsquo;s Notes step so design decisions sit on a
            real legal floor.
          </p>
        )}
      </section>

      {/* Governance notes grid */}
      <section className={css.field}>
        <div className={css.fieldHead}>
          <span className={css.fieldLabel}>Governance notes</span>
          <span className={css.fieldMeta}>
            {filledGovernance} of {governance.length} recorded
          </span>
        </div>
        <div className={css.govGrid}>
          {governance.map((g) => (
            <div
              key={g.key}
              className={`${css.govCell} ${g.text ? css.govCellFilled ?? '' : css.govCellEmpty ?? ''}`}
            >
              <div className={css.govHead}>
                <span className={css.govLabel}>{g.label}</span>
                <span className={css.govWords}>
                  {g.text ? `${wordCount(g.text)} w` : '\u2014'}
                </span>
              </div>
              <span className={css.govHint}>{g.hint}</span>
              {g.text ? (
                <p className={css.govPreview}>{clip(g.text, 140)}</p>
              ) : (
                <span className={css.govMissing}>not recorded</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className={css.footnote}>
        Spec ref: §3 restrictions-covenants. Coverage band lifts to
        {' '}<em>Documented</em> when covenants are detailed and 3+ governance
        notes are filled; clause-detection scans for {CLAUSE_PATTERNS.length}{' '}
        common legal patterns and is heuristic, not a substitute for counsel.
      </p>
    </div>
  );
}
