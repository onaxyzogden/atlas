/**
 * §8 ZoneNamingCoverageCard — naming + color-coding coverage audit.
 *
 * Rolls up the project's drawn zones by naming hygiene and color
 * uniqueness so stewards can spot "Zone 1", duplicate-coloured tracts,
 * and untitled scribbles before they ship to a presentation. Reads
 * `useZoneStore` only — pure derivation, no writes.
 *
 * Closes manifest §8 `draw-custom-zones-naming-color` (P1) partial -> done.
 */

import { useMemo } from 'react';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
} from '../../store/zoneStore.js';
import css from './ZoneNamingCoverageCard.module.css';

interface Props {
  projectId: string;
}

type NameTier = 'descriptive' | 'thin' | 'generic' | 'missing';

interface ZoneAudit {
  zone: LandZone;
  trimmed: string;
  wordCount: number;
  charCount: number;
  tier: NameTier;
  flags: string[];
  isCategoryDefaultColor: boolean;
  colorCollisionCount: number;
}

const GENERIC_TOKENS = new Set([
  'zone', 'area', 'plot', 'parcel', 'tract', 'land', 'spot', 'place',
  'region', 'block', 'section', 'lot', 'patch', 'piece', 'space',
]);

const DESCRIPTIVE_WORDS = 3;
const THIN_WORDS = 2;

