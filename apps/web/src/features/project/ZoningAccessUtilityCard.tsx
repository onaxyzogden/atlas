/**
 * §3 ZoningAccessUtilityCard — read-back of intake zoning, access &
 * utility free-text fields with topical cue detection.
 *
 * The intake wizard captures three governance / infrastructure free-text
 * fields on the project root (`zoningNotes`, `accessNotes`,
 * `waterRightsNotes`) and a county-recorder `legalDescription` on
 * `metadata`. Two siblings on the project dashboard already roll up the
 * other intake-text surfaces:
 *
 *   - FieldObservationsLegalCard — fieldObservations + legalDescription
 *   - RestrictionsCovenantsCard — restrictionsCovenants + the same three
 *     governance fields, but framed as constraint-clause detection
 *
 * This card sits alongside them and frames the three governance fields
 * as the *operating envelope* picture: what the parcel is *allowed* to
 * become (zoning use classes), how it can be *reached* (road class /
 * emergency access), and what *services* feed it (well / septic /
 * cistern / utility hookups). Per-field tier is derived from word count
 * with topical-cue promotion — a short note that hits two or more
 * relevant cues earns an outline → detailed bump. Aggregate coverage
 * band: Documented (all three detailed) / Outlined (all three filled,
 * mix of tiers) / Sparse (one or two filled) / Not recorded.
 *
 * Pure presentation — reads `project` only. No shared math, no entity
 * writes, no map overlays.
 *
 * Spec: §3 zoning-utility-notes (featureManifest line 90).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './ZoningAccessUtilityCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const DETAILED_WORDS = 45;
const OUTLINE_WORDS = 12;
const PREVIEW_CHAR_CAP = 320;
const PROMOTE_CUE_THRESHOLD = 2; // ≥ this many cue hits + outline-words → detailed

/* Cue patterns, scoped per field. Hits surface as chips and contribute
 * to a "topical density" score that can promote a short-but-targeted
 * note up one tier. */
const ZONING_CUES: { label: string; pattern: RegExp }[] = [
  { label: 'Permitted use', pattern: /\bpermitted\b/i },
  { label: 'Conditional use', pattern: /\b(conditional|special[- ]use|by[- ]right exception)\b/i },
  { label: 'Prohibited', pattern: /\b(prohibit|not permitted|forbidden|disallowed)/i },
  { label: 'Zoning code', pattern: /\b(A|R|C|I|RR|AG|RU)[- ]?\d+[A-Z]?\b/ },
  { label: 'Setback rule', pattern: /\b\d+\s*(m|ft|metre|meter|foot|feet)\s*(setback|buffer)\b/i },
  { label: 'Lot coverage', pattern: /\b(lot[- ]?coverage|floor[- ]?area[- ]?ratio|FAR)\b/i },
  { label: 'Variance', pattern: /\b(variance|rezoning|zoning amendment)\b/i },
  { label: 'Agritourism', pattern: /\b(agritourism|agri[- ]?tourism|farm[- ]?stay|B&B|bed[- ]and[- ]breakfast)\b/i },
];

const ACCESS_CUES: { label: string; pattern: RegExp }[] = [
  { label: 'Municipal road', pattern: /\b(municipal|county|state|provincial|township)\s+(road|highway|hwy|route)\b/i },
  { label: 'Private lane', pattern: /\bprivate\s+(road|lane|drive|driveway)\b/i },
  { label: 'Gravel / unpaved', pattern: /\b(gravel|dirt|unpaved|unmaintained)\b/i },
  { label: 'Seasonal / closed', pattern: /\b(seasonal|winter[- ]closed|spring[- ]breakup)\b/i },
  { label: 'Emergency access', pattern: /\b(emergency|fire|secondary)\s+(access|exit|route|lane)\b/i },
  { label: 'Lane length', pattern: /\b\d+\s*(m|ft|metre|meter|foot|feet|km|mile)s?\b.*\b(lane|drive|driveway|access)\b/i },
  { label: 'Easement', pattern: /\b(right[- ]of[- ]way|easement|access agreement)\b/i },
  { label: 'Bridge / culvert', pattern: /\b(bridge|culvert|low[- ]water crossing|ford)\b/i },
];

