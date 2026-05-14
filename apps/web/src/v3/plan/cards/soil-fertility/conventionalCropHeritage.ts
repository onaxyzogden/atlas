/**
 * Conventional-crop heritage — derive restoration-design hints from the
 * Observe-stage `conventionalCropStore` so Plan-stage Soil surfaces can
 * read the practice history of the land they are redesigning.
 *
 * Pure-function helpers. Read-only re-derivation; canonical fields live
 * on the ConventionalCrop record. The Plan Soil cards consume these
 * hints alongside soil-test limiting factors so the steward sees the
 * inherited compaction / input / tillage legacy before prescribing
 * amendments.
 */

import type {
  ConventionalCrop,
  ConventionalCropKind,
  CompactionLevel,
  InputRegime,
  TillageRegime,
  IrrigationRegime,
} from '../../../../store/conventionalCropStore.js';

export interface HeritageHint {
  /** Severity hint — drives the chip colour on the consumer side. */
  severity: 'high' | 'medium' | 'low';
  /** Short label (≤ ~40 chars) summarising the legacy axis. */
  flag: string;
  /** Restoration move keyed to the legacy axis. */
  remedy: string;
}

export const CROP_KIND_LABEL: Record<ConventionalCropKind, string> = {
  'annual-row': 'Annual row',
  'perennial-monoculture': 'Perennial monoculture',
  'cover-cropped': 'Cover-cropped',
  'fallow': 'Fallow',
};

export const COMPACTION_LABEL: Record<CompactionLevel, string> = {
  none: 'none',
  mild: 'mild',
  moderate: 'moderate',
  severe: 'severe',
  unknown: 'unknown',
};

export const INPUT_LABEL: Record<InputRegime, string> = {
  synthetic: 'synthetic',
  organic: 'organic',
  mixed: 'mixed',
  none: 'none',
  unknown: 'unknown',
};

export const TILLAGE_LABEL: Record<TillageRegime, string> = {
  'no-till': 'no-till',
  reduced: 'reduced',
  conventional: 'conventional',
  intensive: 'intensive',
  unknown: 'unknown',
};

export const IRRIGATION_LABEL: Record<IrrigationRegime, string> = {
  none: 'none',
  rainfed: 'rainfed',
  drip: 'drip',
  sprinkler: 'sprinkler',
  flood: 'flood',
  unknown: 'unknown',
};

/**
 * Returns restoration hints for a single conventional-crop polygon.
 * Empty array means the polygon has no actionable legacy on the four
 * axes we evaluate (compaction / inputs / tillage / irrigation).
 */
export function deriveHeritageHints(c: ConventionalCrop): HeritageHint[] {
  const out: HeritageHint[] = [];

  if (c.compaction === 'severe') {
    out.push({
      severity: 'high',
      flag: 'Severe compaction',
      remedy:
        'Keyline subsoiling on contour; daikon / tillage-radish cover crop to open the profile before any new planting. Avoid heavy traffic until rooting depth recovers.',
    });
  } else if (c.compaction === 'moderate') {
    out.push({
      severity: 'medium',
      flag: 'Moderate compaction',
      remedy:
        'Deep-rooted cover crops (daikon, sunflower, tillage radish) over one full season; avoid wet-soil traffic.',
    });
  }

  if (c.inputs === 'synthetic') {
    out.push({
      severity: 'high',
      flag: 'Synthetic input legacy',
      remedy:
        'Soil biology likely depleted — rebuild with compost tea + cover-crop diversity. Expect a 2–3 year transition before biological fertility carries the system.',
    });
  } else if (c.inputs === 'mixed') {
    out.push({
      severity: 'medium',
      flag: 'Mixed input legacy',
      remedy:
        'Phase synthetic share down over 2–3 seasons; substitute with compost + green-manure cycles. Test SOM trend annually.',
    });
  }

  if (c.tillage === 'intensive') {
    out.push({
      severity: 'high',
      flag: 'Intensive tillage history',
      remedy:
        'Transition to no-till; establish permanent groundcover before next cash crop. SOM rebound typically takes 3–5 years; budget for cover-crop seed accordingly.',
    });
  } else if (c.tillage === 'conventional') {
    out.push({
      severity: 'medium',
      flag: 'Conventional tillage history',
      remedy:
        'Move toward reduced-till / no-till. Roller-crimper + mulch retention reduces bare-soil events through the rotation.',
    });
  }

  if (c.irrigation === 'flood') {
    out.push({
      severity: 'medium',
      flag: 'Flood-irrigation legacy',
      remedy:
        'Replace with drip / subsurface to restore soil aeration. Check for salinity build-up at root zone before planting perennials.',
    });
  } else if (c.irrigation === 'sprinkler') {
    out.push({
      severity: 'low',
      flag: 'Sprinkler-irrigation legacy',
      remedy:
        'Drip retrofit cuts evaporative loss ~30–50% and avoids leaf-wet disease pressure on the diversified planting.',
    });
  }

  return out;
}

/**
 * Convenience: aggregate-level severity for a polygon (the worst axis).
 * Used by the consumer to colour the row chip without looping over hints.
 */
export function polygonSeverity(c: ConventionalCrop): 'high' | 'medium' | 'low' | 'none' {
  const hints = deriveHeritageHints(c);
  if (hints.some((h) => h.severity === 'high')) return 'high';
  if (hints.some((h) => h.severity === 'medium')) return 'medium';
  if (hints.some((h) => h.severity === 'low')) return 'low';
  return 'none';
}
