/**
 * §12 OrchardGuildSuggestionsCard — classic permaculture guild matches
 * for perennial crop areas.
 *
 * The existing `CompanionRotationPlannerCard` covers annuals (row_crop,
 * garden_bed, market_garden) with a 4-year rotation lens. This card
 * complements it by handling perennials (orchard, food_forest,
 * silvopasture) where rotation doesn't apply but companion guilds do.
 *
 * For each perennial crop area:
 *   - Match each species[] entry to an "anchor" via keyword scan
 *     (e.g., "apple", "pear", "peach", "walnut", "chestnut", "fig",
 *     "blueberry", "elderberry", "hazel")
 *   - Look up the canonical permaculture guild for that anchor from
 *     a static library (nitrogen-fixer, nutrient-accumulator,
 *     pest-deterrent, ground-cover, pollinator-attractor)
 *   - Detect which guild slots are already filled by the area's other
 *     species[] entries
 *   - Surface the missing slots as suggestions
 *
 * Heuristic only — sized as a steward checklist. Static library is
 * v1; future iterations could pull from a community database.
 *
 * Spec mapping: §12 `orchard-row-garden-foodforest-placement` (P2,
 * partial → done). Mounted on `PlantingToolDashboard` after
 * `CompanionRotationPlannerCard`.
 */

import { useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import s from './OrchardGuildSuggestionsCard.module.css';

interface OrchardGuildSuggestionsCardProps {
  projectId: string;
}

const PERENNIAL_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard',
  'food_forest',
  'silvopasture',
]);

type GuildRole = 'n_fixer' | 'accumulator' | 'pest_deterrent' | 'ground_cover' | 'pollinator';

const ROLE_LABEL: Record<GuildRole, string> = {
  n_fixer: 'Nitrogen-fixer',
  accumulator: 'Dynamic accumulator',
  pest_deterrent: 'Pest-deterrent',
  ground_cover: 'Ground cover / mulch maker',
  pollinator: 'Pollinator attractor',
};

const ROLE_BLURB: Record<GuildRole, string> = {
  n_fixer: 'Builds soil nitrogen and reduces fertilizer dependency.',
  accumulator: 'Mines minerals from deeper soil layers via taproots; chop-and-drop releases them.',
  pest_deterrent: 'Repels common orchard pests via aroma or alkaloids.',
  ground_cover: 'Suppresses weeds, holds moisture, and feeds the chop-and-drop mulch loop.',
  pollinator: 'Brings pollinators in during the anchor\'s flowering window.',
};

interface GuildLibraryEntry {
  /** Canonical anchor label shown in the UI. */
  anchor: string;
  /** Lowercase keywords that match the anchor in steward-entered species text. */
  matches: string[];
  /** Suggested companions for each guild role. Multiple options per role. */
  guild: Partial<Record<GuildRole, string[]>>;
}

/**
 * Static guild library v1 — drawn from the standard permaculture
 * orchard guild canon (Hemenway, Jacke, Toensmeier). Each entry lists
 * 2-4 plant options per role so stewards have substitutions if a
 * suggestion isn't available locally.
 */