const UTILITY_CUES: { label: string; pattern: RegExp }[] = [
  { label: 'Well', pattern: /\b(well|drilled well|dug well|artesian)\b/i },
  { label: 'Septic', pattern: /\b(septic|leach[- ]field|tile[- ]field|holding tank)\b/i },
  { label: 'Cistern', pattern: /\b(cistern|hauled water|rainwater catchment)\b/i },
  { label: 'Surface water', pattern: /\b(creek|stream|spring|pond|river|watercourse|water[- ]taking)\b/i },
  { label: 'Permit / regulated', pattern: /\b(permit|regulated|conservation authority|water rights|allocation)\b/i },
  { label: 'Grid hookup', pattern: /\b(grid|electrical|hydro)\s+(hook|connection|service|line)?/i },
  { label: 'Off-grid', pattern: /\b(off[- ]?grid|solar[- ]?powered|propane|generator)\b/i },
  { label: 'Internet / cell', pattern: /\b(fibre|fiber|broadband|starlink|cellular|cell\s+tower)\b/i },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '…';
}

type Tier = 'detailed' | 'outline' | 'sparse' | 'empty';

function tierFor(text: string, cueHits: number): Tier {
  const w = wordCount(text);
  if (w === 0) return 'empty';
  if (w >= DETAILED_WORDS) return 'detailed';
  if (w >= OUTLINE_WORDS) {
    return cueHits >= PROMOTE_CUE_THRESHOLD ? 'detailed' : 'outline';
  }
  return cueHits >= PROMOTE_CUE_THRESHOLD ? 'outline' : 'sparse';
}

function detectCues(text: string, cues: { label: string; pattern: RegExp }[]): string[] {
  if (!text) return [];
  return cues.filter((c) => c.pattern.test(text)).map((c) => c.label);
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
  documented: { label: 'Documented', cls: css.bandDocumented ?? '', blurb: 'All three governance surfaces recorded with detail' },
  outlined:   { label: 'Outlined',   cls: css.bandOutlined ?? '',   blurb: 'All three filled — at least one needs more depth' },
  sparse:     { label: 'Sparse',     cls: css.bandSparse ?? '',     blurb: 'Only one or two governance surfaces captured' },
  empty:      { label: 'Not recorded', cls: css.bandEmpty ?? '',    blurb: 'No zoning, access, or utility notes at intake' },
};

interface FieldRow {
  id: 'zoning' | 'access' | 'utility';
  label: string;
  hint: string;
  text: string;
  tier: Tier;
  cues: string[];
}

