/**
 * §25 RuleHotspotCostBundlesCard — read-only inventory of the rule sets,
 * hotspot sets, and cost models currently configured for this project.
 *
 * Pairs with `ExtractedPatternsCard` to complete the inventory side of
 * manifest line 580 (`saved-bundles-rules-hotspots-phases-costs`):
 *   • ExtractedPatternsCard surfaces zones / structures / paths /
 *     livestock / crops / utilities / phases.
 *   • This card surfaces the three remaining bundle classes the leaf
 *     names but had no inventory for: rule sets, hotspot sets, cost
 *     models.
 *
 * Rule set bundle: count of rules per weight category from
 * `RULE_CATALOG`, current weight values from `useSitingWeightStore`,
 * with a preset-match detector that recognises when the configured
 * weights line up with one of the known project-type presets.
 *
 * Hotspot set bundle: live `evaluateRules` output rolled up by
 * `RuleCategory`, showing which categories are currently producing
 * violations (the "hotspots") and at what severity mix.
 *
 * Cost model bundle: per-source-type unit-cost ranges in use, derived
 * directly from the parametric template tables (`STRUCTURE_TEMPLATES`),
 * so the steward can see "the model that would carry over" without
 * needing a placed entity.
 *
 * Pure presentation: no entity writes, no shared math, no map
 * overlays. Mounted on TemplatePanel below ExtractedPatternsCard.
 *
 * Closes manifest §25 line 580 partial -> done (inventory side).
 */

import { useMemo } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSitingWeightStore } from '../../store/sitingWeightStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import {
  RULE_CATALOG,
  type RuleCatalogEntry,
  type RuleCategory,
  type RuleSeverity,
  type RuleViolation,
  type RuleWeightCategory,
} from '../rules/SitingRules.js';
import { evaluateRules } from '../rules/RulesEngine.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './RuleHotspotCostBundlesCard.module.css';

/* ------------------------------------------------------------------ */
/*  Weight presets — mirror sitingWeightStore presets so we can detect */
/*  whether the user's current weights match a known preset.           */
/* ------------------------------------------------------------------ */

type WeightMap = Record<RuleWeightCategory, number>;
const DEFAULT_WEIGHT = 50;
const WEIGHT_TOLERANCE = 4;

const PRESETS: Record<string, Partial<WeightMap>> = {
  conservation:       { ecological: 80, hydrological: 70, agricultural: 40, experiential: 30, structural: 40, spiritual: 40 },
  regenerative_farm:  { agricultural: 80, ecological: 70, hydrological: 65, structural: 50, experiential: 30, spiritual: 40 },
  retreat_center:     { experiential: 80, spiritual: 75, structural: 60, ecological: 50, hydrological: 50, agricultural: 30 },
  moontrance:         { spiritual: 85, experiential: 80, ecological: 60, hydrological: 55, structural: 55, agricultural: 30 },
  homestead:          { structural: 70, hydrological: 60, agricultural: 60, ecological: 50, experiential: 40, spiritual: 40 },
  educational_farm:   { agricultural: 70, experiential: 65, ecological: 60, structural: 55, hydrological: 55, spiritual: 40 },
  multi_enterprise:   { structural: 65, agricultural: 60, hydrological: 60, ecological: 55, experiential: 50, spiritual: 40 },
};

const WEIGHT_CATEGORIES: RuleWeightCategory[] = [
  'ecological', 'hydrological', 'structural', 'agricultural', 'experiential', 'spiritual',
];