const GUILD_LIBRARY: readonly GuildLibraryEntry[] = [
  {
    anchor: 'Apple',
    matches: ['apple', 'malus'],
    guild: {
      n_fixer: ['Goumi', 'Sea buckthorn', 'Dutch white clover'],
      accumulator: ['Comfrey', 'Yarrow', 'Borage'],
      pest_deterrent: ['Chives', 'Garlic', 'Tansy'],
      ground_cover: ['Strawberry', 'Wild ginger', 'Sweet woodruff'],
      pollinator: ['Borage', 'Lemon balm', 'Hyssop'],
    },
  },
  {
    anchor: 'Pear',
    matches: ['pear', 'pyrus'],
    guild: {
      n_fixer: ['Goumi', 'Autumn olive', 'Dutch white clover'],
      accumulator: ['Comfrey', 'Yarrow', 'Dandelion'],
      pest_deterrent: ['Chives', 'Nasturtium'],
      ground_cover: ['Strawberry', 'Sweet woodruff'],
      pollinator: ['Borage', 'Bee balm'],
    },
  },
  {
    anchor: 'Peach / Plum / Cherry',
    matches: ['peach', 'plum', 'cherry', 'apricot', 'nectarine', 'prunus'],
    guild: {
      n_fixer: ['Goumi', 'Siberian pea shrub', 'Lupine'],
      accumulator: ['Comfrey', 'Borage', 'Dandelion'],
      pest_deterrent: ['Garlic chives', 'Tansy', 'Marigold'],
      ground_cover: ['Strawberry', 'Creeping thyme'],
      pollinator: ['Borage', 'Phacelia'],
    },
  },
  {
    anchor: 'Walnut / Hickory',
    matches: ['walnut', 'hickory', 'pecan', 'juglans', 'carya'],
    guild: {
      n_fixer: ['Black locust', 'Autumn olive'],
      accumulator: ['Comfrey'],
      pest_deterrent: ['Elderberry'],
      ground_cover: ['Pawpaw understory', 'Currants (juglone-tolerant)'],
      pollinator: ['Bee balm'],
    },
  },
  {
    anchor: 'Chestnut',
    matches: ['chestnut', 'castanea'],
    guild: {
      n_fixer: ['Black locust', 'Goumi'],
      accumulator: ['Comfrey', 'Yarrow'],
      pest_deterrent: ['Daffodil bulbs (vole deterrent)'],
      ground_cover: ['Wild strawberry', 'White clover'],
      pollinator: ['Linden', 'Bee balm'],
    },
  },
  {
    anchor: 'Fig',
    matches: ['fig', 'ficus'],
    guild: {
      n_fixer: ['White clover', 'Goumi'],
      accumulator: ['Comfrey', 'Borage'],
      pest_deterrent: ['Rosemary', 'Lavender'],
      ground_cover: ['Strawberry', 'Creeping thyme'],
      pollinator: ['Lavender', 'Lemon balm'],
    },
  },
  {
    anchor: 'Blueberry',
    matches: ['blueberry', 'huckleberry', 'vaccinium'],
    guild: {
      n_fixer: ['Lupine', 'Bayberry'],
      accumulator: ['Pine needle mulch (acidic chop-and-drop)'],
      pest_deterrent: ['Mountain mint'],
      ground_cover: ['Lingonberry', 'Wintergreen'],
      pollinator: ['Sourwood', 'Bee balm'],
    },
  },
  {
    anchor: 'Elderberry / Currant / Berry shrub',
    matches: ['elderberry', 'sambucus', 'currant', 'gooseberry', 'ribes', 'aronia'],
    guild: {
      n_fixer: ['Comfrey root nurse', 'White clover'],
      accumulator: ['Comfrey', 'Yarrow'],
      pest_deterrent: ['Garlic chives', 'Mountain mint'],
      ground_cover: ['Strawberry', 'Sweet woodruff'],
      pollinator: ['Borage'],
    },
  },
  {
    anchor: 'Hazel / Filbert',
    matches: ['hazel', 'filbert', 'corylus'],
    guild: {
      n_fixer: ['Siberian pea shrub', 'Goumi'],
      accumulator: ['Comfrey'],
      pest_deterrent: ['Daffodil bulbs'],
      ground_cover: ['Strawberry', 'Wild ginger'],
      pollinator: ['Bee balm', 'Borage'],
    },
  },
  {
    anchor: 'Mulberry',
    matches: ['mulberry', 'morus'],
    guild: {
      n_fixer: ['Goumi', 'White clover'],
      accumulator: ['Comfrey', 'Yarrow'],
      pest_deterrent: ['Chives'],
      ground_cover: ['Strawberry'],
      pollinator: ['Bee balm', 'Borage'],
    },
  },
];

interface AreaGuildAnalysis {
  area: CropArea;
  anchors: AnchorMatch[];
  unmatched: string[];
}

interface AnchorMatch {
  anchor: string;
  matchedFrom: string;
  filledRoles: GuildRole[];
  missingRoles: { role: GuildRole; suggestions: string[] }[];
}

function findAnchor(rawSpecies: string): GuildLibraryEntry | null {
  const lower = rawSpecies.toLowerCase();
  for (const entry of GUILD_LIBRARY) {
    if (entry.matches.some((kw) => lower.includes(kw))) return entry;
  }
  return null;
}

