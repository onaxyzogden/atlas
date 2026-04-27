/**
 * §17 SitingRuleFamilyCoverageCard — siting-rule coverage by family.
 *
 * The Siting panel already surfaces the *weight-bucket* cut of the
 * rules layer (RulesLayerOverviewCard groups by `weightCategory`:
 * ecological / hydrological / structural / agricultural / experiential
 * / spiritual). The §17 spec also calls for a *siting-family* read —
 * the six placement-domain groupings the spec frames the rule layer
 * around: structure, orchard, water, grazing, quiet, sacred. Those map
 * across weight buckets (e.g., a "water" family pulls from hydrological
 * AND structural rules), so the family cut is a different question:
 *
 *   "For each placement family, how many rules in the catalog fire on
 *    it, and is that family well covered or under-rule'd?"
 *
 * This card maps every entry in RULE_CATALOG onto one or more siting
 * families via a curated rule-id → family list, then reports per-family
 * coverage tier against an expected-rule-count threshold. A short hint
 * names the rules that comprise each family. A coverage verdict pill
 * rolls the six families up: Well-covered / Acceptable / Sparse / Gap.
 *
 * Pure presentation — reads RULE_CATALOG only. No store reads, no
 * entity writes, no map overlays.
 *
 * Spec: §17 siting-rules-structure-orchard-water-grazing-quiet-sacred
 * (featureManifest line 419).
 */

import { useMemo } from 'react';
import { RULE_CATALOG, type RuleCatalogEntry } from './SitingRules.js';
import css from './SitingRuleFamilyCoverageCard.module.css';

/* ------------------------------------------------------------------ */
/*  Family taxonomy                                                    */
/* ------------------------------------------------------------------ */

type Family = 'structure' | 'orchard' | 'water' | 'grazing' | 'quiet' | 'sacred';

const FAMILY_ORDER: Family[] = ['structure', 'orchard', 'water', 'grazing', 'quiet', 'sacred'];

const FAMILY_LABEL: Record<Family, string> = {
  structure: 'Structure',
  orchard: 'Orchard',
  water: 'Water',
  grazing: 'Grazing',
  quiet: 'Quiet zone',
  sacred: 'Sacred zone',
};

const FAMILY_HINT: Record<Family, string> = {
  structure: 'Setbacks, slope, solar, wind, access, utility prerequisites for buildings',
  orchard: 'Frost-pocket avoidance and drainage suitability for tree crops',
  water: 'Flood placement, flow accumulation, water-source & spillway clearance',
  grazing: 'Slope tolerance and erosion risk for paddocks',
  quiet: 'Guest privacy, guest-safe livestock buffer, circulation conflicts',
  sacred: 'Acoustic separation, livestock buffer, Qibla orientation',
};

/* Curated rule-id → family[] map. A rule can belong to multiple
 * families (e.g., `livestock-spiritual-buffer` is sacred AND grazing-
 * adjacent in intent). Anchored on rule ids rather than weight buckets
 * so the mapping survives weight-category renames. */
const RULE_TO_FAMILIES: Record<string, Family[]> = {
  // Structural / building placement
  'slope-structure': ['structure'],
  'slope-road': ['structure'],
  'solar-orientation': ['structure'],
  'wind-shelter': ['structure'],
  'well-septic-distance': ['structure', 'water'],
  'access-to-dwelling': ['structure'],
  'no-access-paths': ['structure'],
  'no-emergency-access': ['structure'],
  'dwelling-needs-water': ['structure', 'water'],
  'dwelling-needs-septic': ['structure'],
  'dwelling-needs-power': ['structure'],

  // Hydrological
  'flood-zone': ['water', 'structure'],
  'drainage-orchard': ['orchard'],
  'flow-accumulation': ['water'],
  'livestock-water-source': ['water', 'grazing'],
  'water-structure-clearance': ['water', 'structure'],

  // Agricultural
  'frost-pocket': ['orchard'],
  'slope-grazing': ['grazing'],

  // Experiential
  'guest-privacy-buffer': ['quiet'],
  'guest-safe-livestock': ['quiet', 'grazing'],
  'guest-circulation-conflict': ['quiet'],

  // Spiritual
  'sacred-noise-road': ['sacred'],
  'sacred-noise-livestock': ['sacred', 'grazing'],
  'sacred-noise-infrastructure': ['sacred'],
  'prayer-qibla-alignment': ['sacred'],
  'livestock-spiritual-buffer': ['sacred', 'grazing'],
};