function classifyName(raw: string): { tier: NameTier; flags: string[]; trimmed: string; wordCount: number; charCount: number } {
  const trimmed = (raw ?? '').trim();
  const flags: string[] = [];
  if (trimmed.length === 0) {
    return { tier: 'missing', flags: ['Unnamed'], trimmed, wordCount: 0, charCount: 0 };
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const charCount = trimmed.length;
  const lower = trimmed.toLowerCase();

  // Pure numeric or alphanumeric tag (e.g. "Zone 1", "A2", "1")
  const isNumericOnly = /^[a-z]?\s*[0-9]+$/i.test(trimmed.replace(/\s+/g, ' '));
  const onlyGenericTokens =
    wordCount > 0 &&
    words.every((w) => GENERIC_TOKENS.has(w.toLowerCase()) || /^[0-9]+$/.test(w));

  if (isNumericOnly || onlyGenericTokens) {
    flags.push('Generic name');
    return { tier: 'generic', flags, trimmed, wordCount, charCount };
  }
  // "Zone 1" style: starts with a generic token + number
  if (wordCount <= 2 && words[0] && GENERIC_TOKENS.has(words[0].toLowerCase()) && /[0-9]/.test(lower)) {
    flags.push('Generic name');
    return { tier: 'generic', flags, trimmed, wordCount, charCount };
  }
  if (wordCount < THIN_WORDS || charCount < 6) {
    flags.push('One-word name');
    return { tier: 'thin', flags, trimmed, wordCount, charCount };
  }
  if (wordCount < DESCRIPTIVE_WORDS) {
    return { tier: 'thin', flags, trimmed, wordCount, charCount };
  }
  return { tier: 'descriptive', flags, trimmed, wordCount, charCount };
}

function buildAudit(zones: LandZone[]): ZoneAudit[] {
  const colorTotals = new Map<string, number>();
  for (const z of zones) {
    const key = (z.color ?? '').toLowerCase();
    colorTotals.set(key, (colorTotals.get(key) ?? 0) + 1);
  }
  return zones.map((z) => {
    const cls = classifyName(z.name ?? '');
    const flags = [...cls.flags];
    const defaultColor = ZONE_CATEGORY_CONFIG[z.category]?.color?.toLowerCase() ?? '';
    const isCategoryDefault = (z.color ?? '').toLowerCase() === defaultColor;
    const collisionCount = (colorTotals.get((z.color ?? '').toLowerCase()) ?? 1) - 1;
    if (collisionCount > 0) flags.push('Color shared');
    return {
      zone: z,
      trimmed: cls.trimmed,
      wordCount: cls.wordCount,
      charCount: cls.charCount,
      tier: cls.tier,
      flags,
      isCategoryDefaultColor: isCategoryDefault,
      colorCollisionCount: collisionCount,
    };
  });
}

type Verdict = 'documented' | 'outlined' | 'sparse' | 'empty';

function deriveVerdict(audit: ZoneAudit[]): { verdict: Verdict; label: string; blurb: string } {
  if (audit.length === 0) {
    return { verdict: 'empty', label: 'No zones drawn', blurb: 'Draw a zone in the Zones tab to begin.' };
  }
  const descriptive = audit.filter((a) => a.tier === 'descriptive').length;
  const thin = audit.filter((a) => a.tier === 'thin').length;
  const ratio = descriptive / audit.length;
  if (ratio >= 0.7 && thin <= 1) {
    return { verdict: 'documented', label: 'Documented', blurb: 'Most zones carry distinct, descriptive names.' };
  }
  if (ratio >= 0.4) {
    return { verdict: 'outlined', label: 'Outlined', blurb: 'Names are present but several are thin or shared.' };
  }
  return { verdict: 'sparse', label: 'Sparse', blurb: 'Many zones lack a descriptive name or unique colour.' };
}

const TIER_LABEL: Record<NameTier, string> = {
  descriptive: 'Descriptive',
  thin: 'Thin',
  generic: 'Generic',
  missing: 'Unnamed',
};

const TIER_PILL_CLASS: Record<NameTier, string> = {
  descriptive: css.tierStrong ?? '',
  thin: css.tierAcceptable ?? '',
  generic: css.tierSparse ?? '',
  missing: css.tierGap ?? '',
};

export default function ZoneNamingCoverageCard({ projectId }: Props) {
  const allZones = useZoneStore((st) => st.zones);
  const projectZones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );

  const audit = useMemo(() => buildAudit(projectZones), [projectZones]);

  const stats = useMemo(() => {
    const tiers: Record<NameTier, number> = { descriptive: 0, thin: 0, generic: 0, missing: 0 };
    let collisions = 0;
    let categoryDefault = 0;
    const colorSet = new Set<string>();
    for (const a of audit) {
      tiers[a.tier] += 1;
      if (a.colorCollisionCount > 0) collisions += 1;
      if (a.isCategoryDefaultColor) categoryDefault += 1;
      colorSet.add((a.zone.color ?? '').toLowerCase());
    }
    return {
      total: audit.length,
      tiers,
      collisions,
      categoryDefault,
      uniqueColors: colorSet.size,
    };
  }, [audit]);

  const verdict = useMemo(() => deriveVerdict(audit), [audit]);

  const verdictClass =
    verdict.verdict === 'documented' ? css.verdictGood ?? ''
    : verdict.verdict === 'outlined' ? css.verdictFair ?? ''
    : verdict.verdict === 'sparse' ? css.verdictWork ?? ''
    : css.verdictBlock ?? '';

  return (
    <div className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Zone naming &amp; colour coverage
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Reads every zone for the active project and rates the steward's
            naming hygiene. <em>Descriptive</em> = three+ words that say what
            the zone is for. <em>Thin</em> = a one-word label or shared
            category colour. <em>Generic</em> = "Zone 1" / "Area 2" style
            placeholders that won't survive a presentation. <em>Unnamed</em>
            = the polygon was saved without a label.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass}`}>
          <span className={css.verdictLabel}>{verdict.label}</span>
          <span className={css.verdictBlurb}>{verdict.blurb}</span>
        </div>
      </header>

      {audit.length === 0 ? (
        <p className={css.empty}>
          No zones drawn for this project yet. Use the Zones tab to draw and
          name a polygon — the audit appears here once at least one is saved.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.total}</span>
              <span className={css.statLabel}>Zones drawn</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.tiers.descriptive}</span>
              <span className={css.statLabel}>Descriptive</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.tiers.thin + stats.tiers.generic}</span>
              <span className={css.statLabel}>Thin / generic</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.tiers.missing}</span>
              <span className={css.statLabel}>Unnamed</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.collisions}</span>
              <span className={css.statLabel}>Colour collisions</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.uniqueColors}</span>
              <span className={css.statLabel}>Unique colours</span>
            </div>
          </div>

          <ul className={css.zoneList}>
            {audit.map((a) => {
              const cfg = ZONE_CATEGORY_CONFIG[a.zone.category];
              const displayName = a.tier === 'missing' ? '(unnamed)' : a.trimmed;
              return (
                <li key={a.zone.id} className={css.zoneRow}>
                  <span
                    className={css.colorSwatch}
                    style={{ background: a.zone.color }}
                    aria-hidden
                  />
                  <div className={css.zoneBody}>
                    <div className={css.zoneHead}>
                      <span className={css.zoneName}>{displayName}</span>
                      <span className={`${css.tierPill} ${TIER_PILL_CLASS[a.tier]}`}>
                        {TIER_LABEL[a.tier]}
                      </span>
                    </div>
                    <div className={css.zoneMeta}>
                      <span>{cfg?.label ?? a.zone.category}</span>
                      <span>&middot;</span>
                      <span>{a.wordCount} word{a.wordCount === 1 ? '' : 's'}</span>
                      <span>&middot;</span>
                      <span>{a.charCount} char{a.charCount === 1 ? '' : 's'}</span>
                      {a.colorCollisionCount > 0 && (
                        <>
                          <span>&middot;</span>
                          <span className={css.metaWarn}>
                            shares colour with {a.colorCollisionCount} other
                          </span>
                        </>
                      )}
                      {a.isCategoryDefaultColor && a.colorCollisionCount === 0 && (
                        <>
                          <span>&middot;</span>
                          <span className={css.metaMuted}>category default colour</span>
                        </>
                      )}
                    </div>
                    {a.flags.length > 0 && (
                      <div className={css.flagChips}>
                        {a.flags.map((f) => (
                          <span key={f} className={css.flagChip}>{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className={css.footnote}>
            <em>Why this matters:</em> drawn zones become the spine of the
            allocation report, the conflict detector, and any guest-facing
            map you export. A polygon called <em>"Zone 3"</em> reads as a
            placeholder, and two zones sharing a colour merge visually on
            the map. Descriptive names + distinct fills are the cheapest
            way to make the plan legible to outside readers.
          </p>
        </>
      )}
    </div>
  );
}
