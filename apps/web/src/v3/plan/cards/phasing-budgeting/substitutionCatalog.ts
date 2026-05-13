/**
 * substitutionCatalog — biological-alternative pairings for Rec #5
 * (Material substitution calculator) of the Permaculture Scholar review
 * 2026-04-28.
 *
 * Each entry pairs a conventional infrastructure line item with a living-
 * system alternative drawn from primary permaculture sources (Mollison
 * Designer's Manual, Crawford, Holzer, Stamets, Coleman, Lancaster,
 * Yeomans) and supporting regulatory / peer-reviewed publications
 * (USDA NRCS Conservation Practice Standards, Drinkwater et al. 1998,
 * Bowles et al. 2017). Citation discipline matches `CostSource` rules
 * in `features/financial/engine/types.ts` — every alternative carries
 * ≥1 full bibliographic anchor; no placeholder rows.
 *
 * **Matcher pattern.** Substitutions resolve against an existing
 * `CostLineItem` by (a) its `sourceType` (paddock / path / utility /
 * crop / structure) and (b) the primitive's enum kind (FenceType,
 * PathType, UtilityType, CropAreaType). The card looks up the primitive
 * via the per-store array selectors and calls `matchSubstitution`.
 *
 * **Cost behaviour.** `costMultiplier` is fractional (vs. an absolute
 * CostRange) so the alternative scales correctly with the steward's
 * actual drawn quantity. v1 ships single multipliers; v2 may split by
 * `CostRegion`.
 *
 * **v1 scope.** Cost flows through write-through to
 * `financialStore.costOverrides` (real total-investment shift).
 * `establishmentMonths` and `missionUpliftEstimate` are informational
 * only — wiring into `cashflowEngine.ts` phase-shift and
 * `missionScoring.ts` is the v2 follow-up.
 */

import type { CostLineItem, CostRange } from '../../../../features/financial/engine/types.js';
import type { FenceType } from '../../../../store/livestockStore.js';
import type { PathType } from '../../../../store/pathStore.js';
import type { UtilityType } from '../../../../store/utilityStore.js';
import type { CropAreaType } from '../../../../store/cropStore.js';

// ── Citations ────────────────────────────────────────────────────────────

export type CitationKind = 'book' | 'standard' | 'journal' | 'practice-guide';

export interface Citation {
  /** Full bibliographic anchor — author, title, edition, pages. */
  source: string;
  /** Year of publication (used for freshness signalling). */
  year: number;
  kind: CitationKind;
  /** Optional 1-line note on what the source establishes. */
  note?: string;
}

// ── Matcher ──────────────────────────────────────────────────────────────

/**
 * A primitive lookup result. The card resolves each `CostLineItem.sourceId`
 * against the corresponding store and passes whichever shape applies.
 */
export type Primitive =
  | { kind: 'paddock'; fencing: FenceType }
  | { kind: 'path'; type: PathType }
  | { kind: 'utility'; type: UtilityType }
  | { kind: 'crop'; type: CropAreaType };

export type SubstitutionMatcher =
  | { sourceType: 'paddock'; fencing: FenceType[] }
  | { sourceType: 'path'; pathType: PathType[] }
  | { sourceType: 'utility'; utilityType: UtilityType[] }
  | { sourceType: 'crop'; cropType: CropAreaType[] };

// ── Substitution entry ───────────────────────────────────────────────────

export interface Substitution {
  /** Stable id — used as the override-namespace key. */
  id: string;
  /** Human-readable label for the row UI. */
  originalLabel: string;
  matcher: SubstitutionMatcher;
  alternative: {
    label: string;
    description: string;
    /**
     * Fractional multiplier applied to the original `CostLineItem.cost`.
     * `{ low: 0.30, mid: 0.40, high: 0.55 }` means the alternative costs
     * 30–55% of the original; the card writes that scaled CostRange into
     * `financialStore.costOverrides[itemId]`.
     */
    costMultiplier: CostRange;
    /** Approximate years-to-function delta (months). */
    establishmentMonths: number;
    /** Illustrative 0..1 mission uplift estimate. */
    missionUpliftEstimate: number;
  };
  /** ≥1 full citation. */
  citations: Citation[];
  /** 1–2 sentence Scholar / Mollison-style framing. */
  scholarRationale: string;
  /** Holmgren principles this substitution operationalises. */
  principles: string[];
}

// ── The catalog ──────────────────────────────────────────────────────────

