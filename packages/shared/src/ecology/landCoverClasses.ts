/**
 * landCoverClasses — canonical Atlas land-cover class set + per-source
 * mappings from NLCD / AAFC ACI / ESA WorldCover native class IDs.
 *
 * Per ADR 2026-05-04-pollinator-corridor-hybrid-landcover (Phase 8.1-A.1).
 * The pollinator habitat weight tables in `pollinatorHabitat.ts` (and
 * the corridor-friction model in 8.1-B) consume canonical Atlas class
 * names — strings like 'Grassland/Herbaceous', 'Cultivated Crops'.
 * Each source adapter normalises its native classes to this canonical
 * set before returning features to the pipeline; downstream consumers
 * never see a raw NLCD code or a WorldCover bit.
 *
 * Naming alignment:
 *   The canonical names are deliberately NLCD-style (Anderson Level II)
 *   because:
 *     1. The existing weight tables already use those exact strings,
 *     2. NLCD is the most class-rich of the three sources,
 *     3. WorldCover's coarseness is the limiting factor — its 11
 *        classes are the floor, not the ceiling.
 *   ACI's ~70 classes collapse cleanly into NLCD-shaped buckets;
 *   WorldCover's 11 expand to the same buckets at a lossy rate
 *   (e.g. its single "Cropland" class becomes a `Crops (unspecified)`
 *   bucket that the friction model treats as moderate-friction).
 *
 * Vintage / licence metadata is carried by the adapter, not by this
 * file — keep this module pure shape + class-string mapping.
 */

/**
 * Canonical Atlas land-cover class identifiers. Subset of NLCD 2019
 * Anderson Level II names plus three buckets WorldCover forces:
 *   - `Crops (unspecified)` — WorldCover collapses Annual / Pasture / Hay
 *   - `Built-up (unspecified)` — WorldCover collapses Developed * intensity
 *   - `Wetland (unspecified)` — WorldCover collapses Woody / Herbaceous
 *
 * The per-source mapping below targets these strings; the
 * pollinator-habitat weight tables already key on the same strings.
 */
export type CanonicalLandCoverClass =
  | 'Open Water'
  | 'Perennial Ice/Snow'
  | 'Developed, Open Space'
  | 'Developed, Low Intensity'
  | 'Developed, Medium Intensity'
  | 'Developed, High Intensity'
  | 'Built-up (unspecified)'
  | 'Barren Land'
  | 'Deciduous Forest'
  | 'Evergreen Forest'
  | 'Mixed Forest'
  | 'Forest'
  | 'Shrub/Scrub'
  | 'Grassland/Herbaceous'
  | 'Pasture'
  | 'Hay/Pasture'
  | 'Cultivated Crops'
  | 'Annual Crops'
  | 'Crops (unspecified)'
  | 'Orchard'
  | 'Vineyard'
  | 'Hedgerow'
  | 'Woody Wetlands'
  | 'Herbaceous Wetlands'
  | 'Wetland (unspecified)'
  | 'Mangrove'
  | 'Moss/Lichen'
  | 'Unknown';

export interface CanonicalLandCoverClassMeta {
  /** True if class is recognised as supportive in pollinator weights. */
  pollinatorSupportive: boolean;
  /** True if class is recognised as limiting in pollinator weights. */
  pollinatorLimiting: boolean;
  /** True if class lost fidelity by mapping to a `(unspecified)` bucket. */
  unspecifiedBucket: boolean;
}

/**
 * Class-level metadata flags. Keys are CanonicalLandCoverClass; consumers
 * (corridor-friction, diagnosis report) can inspect this without
 * round-tripping through the weight tables.
 */