/* Per-family expected-rule thresholds. Calibrated to the current
 * catalog density: structure is the largest family by design, sacred /
 * water are mid-density, orchard / grazing are intentionally sparse
 * (single-axis rules). */
const FAMILY_EXPECTED: Record<Family, { strong: number; acceptable: number }> = {
  structure: { strong: 8, acceptable: 5 },
  water:     { strong: 4, acceptable: 2 },
  sacred:    { strong: 4, acceptable: 2 },
  quiet:     { strong: 3, acceptable: 2 },
  orchard:   { strong: 2, acceptable: 1 },
  grazing:   { strong: 2, acceptable: 1 },
};

/* ------------------------------------------------------------------ */
/*  Tier + verdict types                                               */
/* ------------------------------------------------------------------ */

type Tier = 'strong' | 'acceptable' | 'sparse' | 'gap';

const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong',
  acceptable: 'Acceptable',
  sparse: 'Sparse',
  gap: 'Gap',
};

const TIER_CLS: Record<Tier, string> = {
  strong: css.tierStrong ?? '',
  acceptable: css.tierAcceptable ?? '',
  sparse: css.tierSparse ?? '',
  gap: css.tierGap ?? '',
};

function tierFor(count: number, family: Family): Tier {
  const threshold = FAMILY_EXPECTED[family];
  if (count === 0) return 'gap';
  if (count >= threshold.strong) return 'strong';
  if (count >= threshold.acceptable) return 'acceptable';
  return 'sparse';
}

type Verdict = 'well-covered' | 'acceptable' | 'sparse' | 'gap';