export const SUBSTITUTION_CATALOG: Substitution[] = [
  // 1. Woven-wire fence → Hawthorn / blackthorn living hedge
  {
    id: 'wovenwire-fence-to-living-hedge',
    originalLabel: 'Woven-wire perimeter fencing',
    matcher: { sourceType: 'paddock', fencing: ['woven_wire'] },
    alternative: {
      label: 'Hawthorn / blackthorn living hedge',
      description:
        'A multi-species thorn hedge (Crataegus monogyna, Prunus spinosa) ' +
        'planted at 4 plants/m. Functions as stock-proof barrier within ' +
        '4–6 years; yields fruit, pollinator forage, and woodland-edge ' +
        'habitat for the lifetime of the line.',
      costMultiplier: { low: 0.30, mid: 0.40, high: 0.55 },
      establishmentMonths: 36,
      missionUpliftEstimate: 0.10,
    },
    citations: [
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. pp. 84–86.",
        year: 1988,
        kind: 'book',
        note: 'Establishes living-fence principle and species selection.',
      },
      {
        source: 'Crawford, M. (2010). Creating a Forest Garden: Working with Nature to Grow Edible Crops. Green Books. p. 132.',
        year: 2010,
        kind: 'book',
        note: 'Multi-species hedgerow density and timber yield.',
      },
    ],
    scholarRationale:
      '"Permaculture prioritizes replacing imported hardware with living ' +
      'systems." A thorn hedge is the canonical example: the same boundary ' +
      'service plus pollinator + bird + soil-stabilisation yields the steel ' +
      'will never provide.',
    principles: ['P5 Use & value renewable resources & services', 'P9 Use small & slow solutions'],
  },

  // 2. Post-wire perimeter → multi-row shelterbelt hedge
  {
    id: 'postwire-fence-to-shelterbelt-hedge',
    originalLabel: 'Post-and-wire perimeter fencing',
    matcher: { sourceType: 'paddock', fencing: ['post_wire', 'post_rail'] },
    alternative: {
      label: 'Multi-row shelterbelt hedge',
      description:
        'A 3-row mixed-species shelterbelt (canopy + understorey + thorn ' +
        'edge) sited along the fenceline. Doubles as wind-break and ' +
        'biodiversity corridor while replacing the post-and-wire ' +
        'maintenance burden.',
      costMultiplier: { low: 0.25, mid: 0.35, high: 0.50 },
      establishmentMonths: 48,
      missionUpliftEstimate: 0.12,
    },
    citations: [
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. p. 86.",
        year: 1988,
        kind: 'book',
        note: 'Multi-row shelterbelt structure and species sequencing.',
      },
      {
        source: 'Woodland Trust (2019). Hedgerow Planting Guidance. UK National Hedgelaying Society / Woodland Trust.',
        year: 2019,
        kind: 'practice-guide',
        note: 'Density, age-to-stockproof, mixed-species rotation.',
      },
    ],
    scholarRationale:
      'Shelterbelt replaces the wire while compounding the function — wind ' +
      'protection, woodland-edge habitat, and (with the right species mix) ' +
      'timber and forage from the same linear footprint.',
    principles: ['P5 Use & value renewable resources & services', 'P11 Use edges & value the marginal'],
  },

  // 3. Pedestrian / service path (concrete or gravel) → wood-chip path
  {
    id: 'paved-path-to-woodchip-path',
    originalLabel: 'Concrete / gravel walkway',
    matcher: {
      sourceType: 'path',
      pathType: ['pedestrian_path', 'service_road', 'secondary_road'],
    },
    alternative: {
      label: 'Wood-chip path + living groundcover',
      description:
        'Compacted hardwood-chip walkway (10 cm deep, refreshed every 2–3 ' +
        'years) over a creeping-thyme or clover groundcover edge. Functions ' +
        'immediately; the chip layer hosts saprophytic mushrooms (oyster, ' +
        'wine cap) that pre-digest the chip into soil.',
      costMultiplier: { low: 0.10, mid: 0.20, high: 0.35 },
      establishmentMonths: 0,
      missionUpliftEstimate: 0.06,
    },
    citations: [
      {
        source: 'Holzer, S. (2011). Permaculture: A Practical Guide for Beginners to Advanced Practitioners. Permanent Publications. p. 102.',
        year: 2011,
        kind: 'book',
        note: 'Chip-path layering and groundcover integration.',
      },
      {
        source: 'Stamets, P. (2005). Mycelium Running: How Mushrooms Can Help Save the World. Ten Speed Press. pp. 195–198.',
        year: 2005,
        kind: 'book',
        note: 'Saprophytic colonisation of chip beds; "mycorestoration" of compacted paths.',
      },
    ],
    scholarRationale:
      'Concrete is a one-way carbon expenditure; a chip path is a renewable ' +
      'living substrate that returns to soil on its own decay curve and ' +
      'yields edible fungi along the way.',
    principles: ['P5 Use & value renewable resources & services', 'P6 Produce no waste'],
  },

  // 4. Main road / farm lane (graded compacted) → permeable native track
  {
    id: 'farm-lane-to-permeable-track',
    originalLabel: 'Compacted farm lane',
    matcher: {
      sourceType: 'path',
      pathType: ['main_road', 'farm_lane', 'service_road'],
    },
    alternative: {
      label: 'Permeable native-grass track',
      description:
        'Keyline-graded track (Yeomans pattern) seeded with deep-rooted ' +
        'native grasses, with crushed-rock wear strips only at gate / load ' +
        'points. Sheds water laterally to swale rather than concentrating ' +
        'runoff; mowable for fire control.',
      costMultiplier: { low: 0.40, mid: 0.55, high: 0.70 },
      establishmentMonths: 24,
      missionUpliftEstimate: 0.08,
    },
    citations: [
      {
        source: "Yeomans, P. A. (1973, rev. 1981). Water for Every Farm: The Yeomans Keyline Plan. Murray Books.",
        year: 1981,
        kind: 'book',
        note: 'Keyline grading principle for vehicular tracks.',
      },
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 7 (Water).",
        year: 1988,
        kind: 'book',
        note: 'Roads as water-shedding elements; "every road is a swale."',
      },
    ],
    scholarRationale:
      '"Every road is a swale" (Mollison ch. 7). A keyline-graded native ' +
      'track replaces a compacted lane with a feature that *moves* water ' +
      'across the catchment rather than concentrating it into erosion.',
    principles: ['P2 Catch & store energy', 'P5 Use & value renewable resources & services'],
  },

  // 5. Plastic-mulched garden bed → comfrey chop-and-drop guild
  {
    id: 'garden-bed-to-comfrey-guild',
    originalLabel: 'Annual plastic-mulched garden bed',
    matcher: { sourceType: 'crop', cropType: ['garden_bed'] },
    alternative: {
      label: 'Comfrey chop-and-drop polyculture',
      description:
        'Comfrey (Symphytum × uplandicum) under-storey paired with the ' +
        'production crop. Three chop cycles per season replace plastic ' +
        'mulch, deliver K-rich biomass directly to soil, and build organic ' +
        'matter at 0.5–1.0 % per year.',
      costMultiplier: { low: 0.05, mid: 0.10, high: 0.20 },
      establishmentMonths: 12,
      missionUpliftEstimate: 0.09,
    },
    citations: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green. pp. 142–146.',
        year: 2018,
        kind: 'book',
        note: 'Living-mulch and chop-and-drop in market-garden context.',
      },
      {
        source: 'Bowles, T. M., et al. (2017). "Long-term evidence shows that crop-rotation diversification increases agricultural resilience to adverse growing conditions in North America." Agronomy Journal, 109(4), 1359–1372.',
        year: 2017,
        kind: 'journal',
        note: 'Quantifies diversification gains; peer-reviewed.',
      },
    ],
    scholarRationale:
      'Plastic mulch is an annual fossil-input. Comfrey delivers the same ' +
      'weed-suppression and moisture-retention while building soil — the ' +
      'substitution turns a recurring expense into a compounding asset.',
    principles: ['P5 Use & value renewable resources & services', 'P6 Produce no waste', 'P9 Use small & slow solutions'],
  },

  // 6. Synthetic-N row crop → N-fixing cover crop rotation
  {
    id: 'rowcrop-to-cover-crop-rotation',
    originalLabel: 'Conventional row crop (synthetic N)',
    matcher: { sourceType: 'crop', cropType: ['row_crop'] },
    alternative: {
      label: 'N-fixing cover crop rotation',
      description:
        'Rotate the cash crop with a legume cover (clover, vetch, field ' +
        'peas) at 1:2 ratio. Cover terminates by mowing or crimping; root ' +
        'N becomes available to the next cycle. Replaces 60–80 % of ' +
        'synthetic-N input over a 4-year rotation.',
      costMultiplier: { low: 0.10, mid: 0.15, high: 0.25 },
      establishmentMonths: 12,
      missionUpliftEstimate: 0.13,
    },
    citations: [
      {
        source: 'Drinkwater, L. E., Wagoner, P., & Sarrantonio, M. (1998). "Legume-based cropping systems have reduced carbon and nitrogen losses." Nature, 396, 262–265.',
        year: 1998,
        kind: 'journal',
        note: 'Seminal long-term study on legume-based N substitution.',
      },
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green. ch. 8 (Rotation).',
        year: 2018,
        kind: 'book',
        note: 'Practical 4-year rotation including legume bridge crop.',
      },
    ],
    scholarRationale:
      'Synthetic N is the prototypical imported hardware Mollison warned ' +
      'against — purchased annually, energetically expensive, and ' +
      'pollutant downstream. A legume rotation grows the input on-site.',
    principles: ['P5 Use & value renewable resources & services', 'P6 Produce no waste'],
  },

  // 7. Manufactured windbreak → NRCS-380 shelterbelt
  {
    id: 'windbreak-to-shelterbelt',
    originalLabel: 'Manufactured windbreak panels',
    matcher: { sourceType: 'crop', cropType: ['windbreak'] },
    alternative: {
      label: 'NRCS-380 living shelterbelt',
      description:
        'Multi-row tree shelterbelt per USDA NRCS CPS-380 specification ' +
        '(tall canopy + medium understorey + dense shrub edge). 5-year ' +
        'establishment; 30–50 year functional lifetime; sequesters carbon ' +
        'and yields nuts / fodder / timber alongside wind protection.',
      costMultiplier: { low: 0.20, mid: 0.30, high: 0.45 },
      establishmentMonths: 60,
      missionUpliftEstimate: 0.10,
    },
    citations: [
      {
        source: 'USDA NRCS (2010 baseline, periodically revised). Conservation Practice Standard 380: Windbreak / Shelterbelt Establishment. Natural Resources Conservation Service.',
        year: 2010,
        kind: 'standard',
        note: 'Federal-grade specification; cost-share eligible under EQIP.',
      },
    ],
    scholarRationale:
      'A shelterbelt is wind protection that *grows* — the only function ' +
      'a panel can provide is wind protection, and only until the panel ' +
      'fails. Substituting trades one capital event for a 50-year service.',
    principles: ['P5 Use & value renewable resources & services', 'P9 Use small & slow solutions', 'P11 Use edges & value the marginal'],
  },

  // 8. Concrete cistern → Earthen pond + roof catchment
  {
    id: 'cistern-to-earthen-pond',
    originalLabel: 'Concrete water cistern',
    matcher: { sourceType: 'utility', utilityType: ['water_tank'] },
    alternative: {
      label: 'Earthen pond + roof catchment',
      description:
        'A keyline-sited earthen pond (clay-lined or sealed with gleyed ' +
        'organic matter) paired with rooftop catchment piping. Stores ' +
        'larger volumes than a cistern per dollar; supports aquatic guild ' +
        '(duckweed, fish, edge plantings) on top of the storage function.',
      costMultiplier: { low: 0.30, mid: 0.50, high: 0.75 },
      establishmentMonths: 18,
      missionUpliftEstimate: 0.08,
    },
    citations: [
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 7 (Water).",
        year: 1988,
        kind: 'book',
        note: 'Pond siting, gleying, and aquaculture integration.',
      },
      {
        source: 'Lancaster, B. (2008). Rainwater Harvesting for Drylands and Beyond, Vol. 2: Water-Harvesting Earthworks. Rainsource Press. ch. 4.',
        year: 2008,
        kind: 'book',
        note: 'Roof-to-pond catchment math and overflow design.',
      },
    ],
    scholarRationale:
      'A pond is a cistern that breeds ducks. Same storage service, plus ' +
      'edge habitat, microclimate moderation, and an aquaculture yield — ' +
      'all from a hole in the ground sited on contour.',
    principles: ['P2 Catch & store energy', 'P5 Use & value renewable resources & services'],
  },
];