export const CANONICAL_LAND_COVER_META: Record<CanonicalLandCoverClass, CanonicalLandCoverClassMeta> = {
  'Open Water':                  { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Perennial Ice/Snow':          { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Developed, Open Space':       { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Developed, Low Intensity':    { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Developed, Medium Intensity': { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Developed, High Intensity':   { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Built-up (unspecified)':      { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: true  },
  'Barren Land':                 { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Deciduous Forest':            { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Evergreen Forest':            { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Mixed Forest':                { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Forest':                      { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: true  },
  'Shrub/Scrub':                 { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Grassland/Herbaceous':        { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Pasture':                     { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Hay/Pasture':                 { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Cultivated Crops':            { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Annual Crops':                { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: false },
  'Crops (unspecified)':         { pollinatorSupportive: false, pollinatorLimiting: true,  unspecifiedBucket: true  },
  'Orchard':                     { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Vineyard':                    { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Hedgerow':                    { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Woody Wetlands':              { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Herbaceous Wetlands':         { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Wetland (unspecified)':       { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: true  },
  'Mangrove':                    { pollinatorSupportive: true,  pollinatorLimiting: false, unspecifiedBucket: false },
  'Moss/Lichen':                 { pollinatorSupportive: false, pollinatorLimiting: false, unspecifiedBucket: false },
  'Unknown':                     { pollinatorSupportive: false, pollinatorLimiting: false, unspecifiedBucket: true  },
};

/**
 * NLCD 2019/2021 class code → canonical Atlas class.
 * Source: https://www.mrlc.gov/data/legends/national-land-cover-database-2019-nlcd2019-legend
 * 16 classes; 11/12 (Perennial Ice/Snow) only present in Alaska.
 */
export const NLCD_TO_CANONICAL: Record<number, CanonicalLandCoverClass> = {
  11: 'Open Water',
  12: 'Perennial Ice/Snow',
  21: 'Developed, Open Space',
  22: 'Developed, Low Intensity',
  23: 'Developed, Medium Intensity',
  24: 'Developed, High Intensity',
  31: 'Barren Land',
  41: 'Deciduous Forest',
  42: 'Evergreen Forest',
  43: 'Mixed Forest',
  52: 'Shrub/Scrub',
  71: 'Grassland/Herbaceous',
  81: 'Hay/Pasture',
  82: 'Cultivated Crops',
  90: 'Woody Wetlands',
  95: 'Herbaceous Wetlands',
};

/**
 * AAFC Annual Crop Inventory class code → canonical Atlas class.
 * Source: https://open.canada.ca/data/en/dataset/ba2645d5-4458-414d-b196-6303ac06c1c9
 * ~70 classes; we map the agriculturally-significant ones to the
 * canonical set with full fidelity, and lump rare/unmapped classes
 * (saline, low-vegetation barrens) into 'Barren Land' or 'Unknown'.
 *
 * Annual crops (122 onwards) all collapse to 'Annual Crops' for
 * pollinator-friction purposes; if a downstream consumer needs the
 * specific crop type, it can read raw_attributes on the feature.
 */
export const ACI_TO_CANONICAL: Record<number, CanonicalLandCoverClass> = {
  // Non-agricultural
  20:  'Open Water',
  30:  'Barren Land',
  34:  'Barren Land',                  // Rock/rubble
  35:  'Moss/Lichen',                  // Tundra-heath / lichen-moss
  50:  'Shrub/Scrub',
  80:  'Wetland (unspecified)',        // Wetland (general)
  81:  'Woody Wetlands',               // Treed wetland
  82:  'Herbaceous Wetlands',          // Herbaceous wetland
  83:  'Woody Wetlands',               // Shrubby wetland (treat as woody)
  100: 'Grassland/Herbaceous',         // Grassland (managed)
  110: 'Grassland/Herbaceous',         // Grassland (unmanaged)
  120: 'Annual Crops',                 // Agriculture (undifferentiated)

  // Forests
  210: 'Evergreen Forest',             // Coniferous
  220: 'Deciduous Forest',             // Broadleaf
  230: 'Mixed Forest',

  // Annual crops — all collapse to 'Annual Crops'
  122: 'Annual Crops',
  130: 'Pasture',                      // Pasture / forages
  131: 'Pasture',                      // Pasture / forage land
  132: 'Pasture',                      // Grassland (managed pasture)
  133: 'Pasture',                      // Native grasses
  134: 'Pasture',                      // Pasture / fodder
  135: 'Pasture',
  136: 'Pasture',
  137: 'Pasture',
  138: 'Pasture',
  139: 'Pasture',

  140: 'Annual Crops',
  145: 'Annual Crops',
  146: 'Annual Crops',
  147: 'Annual Crops',                 // Corn
  148: 'Annual Crops',
  149: 'Annual Crops',
  150: 'Annual Crops',
  151: 'Annual Crops',
  152: 'Annual Crops',
  153: 'Annual Crops',                 // Soybeans
  154: 'Annual Crops',
  155: 'Annual Crops',
  156: 'Annual Crops',
  157: 'Annual Crops',
  158: 'Annual Crops',
  160: 'Annual Crops',
  162: 'Annual Crops',                 // Barley
  167: 'Annual Crops',                 // Millet
  174: 'Annual Crops',
  175: 'Annual Crops',                 // Triticale
  176: 'Annual Crops',
  177: 'Annual Crops',                 // Sunflower
  178: 'Annual Crops',
  180: 'Annual Crops',
  181: 'Annual Crops',
  182: 'Annual Crops',                 // Canola/rapeseed
  183: 'Annual Crops',
  185: 'Annual Crops',
  188: 'Annual Crops',
  189: 'Annual Crops',
  190: 'Annual Crops',
  192: 'Annual Crops',
  193: 'Annual Crops',
  194: 'Annual Crops',
  195: 'Annual Crops',
  196: 'Annual Crops',
  197: 'Annual Crops',
  198: 'Annual Crops',
  199: 'Annual Crops',

  200: 'Annual Crops',                 // Cereals
  202: 'Annual Crops',                 // Spring wheat
  203: 'Annual Crops',                 // Winter wheat

  // Perennial / orchard
  170: 'Annual Crops',                 // Pulses (legumes, treated as annual)
  171: 'Annual Crops',
  240: 'Orchard',
  241: 'Orchard',                      // Apples
  242: 'Orchard',                      // Stone fruit
  243: 'Orchard',
  244: 'Orchard',
  245: 'Orchard',
  246: 'Orchard',
  247: 'Vineyard',
  248: 'Orchard',                      // Berries
  249: 'Orchard',                      // Nursery
  250: 'Orchard',                      // Greenhouses (treated as horticulture)

  // Built-up
  37:  'Developed, Open Space',        // Roads/trails (open)
  38:  'Developed, Low Intensity',
  39:  'Developed, Medium Intensity',
  40:  'Developed, High Intensity',
  41:  'Built-up (unspecified)',       // Settlements (general)
};

/**
 * ESA WorldCover 2020/2021 class code → canonical Atlas class.
 * Source: https://esa-worldcover.org/en
 * 11 classes. WorldCover's coarseness is the limiting factor; classes
 * marked unspecifiedBucket=true reflect honest information loss.
 */
export const WORLDCOVER_TO_CANONICAL: Record<number, CanonicalLandCoverClass> = {
  10: 'Forest',                  // Tree cover (mixed)
  20: 'Shrub/Scrub',             // Shrubland
  30: 'Grassland/Herbaceous',
  40: 'Crops (unspecified)',     // Cropland
  50: 'Built-up (unspecified)',
  60: 'Barren Land',             // Bare / sparse vegetation
  70: 'Perennial Ice/Snow',      // Snow and ice
  80: 'Open Water',              // Permanent water bodies
  90: 'Wetland (unspecified)',   // Herbaceous wetland
  95: 'Mangrove',
  100: 'Moss/Lichen',
};

export type LandCoverSource = 'NLCD' | 'ACI' | 'WorldCover';

/**
 * Per-source licence shorthand carried on each feature for diagnosis-report
 * attribution. Per ADR 2026-05-04-pollinator-corridor-hybrid-landcover §3.
 */
export const LAND_COVER_LICENCE: Record<LandCoverSource, string> = {
  NLCD:        'USGS-PD',
  ACI:         'OGL-CA-2.0',
  WorldCover:  'CC-BY-4.0',
};

/**
 * Translate a source-native class code into the canonical Atlas class.
 * Returns 'Unknown' for codes not in the per-source mapping table.
 *
 * Adapter authors call this once per polygonised feature before writing
 * out to the pipeline; downstream consumers (`pollinatorHabitat.ts`,
 * corridor-friction model, diagnosis report) only see the canonical
 * value.
 */
export function toCanonicalLandCoverClass(
  source: LandCoverSource,
  nativeClassCode: number,
): CanonicalLandCoverClass {
  const table =
    source === 'NLCD'       ? NLCD_TO_CANONICAL
    : source === 'ACI'      ? ACI_TO_CANONICAL
    : WORLDCOVER_TO_CANONICAL;
  return table[nativeClassCode] ?? 'Unknown';
}
