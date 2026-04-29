/**
 * Market garden bundles — preset crop families for the market_garden popup.
 *
 * Market gardens use bed-and-path geometry rather than the square-grid spacing
 * that suits orchards. Each bundle bakes in representative in-row spacing,
 * standard bed/path widths, and a default water demand class so the popup can
 * compute plant counts and irrigation needs without forcing the user to enter
 * raw geometry. The rotation family is consumed by CompanionRotationPlannerCard
 * to override its keyword-based family inference for bundle-driven beds.
 */

export type RotationFamily = 'legume' | 'brassica' | 'solanum' | 'root' | 'mixed';

export interface MarketGardenBundle {
  id: string;
  label: string;
  icon: string;
  spacingM: number;
  bedWidthM: number;
  pathWidthM: number;
  waterDemand: 'low' | 'medium' | 'high';
  rotationFamily: RotationFamily;
  description: string;
}

export const MARKET_GARDEN_BUNDLES: MarketGardenBundle[] = [
  {
    id: 'mixed',
    label: 'Mixed Bed (default)',
    icon: '\u{1F331}',
    spacingM: 0.30,
    bedWidthM: 0.75,
    pathWidthM: 0.45,
    waterDemand: 'medium',
    rotationFamily: 'mixed',
    description: 'Generic mixed annual vegetable bed',
  },
  {
    id: 'salad_mix',
    label: 'Salad Mix (greens)',
    icon: '\u{1F96C}',
    spacingM: 0.10,
    bedWidthM: 0.75,
    pathWidthM: 0.45,
    waterDemand: 'high',
    rotationFamily: 'mixed',
    description: 'Lettuce, arugula, spinach — high-density succession',
  },
  {
    id: 'brassica',
    label: 'Brassica Rotation',
    icon: '\u{1F966}',
    spacingM: 0.45,
    bedWidthM: 0.75,
    pathWidthM: 0.45,
    waterDemand: 'medium',
    rotationFamily: 'brassica',
    description: 'Kale, broccoli, cabbage — Year 2 of 4-yr rotation',
  },
  {
    id: 'roots',
    label: 'Root Crops',
    icon: '\u{1F955}',
    spacingM: 0.08,
    bedWidthM: 0.75,
    pathWidthM: 0.45,
    waterDemand: 'medium',
    rotationFamily: 'root',
    description: 'Carrots, beets, radish',
  },
  {
    id: 'solanum',
    label: 'Solanaceae (Tomatoes)',
    icon: '\u{1F345}',
    spacingM: 0.60,
    bedWidthM: 0.90,
    pathWidthM: 0.60,
    waterDemand: 'high',
    rotationFamily: 'solanum',
    description: 'Tomato, pepper, eggplant — trellised',
  },
  {
    id: 'legume',
    label: 'Legume Cover',
    icon: '\u{1FAD8}',
    spacingM: 0.15,
    bedWidthM: 0.75,
    pathWidthM: 0.45,
    waterDemand: 'low',
    rotationFamily: 'legume',
    description: 'Beans, peas — N-fixer, often pre-brassica',
  },
];

export const MARKET_GARDEN_BUNDLES_BY_ID: Record<string, MarketGardenBundle> = Object.fromEntries(
  MARKET_GARDEN_BUNDLES.map((b) => [b.id, b]),
);

/** Assumed bed length (m) for "how many beds fit in this area" estimates. */
export const ASSUMED_BED_LENGTH_M = 30;

export interface MarketGardenGeometry {
  plantCount: number;
  bedCount: number;
  bedAreaM2: number;
}

/**
 * Estimate plant count and bed count from a polygon area + bundle.
 *
 * Beds occupy `bedWidth / (bedWidth + pathWidth)` of the polygon footprint;
 * the rest is walking paths. Plants are placed on a square grid at
 * `bundle.spacingM`. Bed count uses `bedLengthM` when provided, otherwise
 * falls back to the nominal `ASSUMED_BED_LENGTH_M` (30 m).
 */
export function computeMarketGardenGeometry(
  areaM2: number,
  bundle: MarketGardenBundle,
  bedLengthM?: number,
): MarketGardenGeometry {
  if (areaM2 <= 0 || bundle.spacingM <= 0) {
    return { plantCount: 0, bedCount: 0, bedAreaM2: 0 };
  }
  const bedFraction = bundle.bedWidthM / (bundle.bedWidthM + bundle.pathWidthM);
  const bedAreaM2 = areaM2 * bedFraction;
  const plantsPerM2 = 1 / (bundle.spacingM * bundle.spacingM);
  const plantCount = Math.floor(bedAreaM2 * plantsPerM2);
  const effectiveBedLength = bedLengthM && bedLengthM > 0 ? bedLengthM : ASSUMED_BED_LENGTH_M;
  const bedCount = Math.floor(bedAreaM2 / (bundle.bedWidthM * effectiveBedLength));
  return { plantCount, bedCount, bedAreaM2 };
}