const VERDICT_CFG: Record<Verdict, { label: string; cls: string; blurb: string }> = {
  'well-covered': { label: 'Well-covered', cls: css.verdictGood ?? '',  blurb: 'All six placement families have rules registered' },
  'acceptable':   { label: 'Acceptable',   cls: css.verdictFair ?? '',  blurb: 'Five of six families covered — one is sparse or empty' },
  'sparse':       { label: 'Sparse',       cls: css.verdictWork ?? '',  blurb: 'Multiple families under-rule′d for production use' },
  'gap':          { label: 'Gap',          cls: css.verdictBlock ?? '', blurb: 'One or more siting families have no rules at all' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface FamilyRow {
  family: Family;
  rules: RuleCatalogEntry[];
  tier: Tier;
}

export default function SitingRuleFamilyCoverageCard() {
  const rows: FamilyRow[] = useMemo(() => {
    const byFamily: Record<Family, RuleCatalogEntry[]> = {
      structure: [], orchard: [], water: [], grazing: [], quiet: [], sacred: [],
    };
    for (const entry of RULE_CATALOG) {
      const fams = RULE_TO_FAMILIES[entry.ruleId];
      if (!fams) continue;
      for (const f of fams) byFamily[f].push(entry);
    }
    return FAMILY_ORDER.map((family) => ({
      family,
      rules: byFamily[family],
      tier: tierFor(byFamily[family].length, family),
    }));
  }, []);

  const totalRules = RULE_CATALOG.length;
  const mappedRuleIds = new Set(Object.keys(RULE_TO_FAMILIES));
  const unmappedCount = RULE_CATALOG.filter((r) => !mappedRuleIds.has(r.ruleId)).length;
  const gapCount = rows.filter((r) => r.tier === 'gap').length;
  const strongCount = rows.filter((r) => r.tier === 'strong').length;
  const sparseCount = rows.filter((r) => r.tier === 'sparse').length;

  const verdict: Verdict = useMemo(() => {
    if (gapCount > 0) return 'gap';
    if (sparseCount >= 2) return 'sparse';
    if (sparseCount === 1) return 'acceptable';
    return 'well-covered';
  }, [gapCount, sparseCount]);

  return (
    <section className={css.card ?? ''} aria-labelledby="siting-rule-family-coverage-title">
      <header className={css.cardHead ?? ''}>
        <div>
          <h3 id="siting-rule-family-coverage-title" className={css.cardTitle ?? ''}>
            Siting-rule family coverage
            <span className={css.badge ?? ''}>AUDIT</span>
          </h3>
          <p className={css.cardHint ?? ''}>
            Six placement families from the §17 spec — structure, orchard, water, grazing,
            quiet zone, sacred zone — checked against <em>RULE_CATALOG</em> for registered
            coverage. Each family has an expected rule density; under-density flags as
            sparse, zero rules as a gap.
          </p>
        </div>
        <div className={`${css.verdictPill ?? ''} ${VERDICT_CFG[verdict].cls}`}>
          <span className={css.verdictLabel ?? ''}>{VERDICT_CFG[verdict].label}</span>
          <span className={css.verdictBlurb ?? ''}>{VERDICT_CFG[verdict].blurb}</span>
        </div>
      </header>

      <div className={css.statsRow ?? ''}>
        <div className={css.stat ?? ''}>
          <span className={css.statValue ?? ''}>{totalRules}</span>
          <span className={css.statLabel ?? ''}>Catalog rules</span>
        </div>
        <div className={css.stat ?? ''}>
          <span className={css.statValue ?? ''}>{strongCount}/6</span>
          <span className={css.statLabel ?? ''}>Strong families</span>
        </div>
        <div className={css.stat ?? ''}>
          <span className={css.statValue ?? ''}>{sparseCount}</span>
          <span className={css.statLabel ?? ''}>Sparse families</span>
        </div>
        <div className={css.stat ?? ''}>
          <span className={css.statValue ?? ''}>{gapCount}</span>
          <span className={css.statLabel ?? ''}>Gaps</span>
        </div>
      </div>

      <ul className={css.familyList ?? ''}>
        {rows.map((row) => {
          const expected = FAMILY_EXPECTED[row.family];
          return (
            <li key={row.family} className={css.familyRow ?? ''}>
              <div className={css.familyHead ?? ''}>
                <span className={css.familyLabel ?? ''}>{FAMILY_LABEL[row.family]}</span>
                <span className={`${css.tierPill ?? ''} ${TIER_CLS[row.tier]}`}>
                  {TIER_LABEL[row.tier]}
                </span>
                <span className={css.familyMeta ?? ''}>
                  {row.rules.length} rule{row.rules.length === 1 ? '' : 's'}
                  {' '}· expects {expected.acceptable}-{expected.strong}+
                </span>
              </div>
              <p className={css.familyHint ?? ''}>{FAMILY_HINT[row.family]}</p>
              {row.rules.length > 0 ? (
                <div className={css.ruleChips ?? ''}>
                  {row.rules.map((rule) => (
                    <span key={rule.ruleId} className={css.ruleChip ?? ''} title={rule.description}>
                      {rule.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={css.familyEmpty ?? ''}>
                  No rules registered for this family. Reserved for future authoring.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote ?? ''}>
        <em>Mapping:</em> {Object.keys(RULE_TO_FAMILIES).length} of {totalRules} catalog
        rules anchored to one or more families
        {unmappedCount > 0 ? ` (${unmappedCount} unmapped — drop into a family or mark deliberate)` : ''}.
        Multi-family rules count toward each family they support.
      </p>
    </section>
  );
}