function detectPreset(weights: WeightMap): string | null {
  for (const [name, partial] of Object.entries(PRESETS)) {
    let match = true;
    for (const cat of WEIGHT_CATEGORIES) {
      const expected = (partial as Partial<WeightMap>)[cat] ?? DEFAULT_WEIGHT;
      const actual = weights[cat];
      if (Math.abs(actual - expected) > WEIGHT_TOLERANCE) {
        match = false;
        break;
      }
    }
    if (match) return name;
  }
  // All defaults?
  if (WEIGHT_CATEGORIES.every((c) => Math.abs(weights[c] - DEFAULT_WEIGHT) <= WEIGHT_TOLERANCE)) {
    return 'defaults';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function fmtK(n: number): string {
  if (n < 1000) return `$${n}`;
  if (n < 1_000_000) return `$${Math.round(n / 1000)}k`;
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

const RULE_CATEGORY_LABEL: Record<RuleCategory, string> = {
  setback: 'Setback', slope: 'Slope', solar: 'Solar', privacy: 'Privacy',
  buffer: 'Buffer', water: 'Water', conflict: 'Conflict', access: 'Access',
  frost: 'Frost', drainage: 'Drainage', flood: 'Flood', wind: 'Wind',
  circulation: 'Circulation', spiritual: 'Spiritual', grazing: 'Grazing',
  ecological: 'Ecological',
};

const STRUCTURE_CATEGORY_LABEL: Record<string, string> = {
  dwelling: 'Dwellings',
  agricultural: 'Agricultural',
  spiritual: 'Spiritual',
  utility: 'Utility',
  gathering: 'Gathering',
  infrastructure: 'Infrastructure',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  project: LocalProject;
}

export default function RuleHotspotCostBundlesCard({ project }: Props) {
  const structures = useStructureStore((s) => s.structures);
  const zones      = useZoneStore((s) => s.zones);
  const paddocks   = useLivestockStore((s) => s.paddocks);
  const crops      = useCropStore((s) => s.cropAreas);
  const paths      = usePathStore((s) => s.paths);
  const utilities  = useUtilityStore((s) => s.utilities);
  const weights    = useSitingWeightStore((s) => s.weights);

  const ruleSet = useMemo(() => buildRuleSetBundle(weights, project.projectType ?? null), [weights, project.projectType]);
  const hotspots = useMemo(() => buildHotspotBundle(project, structures, zones, paddocks, crops, paths, utilities), [
    project, structures, zones, paddocks, crops, paths, utilities,
  ]);
  const costModel = useMemo(() => buildCostModelBundle(structures.filter((s) => s.projectId === project.id)), [structures, project.id]);

  const totalBundles = 3;
  const populatedBundles =
    (ruleSet.totalRules > 0 ? 1 : 0) +
    (hotspots.totalViolations > 0 ? 1 : 0) +
    (costModel.totalTypes > 0 ? 1 : 0);

  let verdict: 'unknown' | 'work' | 'done';
  let verdictText: string;
  if (ruleSet.totalRules === 0 && hotspots.totalViolations === 0 && costModel.totalTypes === 0) {
    verdict = 'unknown';
    verdictText = 'No rule, hotspot, or cost-model configuration loaded.';
  } else if (hotspots.errorCount > 0) {
    verdict = 'work';
    verdictText = `${hotspots.errorCount} blocking violation${hotspots.errorCount === 1 ? '' : 's'} across ${hotspots.activeCategories} categor${hotspots.activeCategories === 1 ? 'y' : 'ies'}.`;
  } else if (hotspots.totalViolations > 0) {
    verdict = 'work';
    verdictText = `${hotspots.totalViolations} live rule hits across ${hotspots.activeCategories} categor${hotspots.activeCategories === 1 ? 'y' : 'ies'}.`;
  } else {
    verdict = 'done';
    verdictText = `Rule, hotspot, and cost-model bundles ready to template.`;
  }

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>
            Rule, hotspot &amp; cost-model bundles
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§25</span>
          </h3>
          <p className={css.hint}>
            What <em>else</em> would carry over if this site were saved as a
            template &mdash; the active rule catalog and weight settings,
            the hotspots those rules are currently flagging, and the
            parametric cost model. Pairs with the bundle inventory above.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(verdict)}`}>
          <span className={css.verdictLabel}>{populatedBundles}/{totalBundles} bundles</span>
          <span className={css.verdictText}>{verdictText}</span>
        </div>
      </div>

      <div className={css.bundleGrid}>
        {/* Rule set */}
        <div className={css.bundle}>
          <div className={css.bundleHead}>
            <span className={css.bundleTitle}>Rule set</span>
            <span className={css.bundleCount}>{ruleSet.totalRules} rules</span>
          </div>
          <div className={css.bundleSub}>
            {ruleSet.preset === 'defaults'
              ? 'All weights at default 50/100'
              : ruleSet.preset
                ? <>Following <em>{prettyPreset(ruleSet.preset)}</em> preset</>
                : 'Custom weight configuration'}
          </div>
          <ul className={css.statList}>
            {ruleSet.byCategory.map((c) => (
              <li key={c.category} className={css.statRow}>
                <span className={css.statLabel}>{prettyWeight(c.category)}</span>
                <span className={css.statBar}>
                  <span className={css.statBarFill} style={{ width: `${c.weight}%` }} />
                </span>
                <span className={css.statValue}>{c.weight}</span>
                <span className={css.statSub}>{c.ruleCount} rule{c.ruleCount === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hotspot set */}
        <div className={css.bundle}>
          <div className={css.bundleHead}>
            <span className={css.bundleTitle}>Hotspot set</span>
            <span className={css.bundleCount}>{hotspots.totalViolations} live</span>
          </div>
          <div className={css.bundleSub}>
            {hotspots.totalViolations === 0
              ? 'No active rule violations'
              : <>{hotspots.errorCount} error · {hotspots.warnCount} warning · {hotspots.infoCount} info</>}
          </div>
          {hotspots.byCategory.length === 0 ? (
            <p className={css.empty}>Place features on the map to populate hotspots.</p>
          ) : (
            <ul className={css.statList}>
              {hotspots.byCategory.map((c) => (
                <li key={c.category} className={css.statRow}>
                  <span className={css.statLabel}>{RULE_CATEGORY_LABEL[c.category]}</span>
                  <span className={css.sevDots}>
                    {c.errorCount > 0 && <span className={`${css.sevDot} ${css.sevError}`} title={`${c.errorCount} error`}>{c.errorCount}</span>}
                    {c.warnCount > 0 && <span className={`${css.sevDot} ${css.sevWarn}`} title={`${c.warnCount} warning`}>{c.warnCount}</span>}
                    {c.infoCount > 0 && <span className={`${css.sevDot} ${css.sevInfo}`} title={`${c.infoCount} info`}>{c.infoCount}</span>}
                  </span>
                  <span className={css.statValue}>{c.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cost model */}
        <div className={css.bundle}>
          <div className={css.bundleHead}>
            <span className={css.bundleTitle}>Cost model</span>
            <span className={css.bundleCount}>{costModel.totalTypes} types</span>
          </div>
          <div className={css.bundleSub}>
            Total parametric range {fmtK(costModel.totalLow)} – {fmtK(costModel.totalHigh)}
          </div>
          {costModel.byCategory.length === 0 ? (
            <p className={css.empty}>No structures placed; cost model template still applies on placement.</p>
          ) : (
            <ul className={css.statList}>
              {costModel.byCategory.map((c) => (
                <li key={c.category} className={css.statRow}>
                  <span className={css.statLabel}>{STRUCTURE_CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className={css.statValue}>{c.count}</span>
                  <span className={css.statSub}>
                    {fmtK(c.totalLow)}–{fmtK(c.totalHigh)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className={css.footnote}>
        <em>Scope:</em> read-only inventory. Save-as-template, locking, and
        governance ship on manifest line 581
        (<code>template-duplication-locking-governance</code>) and remain
        follow-on work. Adjust weights via the Decision Support panel; rule
        catalog is canonical at{' '}
        <code>features/rules/SitingRules.ts</code>.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Bundle builders                                                    */
/* ------------------------------------------------------------------ */

interface RuleSetBundle {
  totalRules: number;
  preset: string | null;
  byCategory: { category: RuleWeightCategory; weight: number; ruleCount: number }[];
}

function buildRuleSetBundle(weights: WeightMap, _projectType: string | null): RuleSetBundle {
  const counts = new Map<RuleWeightCategory, number>();
  for (const cat of WEIGHT_CATEGORIES) counts.set(cat, 0);
  for (const r of RULE_CATALOG as RuleCatalogEntry[]) {
    counts.set(r.weightCategory, (counts.get(r.weightCategory) ?? 0) + 1);
  }
  const byCategory = WEIGHT_CATEGORIES.map((cat) => ({
    category: cat,
    weight: weights[cat],
    ruleCount: counts.get(cat) ?? 0,
  }));
  return {
    totalRules: RULE_CATALOG.length,
    preset: detectPreset(weights),
    byCategory,
  };
}

interface HotspotBundle {
  totalViolations: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  activeCategories: number;
  byCategory: {
    category: RuleCategory;
    total: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
  }[];
}

function buildHotspotBundle(
  project: LocalProject,
  structures: ReturnType<typeof useStructureStore.getState>['structures'],
  zones: ReturnType<typeof useZoneStore.getState>['zones'],
  paddocks: ReturnType<typeof useLivestockStore.getState>['paddocks'],
  crops: ReturnType<typeof useCropStore.getState>['cropAreas'],
  paths: ReturnType<typeof usePathStore.getState>['paths'],
  utilities: ReturnType<typeof useUtilityStore.getState>['utilities'],
): HotspotBundle {
  const violations: RuleViolation[] = evaluateRules({
    hasBoundary: project.hasParcelBoundary,
    structures: structures.filter((s) => s.projectId === project.id),
    zones:      zones.filter((z) => z.projectId === project.id),
    paddocks:   paddocks.filter((pk) => pk.projectId === project.id),
    crops:      crops.filter((c) => c.projectId === project.id),
    paths:      paths.filter((pa) => pa.projectId === project.id),
    utilities:  utilities.filter((u) => u.projectId === project.id),
    siteData: null,
    projectCenter: null,
    projectType: project.projectType,
  });

  const byCategoryMap = new Map<
    RuleCategory,
    { errorCount: number; warnCount: number; infoCount: number }
  >();
  let errorCount = 0, warnCount = 0, infoCount = 0;
  for (const v of violations) {
    const e = byCategoryMap.get(v.category) ?? { errorCount: 0, warnCount: 0, infoCount: 0 };
    if (v.severity === 'error')   { e.errorCount += 1; errorCount += 1; }
    else if (v.severity === 'warning') { e.warnCount += 1; warnCount += 1; }
    else                              { e.infoCount += 1; infoCount += 1; }
    byCategoryMap.set(v.category, e);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([category, v]) => ({
      category,
      total: v.errorCount + v.warnCount + v.infoCount,
      errorCount: v.errorCount,
      warnCount: v.warnCount,
      infoCount: v.infoCount,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalViolations: violations.length,
    errorCount, warnCount, infoCount,
    activeCategories: byCategory.length,
    byCategory,
  };
}

interface CostModelBundle {
  totalTypes: number;
  totalLow: number;
  totalHigh: number;
  byCategory: { category: string; count: number; totalLow: number; totalHigh: number }[];
}

function buildCostModelBundle(
  placed: ReturnType<typeof useStructureStore.getState>['structures'],
): CostModelBundle {
  const counts = new Map<string, { count: number; totalLow: number; totalHigh: number; types: Set<string> }>();
  for (const s of placed) {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    if (!tmpl) continue;
    const e = counts.get(tmpl.category) ?? { count: 0, totalLow: 0, totalHigh: 0, types: new Set<string>() };
    e.count += 1;
    e.totalLow += tmpl.costRange[0];
    e.totalHigh += tmpl.costRange[1];
    e.types.add(s.type);
    counts.set(tmpl.category, e);
  }

  let totalTypes = 0;
  let totalLow = 0;
  let totalHigh = 0;
  for (const v of counts.values()) {
    totalTypes += v.types.size;
    totalLow += v.totalLow;
    totalHigh += v.totalHigh;
  }

  const byCategory = [...counts.entries()]
    .map(([category, v]) => ({
      category, count: v.count, totalLow: v.totalLow, totalHigh: v.totalHigh,
    }))
    .sort((a, b) => b.totalHigh - a.totalHigh);

  return { totalTypes, totalLow, totalHigh, byCategory };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function prettyPreset(p: string): string {
  if (p === 'defaults') return 'Defaults';
  return p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyWeight(c: RuleWeightCategory): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function verdictClass(v: 'unknown' | 'work' | 'done'): string {
  if (v === 'unknown') return css.verdictUnknown!;
  if (v === 'work') return css.verdictWork!;
  return css.verdictDone!;
}