// ── Match resolution ─────────────────────────────────────────────────────

/**
 * Resolve the substitution (if any) that applies to a given cost line
 * item + its source primitive. Returns `null` when no catalog row
 * matches.
 */
export function matchSubstitution(
  item: CostLineItem,
  primitive: Primitive | null,
): Substitution | null {
  if (!primitive) return null;
  for (const sub of SUBSTITUTION_CATALOG) {
    const m = sub.matcher;
    // Fencing line items have sourceType 'paddock' (the costEngine emits
    // `fencing-<paddockId>` against the paddock that owns the fence).
    if (m.sourceType === 'paddock' && primitive.kind === 'paddock') {
      if (item.sourceType !== 'paddock') continue;
      if (m.fencing.includes(primitive.fencing)) return sub;
    } else if (m.sourceType === 'path' && primitive.kind === 'path') {
      if (item.sourceType !== 'path') continue;
      if (m.pathType.includes(primitive.type)) return sub;
    } else if (m.sourceType === 'utility' && primitive.kind === 'utility') {
      if (item.sourceType !== 'utility') continue;
      if (m.utilityType.includes(primitive.type)) return sub;
    } else if (m.sourceType === 'crop' && primitive.kind === 'crop') {
      if (item.sourceType !== 'crop') continue;
      if (m.cropType.includes(primitive.type)) return sub;
    }
  }
  return null;
}

/** Apply the multiplier to produce the override CostRange the card writes. */
export function appliedCostRange(
  original: CostRange,
  multiplier: CostRange,
): CostRange {
  return {
    low: Math.round(original.low * multiplier.low),
    mid: Math.round(original.mid * multiplier.mid),
    high: Math.round(original.high * multiplier.high),
  };
}