export default function ZoningAccessUtilityCard({ project }: Props) {
  const zoning = (project.zoningNotes ?? '').trim();
  const access = (project.accessNotes ?? '').trim();
  const utility = (project.waterRightsNotes ?? '').trim();
  const md = project.metadata ?? {};
  const legal = (md.legalDescription ?? '').trim();
  const parcelId = (project.parcelId ?? '').trim();

  const rows: FieldRow[] = useMemo(() => {
    const zCues = detectCues(zoning, ZONING_CUES);
    const aCues = detectCues(access, ACCESS_CUES);
    const uCues = detectCues(utility, UTILITY_CUES);
    return [
      {
        id: 'zoning',
        label: 'Zoning & permitted use',
        hint: 'What the parcel is allowed to become — use classes, conditional uses, setbacks, variances.',
        text: zoning,
        tier: tierFor(zoning, zCues.length),
        cues: zCues,
      },
      {
        id: 'access',
        label: 'Access & roads',
        hint: 'How the parcel is reached — road class, lane length, emergency exits, easements, crossings.',
        text: access,
        tier: tierFor(access, aCues.length),
        cues: aCues,
      },
      {
        id: 'utility',
        label: 'Water & utility services',
        hint: 'What feeds the parcel — well, septic, cistern, surface water, grid, off-grid, comms, water rights.',
        text: utility,
        tier: tierFor(utility, uCues.length),
        cues: uCues,
      },
    ];
  }, [zoning, access, utility]);

  const filledCount = rows.filter((r) => r.tier !== 'empty').length;
  const detailedCount = rows.filter((r) => r.tier === 'detailed').length;

  const band: Band = useMemo(() => {
    if (filledCount === 0) return 'empty';
    if (filledCount < 3) return 'sparse';
    if (detailedCount === 3) return 'documented';
    return 'outlined';
  }, [filledCount, detailedCount]);

  const totalWords = wordCount(zoning) + wordCount(access) + wordCount(utility);
  const totalCues = rows.reduce((sum, r) => sum + r.cues.length, 0);

  return (
    <section className={css.card ?? ''} aria-labelledby="zoning-access-utility-title">
      <header className={css.cardHead ?? ''}>
        <div>
          <h3 id="zoning-access-utility-title" className={css.cardTitle ?? ''}>
            Zoning, access & utility envelope
            <span className={css.badge ?? ''}>INTAKE</span>
          </h3>
          <p className={css.cardHint ?? ''}>
            Three governance surfaces from intake — what the parcel is allowed to become,
            how it&apos;s reached, and what services feed it. Word counts, topical cue chips,
            and a coverage band help judge whether more detail is needed before site work.
          </p>
        </div>
        <div className={`${css.bandPill ?? ''} ${BAND_CFG[band].cls}`}>
          <span className={css.bandLabel ?? ''}>{BAND_CFG[band].label}</span>
          <span className={css.bandBlurb ?? ''}>{BAND_CFG[band].blurb}</span>
        </div>
      </header>

      {rows.map((row) => (
        <div key={row.id} className={css.field ?? ''}>
          <div className={css.fieldHead ?? ''}>
            <span className={css.fieldLabel ?? ''}>{row.label}</span>
            <span className={`${css.tierPill ?? ''} ${TIER_CLS[row.tier]}`}>
              {TIER_LABEL[row.tier]}
            </span>
            <span className={css.fieldMeta ?? ''}>
              {wordCount(row.text)} word{wordCount(row.text) === 1 ? '' : 's'}
              {row.cues.length > 0 ? ` · ${row.cues.length} cue${row.cues.length === 1 ? '' : 's'}` : ''}
            </span>
          </div>
          <p className={css.fieldHintRow ?? ''}>{row.hint}</p>
          {row.text ? (
            <p className={css.fieldText ?? ''}>{clip(row.text, PREVIEW_CHAR_CAP)}</p>
          ) : (
            <p className={css.fieldEmpty ?? ''}>Not recorded at intake.</p>
          )}
          {row.cues.length > 0 && (
            <div className={css.cueRow ?? ''}>
              <span className={css.cueLabel ?? ''}>Topical cues:</span>
              {row.cues.map((c) => (
                <span key={c} className={`${css.cueChip ?? ''} ${css.cueChipPass ?? ''}`}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className={css.support ?? ''}>
        <div className={css.supportHead ?? ''}>Cross-reference</div>
        <div className={css.supportGrid ?? ''}>
          <div className={css.supportCell ?? ''}>
            <span className={css.supportLabel ?? ''}>Parcel ID</span>
            {parcelId ? (
              <span className={css.supportValue ?? ''}>{parcelId}</span>
            ) : (
              <span className={css.supportMissing ?? ''}>not recorded</span>
            )}
          </div>
          <div className={css.supportCell ?? ''}>
            <span className={css.supportLabel ?? ''}>Legal description</span>
            {legal ? (
              <span className={css.supportValue ?? ''}>
                {wordCount(legal)} word{wordCount(legal) === 1 ? '' : 's'} on file
              </span>
            ) : (
              <span className={css.supportMissing ?? ''}>not on file</span>
            )}
          </div>
          <div className={css.supportCell ?? ''}>
            <span className={css.supportLabel ?? ''}>Province / State</span>
            {project.provinceState ? (
              <span className={css.supportValue ?? ''}>{project.provinceState}</span>
            ) : (
              <span className={css.supportMissing ?? ''}>not recorded</span>
            )}
          </div>
          <div className={css.supportCell ?? ''}>
            <span className={css.supportLabel ?? ''}>Country</span>
            {project.country ? (
              <span className={css.supportValue ?? ''}>{project.country}</span>
            ) : (
              <span className={css.supportMissing ?? ''}>not recorded</span>
            )}
          </div>
        </div>
      </div>

      <p className={css.footnote ?? ''}>
        <em>Coverage:</em> {filledCount} of 3 surfaces filled · {detailedCount} detailed ·
        {' '}{totalWords} word{totalWords === 1 ? '' : 's'} total · {totalCues} cue
        {totalCues === 1 ? '' : 's'} matched. Tier promotes from outline → detailed when
        a short note hits {PROMOTE_CUE_THRESHOLD}+ topical cues.
      </p>
    </section>
  );
}