function speciesFillsRole(allSpecies: string[], suggestions: readonly string[]): boolean {
  const haystack = allSpecies.map((sp) => sp.toLowerCase());
  return suggestions.some((sug) => {
    const sugLower = sug.toLowerCase();
    // Match on the leading word so "Comfrey" matches "Russian comfrey"
    // and "comfrey root nurse"; avoids matching "white clover" against
    // a literal "Comfrey".
    const head = sugLower.split(/[\s/(]/)[0] ?? sugLower;
    return haystack.some((h) => h.includes(head));
  });
}

export default function OrchardGuildSuggestionsCard({ projectId }: OrchardGuildSuggestionsCardProps) {
  const allCrops = useCropStore((st) => st.cropAreas);

  const analysis = useMemo<AreaGuildAnalysis[]>(() => {
    const perennials = allCrops.filter(
      (c) => c.projectId === projectId && PERENNIAL_TYPES.has(c.type),
    );
    return perennials.map((area) => {
      const allSpecies = area.species.map((sp) => sp.trim()).filter(Boolean);
      const anchorMatches: AnchorMatch[] = [];
      const unmatched: string[] = [];
      const seenAnchors = new Set<string>();

      for (const sp of allSpecies) {
        const entry = findAnchor(sp);
        if (!entry) {
          unmatched.push(sp);
          continue;
        }
        if (seenAnchors.has(entry.anchor)) continue;
        seenAnchors.add(entry.anchor);

        const filled: GuildRole[] = [];
        const missing: { role: GuildRole; suggestions: string[] }[] = [];

        for (const roleStr of Object.keys(entry.guild) as GuildRole[]) {
          const suggestions = entry.guild[roleStr] ?? [];
          if (suggestions.length === 0) continue;
          if (speciesFillsRole(allSpecies, suggestions)) {
            filled.push(roleStr);
          } else {
            missing.push({ role: roleStr, suggestions: suggestions.slice(0, 3) });
          }
        }

        anchorMatches.push({
          anchor: entry.anchor,
          matchedFrom: sp,
          filledRoles: filled,
          missingRoles: missing,
        });
      }

      return { area, anchors: anchorMatches, unmatched };
    });
  }, [allCrops, projectId]);

  if (analysis.length === 0) {
    return null;
  }

  const totals = analysis.reduce(
    (acc, a) => {
      acc.areas += 1;
      acc.anchors += a.anchors.length;
      for (const ar of a.anchors) {
        acc.filled += ar.filledRoles.length;
        acc.missing += ar.missingRoles.length;
      }
      return acc;
    },
    { areas: 0, anchors: 0, filled: 0, missing: 0 },
  );

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Orchard guild suggestions</h3>
          <p className={s.hint}>
            Classic permaculture guild matches for each perennial anchor (orchard /
            food forest / silvopasture). Per-area readout of which guild roles are
            already filled and which species would round out the planting.
          </p>
        </div>
        <span className={s.badge}>
          {totals.anchors} anchors · {totals.filled} filled · {totals.missing} suggested
        </span>
      </div>

      <ul className={s.areaList}>
        {analysis.map((a) => (
          <li key={a.area.id} className={s.area}>
            <div className={s.areaHead}>
              <span className={s.areaName}>{a.area.name}</span>
              <span className={s.areaMeta}>
                {a.area.type.replace(/_/g, ' ')} · {a.area.species.length} species
              </span>
            </div>

            {a.anchors.length === 0 ? (
              <p className={s.noAnchor}>
                No recognized anchor species in the library yet
                {a.unmatched.length > 0 && (
                  <> — entered: {a.unmatched.join(', ')}</>
                )}
                . Library v1 covers temperate stone fruit, pome, nut, and berry shrubs.
              </p>
            ) : (
              <div className={s.anchorList}>
                {a.anchors.map((ar, i) => (
                  <div key={i} className={s.anchor}>
                    <div className={s.anchorHead}>
                      <span className={s.anchorTitle}>{ar.anchor}</span>
                      <span className={s.anchorMatched}>matched on "{ar.matchedFrom}"</span>
                    </div>

                    {ar.filledRoles.length > 0 && (
                      <div className={s.filledRow}>
                        <span className={s.filledLabel}>Filled:</span>
                        {ar.filledRoles.map((r) => (
                          <span key={r} className={s.chip}>{ROLE_LABEL[r]}</span>
                        ))}
                      </div>
                    )}

                    {ar.missingRoles.length > 0 ? (
                      <ul className={s.missingList}>
                        {ar.missingRoles.map((m) => (
                          <li key={m.role} className={s.missing}>
                            <div className={s.missingHead}>
                              <span className={s.missingRole}>{ROLE_LABEL[m.role]}</span>
                              <span className={s.missingBlurb}>{ROLE_BLURB[m.role]}</span>
                            </div>
                            <div className={s.suggestionRow}>
                              {m.suggestions.map((sug, si) => (
                                <span key={si} className={s.suggestion}>{sug}</span>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={s.complete}>All five guild roles already represented in this area.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        Suggestion library v1 — covers temperate fruit, nut, and berry anchors
        (apple, pear, stone fruit, walnut, chestnut, fig, blueberry, elderberry,
        hazel, mulberry). Static lookup only; not a regional plant database.
        Substitutions and additions are expected as the project's species mix
        matures.
      </p>
    </div>
  );
}
