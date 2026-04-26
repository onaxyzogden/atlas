/**
 * §21 WhatMustBeSolvedFirstCard — triage rollup of "what must be solved
 * first / what can wait."
 *
 * The Feasibility Checklist already on DecisionSupportPanel evaluates
 * quality once data exists, and MissingInformationChecklistCard inventories
 * what's missing. Neither answers the steward's actual sequencing question:
 * "of everything that's still open, what blocks me from advancing at all,
 * what blocks the next phase, and what can genuinely wait?" This card
 * buckets open items into First / Then / Eventually using a deterministic
 * blocking-tier per item, then surfaces them as an ordered triage list.
 *
 * Pure derivation — reads the same project + entity + site-data signals
 * that MissingInformationChecklistCard already pulls. No writes.
 *
 * Closes manifest §21 `what-must-be-solved-first` (P2) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './WhatMustBeSolvedFirstCard.module.css';

interface Props {
  project: LocalProject;
}

type Tier = 'first' | 'then' | 'eventually';

interface TriageItem {
  tier: Tier;
  label: string;
  detail: string;
  rationale: string;
  resolved: boolean;
}

const TIER_LABEL: Record<Tier, string> = {
  first: 'First',
  then: 'Then',
  eventually: 'Eventually',
};

const TIER_BLURB: Record<Tier, string> = {
  first: 'Without these, nothing downstream computes.',
  then: 'Blocks the next phase of design and feasibility.',
  eventually: 'Soft preferences and nice-to-haves — can wait.',
};

export default function WhatMustBeSolvedFirstCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const siteData = useSiteData(project.id);

  const items = useMemo<TriageItem[]>(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    const climate = siteData ? getLayerSummary(siteData, 'climate') : null;
    const elevation = siteData ? getLayerSummary(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary(siteData, 'soils') : null;
    const wetFlood = siteData ? getLayerSummary(siteData, 'wetlands_flood') : null;
    const watershed = siteData ? getLayerSummary(siteData, 'watershed') : null;

    const out: TriageItem[] = [];

    // ── First — site can't compute without these ───────────────────────
    out.push({
      tier: 'first',
      label: 'Parcel boundary',
      detail: project.hasParcelBoundary ? 'Boundary geometry on file.' : 'No boundary drawn or imported.',
      rationale: 'Every area, setback, and per-acre rollup keys off the parcel polygon.',
      resolved: !!project.hasParcelBoundary,
    });
    out.push({
      tier: 'first',
      label: 'Project type & intent',
      detail: project.projectType ? `Type: ${project.projectType}.` : 'Not selected.',
      rationale: 'Vision-fit thresholds and rule weights are project-type-specific.',
      resolved: !!project.projectType,
    });
    out.push({
      tier: 'first',
      label: 'Property acreage',
      detail: project.acreage ? `${project.acreage} ha on file.` : 'Not set.',
      rationale: 'Drives carrying capacity, biomass, and per-acre cost rollups.',
      resolved: !!project.acreage && project.acreage > 0,
    });
    out.push({
      tier: 'first',
      label: 'Tier-1 elevation layer',
      detail: elevation ? 'Elevation / slope tile loaded.' : 'Elevation not yet fetched.',
      rationale: 'Slope / aspect derives from the elevation tile; nothing terrain-aware works without it.',
      resolved: !!elevation,
    });

    // ── Then — blocks the next design phase ────────────────────────────
    out.push({
      tier: 'then',
      label: 'Tier-1 climate layer',
      detail: climate ? 'Climate tile loaded.' : 'Climate not yet fetched.',
      rationale: 'Hardiness zone and Köppen drive crop and structure suitability.',
      resolved: !!climate,
    });
    out.push({
      tier: 'then',
      label: 'Tier-1 soils layer',
      detail: soils ? 'Soil survey loaded.' : 'Soils not yet fetched.',
      rationale: 'Drainage and texture gate orchard, septic, and pad placement.',
      resolved: !!soils,
    });
    out.push({
      tier: 'then',
      label: 'Land zones',
      detail: zones.length >= 3 ? `${zones.length} zones placed.` : `${zones.length} zone${zones.length === 1 ? '' : 's'} — needs at least 3.`,
      rationale: 'Without ≥3 zones the land-use mix is ambiguous; vision fit cannot resolve.',
      resolved: zones.length >= 3,
    });
    out.push({
      tier: 'then',
      label: 'Main vehicle access',
      detail: paths.some((p) => p.type === 'main_road')
        ? 'Main road path drawn.'
        : paths.length > 0
          ? `${paths.length} secondary path${paths.length === 1 ? '' : 's'} — no main road designated.`
          : 'No paths drawn.',
      rationale: 'Phase-1 prerequisite — emergency, delivery, and farm access all hang off the main road.',
      resolved: paths.some((p) => p.type === 'main_road'),
    });
    out.push({
      tier: 'then',
      label: 'At least one structure',
      detail: structures.length > 0 ? `${structures.length} placed.` : 'None placed.',
      rationale: 'Habitable structures anchor septic, water, and shadow rules.',
      resolved: structures.length > 0,
    });

    // ── Eventually — soft preferences ──────────────────────────────────
    out.push({
      tier: 'eventually',
      label: 'Wetland / flood overlay',
      detail: wetFlood ? 'Loaded.' : 'Not fetched.',
      rationale: 'Refines siting risk near water; not blocking unless wet zones intersect placements.',
      resolved: !!wetFlood,
    });
    out.push({
      tier: 'eventually',
      label: 'Watershed layer',
      detail: watershed ? 'Loaded.' : 'Not fetched.',
      rationale: 'Drainage context — useful for water strategy refinement.',
      resolved: !!watershed,
    });
    out.push({
      tier: 'eventually',
      label: 'Utility coverage (≥3)',
      detail: utilities.length >= 3 ? `${utilities.length} placed.` : `${utilities.length} placed — ${3 - utilities.length} short of off-grid scoring threshold.`,
      rationale: 'Off-grid readiness needs water + energy + waste at minimum; defer until structures locked.',
      resolved: utilities.length >= 3,
    });

    return out;
  }, [allStructures, allZones, allPaths, allUtilities, siteData, project]);

  const open = useMemo(() => items.filter((i) => !i.resolved), [items]);
  const resolved = items.length - open.length;

  const counts = useMemo(() => {
    const c: Record<Tier, number> = { first: 0, then: 0, eventually: 0 };
    for (const it of open) c[it.tier] += 1;
    return c;
  }, [open]);

  const verdict =
    counts.first > 0
      ? { tone: 'block', label: `${counts.first} blocker${counts.first === 1 ? '' : 's'} — start here` }
      : counts.then > 0
        ? { tone: 'work', label: `Foundations clear — ${counts.then} item${counts.then === 1 ? '' : 's'} to land next` }
        : counts.eventually > 0
          ? { tone: 'easy', label: `Solid base — only soft items remain` }
          : { tone: 'done', label: 'Everything tracked is in place.' };

  const grouped: Record<Tier, TriageItem[]> = useMemo(() => {
    const g: Record<Tier, TriageItem[]> = { first: [], then: [], eventually: [] };
    for (const it of open) g[it.tier].push(it);
    return g;
  }, [open]);

  return (
    <section className={css.card} aria-label="What must be solved first">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>What must be solved first</h3>
          <p className={css.cardHint}>
            Open items triaged into <strong>First</strong> (blocks everything),{' '}
            <strong>Then</strong> (blocks the next phase), and{' '}
            <strong>Eventually</strong> (can wait). Resolved items roll into the closed pile
            on the right.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>
          {verdict.label}
        </div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={counts.first} label="first" tone="first" />
        <Headline value={counts.then} label="then" tone="then" />
        <Headline value={counts.eventually} label="eventually" tone="eventually" />
        <Headline value={resolved} label="closed" tone="closed" />
      </div>

      {open.length === 0 ? (
        <p className={css.empty}>
          {'\u2713'} All tracked feasibility inputs are in place — no triage items pending.
        </p>
      ) : (
        <div className={css.tierStack}>
          {(['first', 'then', 'eventually'] as Tier[]).map((tier) =>
            grouped[tier].length === 0 ? null : (
              <div key={tier} className={`${css.tier} ${css[`tier_${tier}`]}`}>
                <header className={css.tierHead}>
                  <span className={css.tierBadge}>{TIER_LABEL[tier]}</span>
                  <span className={css.tierBlurb}>{TIER_BLURB[tier]}</span>
                </header>
                <ul className={css.itemList}>
                  {grouped[tier].map((it, i) => (
                    <li key={`${tier}-${i}`} className={css.item}>
                      <div className={css.itemHead}>
                        <span className={css.itemLabel}>{it.label}</span>
                        <span className={css.itemDetail}>{it.detail}</span>
                      </div>
                      <p className={css.itemRationale}>{it.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}

      <p className={css.footnote}>
        Triage tiers are deterministic per item type {'\u2014'} they do not learn from the
        project. Resolve "First" before treating downstream feasibility as final.
      </p>
    </section>
  );
}

function Headline({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'first' | 'then' | 'eventually' | 'closed';
}) {
  return (
    <div className={`${css.headline} ${css[`headline_${tone}`]}`}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
