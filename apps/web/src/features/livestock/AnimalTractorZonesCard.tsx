/**
 * \u00A711 MobileTractorZonesCard \u2014 identifies crop areas and zones that
 * suit rotating mobile-tractor systems (chicken, rabbit, pig). The
 * heuristic matches each candidate area to the species whose ecological
 * role fits best:
 *   \u2022 Chicken \u2192 pest control + manure between rows in orchards, food
 *     forests, market gardens, row crops.
 *   \u2022 Pig \u2192 root disturbance + bare-ground prep in silvopasture
 *     without an overlapping paddock and in future-expansion zones.
 *   \u2022 Rabbit \u2192 gentle mowing + manure on pollinator strips, garden
 *     beds between rotations, and commons / lawn-style zones.
 *
 * For each candidate the card surfaces a recommended head count for a
 * one-week rotation (using literature-default density per ha), the area
 * in hectares, and a one-line rationale. Pure presentation \u2014 no shared
 * package math, no map overlays, no new entity types.
 *
 * Maps to manifest \u00A711 `chicken-rabbit-pig-tractor-zones` (P2, planned).
 */

import { useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { useZoneStore, type LandZone, type ZoneCategory } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './MobileTractorZonesCard.module.css';

/* \u2500\u2500 Tunables (head per hectare for a 1-week rotation) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const CHICKEN_HEAD_PER_HA = 1000;
const RABBIT_HEAD_PER_HA = 500;
const PIG_HEAD_PER_HA = 8;
const ROTATION_DAYS = 7;

/* \u2500\u2500 Suitability rules \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const CHICKEN_CROP_TYPES = new Set<CropAreaType>([
  'orchard',
  'food_forest',
  'market_garden',
  'row_crop',
  'garden_bed',
  'silvopasture',
]);

const PIG_CROP_TYPES = new Set<CropAreaType>([
  'silvopasture',
  'shelterbelt',
  'windbreak',
]);

const PIG_ZONE_CATEGORIES = new Set<ZoneCategory>([
  'future_expansion',
]);

const RABBIT_CROP_TYPES = new Set<CropAreaType>([
  'pollinator_strip',
  'garden_bed',
]);

const RABBIT_ZONE_CATEGORIES = new Set<ZoneCategory>([
  'commons',
  'buffer',
]);

const CROP_TYPE_LABEL: Record<CropAreaType, string> = {
  orchard: 'Orchard',
  food_forest: 'Food forest',
  market_garden: 'Market garden',
  row_crop: 'Row crop',
  garden_bed: 'Garden bed',
  silvopasture: 'Silvopasture',
  shelterbelt: 'Shelterbelt',
  windbreak: 'Windbreak',
  pollinator_strip: 'Pollinator strip',
  nursery: 'Nursery',
};

const ZONE_CATEGORY_LABEL: Record<string, string> = {
  future_expansion: 'Future-expansion zone',
  commons: 'Commons',
  buffer: 'Buffer',
};

const CHICKEN_RATIONALES: Partial<Record<CropAreaType, string>> = {
  orchard: 'Pest control between rows + manure for fruit trees.',
  food_forest: 'Surface-scratching helps control insects without damaging deep roots.',
  market_garden: 'Move through after harvest \u2014 cleans up pests, adds fertility before the next planting.',
  row_crop: 'Best after harvest \u2014 chickens scour pests and turn surface stubble.',
  garden_bed: 'Between rotations: pest cleanup + light tillage + manure.',
  silvopasture: 'Light follow-on grazing once larger animals have moved off.',
};

const PIG_RATIONALES: Partial<Record<CropAreaType, string>> = {
  silvopasture: 'Root disturbance prepares soil for under-story planting.',
  shelterbelt: 'Targeted disturbance during establishment to seat new trees.',
  windbreak: 'Same as shelterbelt \u2014 root prep before transplants go in.',
};

const RABBIT_RATIONALES: Partial<Record<CropAreaType, string>> = {
  pollinator_strip: 'Gentle mowing without compacting flowering plants.',
  garden_bed: 'Between rotations: low-impact mowing + manure.',
};

const RABBIT_ZONE_RATIONALES: Partial<Record<string, string>> = {
  commons: 'Lawn-style maintenance of gathering area without mowers.',
  buffer: 'Keeps buffer vegetation low without heavy equipment.',
};

const PIG_ZONE_RATIONALES: Partial<Record<string, string>> = {
  future_expansion: 'Break new ground ahead of planting \u2014 pigs root and aerate.',
};

/* \u2500\u2500 Analysis \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

interface Candidate {
  id: string;
  name: string;
  typeLabel: string;
  areaHa: number;
  headCount: number;
  rationale: string;
}

interface SpeciesGroup {
  species: 'chicken' | 'rabbit' | 'pig';
  label: string;
  glyph: string;
  headPerHa: number;
  candidates: Candidate[];
}

function buildCandidates(
  crops: CropArea[],
  zones: LandZone[],
  hasActivePaddockOverlap: (areaId: string) => boolean,
): SpeciesGroup[] {
  const groups: Record<'chicken' | 'rabbit' | 'pig', SpeciesGroup> = {
    chicken: { species: 'chicken', label: 'Chicken tractor', glyph: '\u{1F414}', headPerHa: CHICKEN_HEAD_PER_HA, candidates: [] },
    rabbit:  { species: 'rabbit',  label: 'Rabbit tractor',  glyph: '\u{1F407}', headPerHa: RABBIT_HEAD_PER_HA, candidates: [] },
    pig:     { species: 'pig',     label: 'Pig tractor',     glyph: '\u{1F416}', headPerHa: PIG_HEAD_PER_HA, candidates: [] },
  };

  for (const c of crops) {
    const ha = c.areaM2 / 10_000;
    if (ha <= 0) continue;
    const typeLabel = CROP_TYPE_LABEL[c.type] ?? c.type;
    const display = c.name?.trim() || `(unnamed ${typeLabel.toLowerCase()})`;

    if (CHICKEN_CROP_TYPES.has(c.type)) {
      groups.chicken.candidates.push({
        id: `crop-chk-${c.id}`,
        name: display,
        typeLabel,
        areaHa: ha,
        headCount: Math.round(ha * CHICKEN_HEAD_PER_HA),
        rationale: CHICKEN_RATIONALES[c.type] ?? 'Suitable for short-rotation chicken passes.',
      });
    }

    // Pig: only on silvopasture WITHOUT an overlapping paddock (otherwise
    // an active grazing rotation is already happening).
    if (PIG_CROP_TYPES.has(c.type) && !hasActivePaddockOverlap(c.id)) {
      groups.pig.candidates.push({
        id: `crop-pig-${c.id}`,
        name: display,
        typeLabel,
        areaHa: ha,
        headCount: Math.max(1, Math.round(ha * PIG_HEAD_PER_HA)),
        rationale: PIG_RATIONALES[c.type] ?? 'Targeted disturbance during establishment.',
      });
    }

    if (RABBIT_CROP_TYPES.has(c.type)) {
      groups.rabbit.candidates.push({
        id: `crop-rab-${c.id}`,
        name: display,
        typeLabel,
        areaHa: ha,
        headCount: Math.round(ha * RABBIT_HEAD_PER_HA),
        rationale: RABBIT_RATIONALES[c.type] ?? 'Light grazing, low compaction.',
      });
    }
  }

  for (const z of zones) {
    const ha = z.areaM2 / 10_000;
    if (ha <= 0) continue;
    const typeLabel = ZONE_CATEGORY_LABEL[z.category] ?? z.category;
    const display = z.name?.trim() || `(unnamed ${typeLabel.toLowerCase()})`;

    if (PIG_ZONE_CATEGORIES.has(z.category)) {
      groups.pig.candidates.push({
        id: `zone-pig-${z.id}`,
        name: display,
        typeLabel,
        areaHa: ha,
        headCount: Math.max(1, Math.round(ha * PIG_HEAD_PER_HA)),
        rationale: PIG_ZONE_RATIONALES[z.category] ?? 'Suitable for ground-prep work.',
      });
    }

    if (RABBIT_ZONE_CATEGORIES.has(z.category)) {
      groups.rabbit.candidates.push({
        id: `zone-rab-${z.id}`,
        name: display,
        typeLabel,
        areaHa: ha,
        headCount: Math.round(ha * RABBIT_HEAD_PER_HA),
        rationale: RABBIT_ZONE_RATIONALES[z.category] ?? 'Gentle vegetation management.',
      });
    }
  }

  // Sort each group by area descending (biggest opportunity first).
  for (const g of Object.values(groups)) {
    g.candidates.sort((a, b) => b.areaHa - a.areaHa);
  }

  return [groups.chicken, groups.rabbit, groups.pig];
}

/* \u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

interface Props {
  projectId: string;
}

export default function MobileTractorZonesCard({ projectId }: Props) {
  const allCrops = useCropStore((s) => s.cropAreas);
  const allZones = useZoneStore((s) => s.zones);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const groups = useMemo(() => {
    const crops = allCrops.filter((c) => c.projectId === projectId);
    const zones = allZones.filter((z) => z.projectId === projectId);
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);

    // For now, "active paddock overlap" = there's any paddock in the
    // project with non-empty species. Without polygon-intersection we
    // can't be more specific, so we're conservative: if the project
    // already has active grazing, exclude silvopasture/shelterbelt from
    // the pig list (assume the paddock-rotation is the right tool).
    const hasActiveGrazing = paddocks.some((p) => p.species.length > 0);
    const hasActivePaddockOverlap = (_areaId: string) => hasActiveGrazing;

    return buildCandidates(crops, zones, hasActivePaddockOverlap);
  }, [allCrops, allZones, allPaddocks, projectId]);

  const totalCandidates = groups.reduce((s, g) => s + g.candidates.length, 0);

  if (totalCandidates === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Mobile Tractor Zones</h4>
            <p className={css.cardHint}>
              Crop areas and zones suited for chicken, rabbit, and pig
              tractor rotations.
            </p>
          </div>
          <span className={css.heuristicBadge}>Heuristic</span>
        </div>
        <div className={css.empty}>
          Draw an orchard, garden bed, silvopasture, pollinator strip, or
          a future-expansion / commons zone to surface tractor candidates.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Mobile Tractor Zones</h4>
          <p className={css.cardHint}>
            Areas suited for rotating mobile-tractor systems. Head counts
            assume a one-week rotation at literature-default densities per
            hectare.
          </p>
        </div>
        <span className={css.heuristicBadge}>Heuristic</span>
      </div>

      <div className={css.groupGrid}>
        {groups.map((g) => (
          <SpeciesColumn key={g.species} group={g} />
        ))}
      </div>

      <p className={css.footnote}>
        <em>Heuristic.</em> Densities used: chicken {CHICKEN_HEAD_PER_HA}/ha,
        rabbit {RABBIT_HEAD_PER_HA}/ha, pig {PIG_HEAD_PER_HA}/ha for a
        {' '}{ROTATION_DAYS}-day rotation. Pig candidates exclude crop areas
        when the project already has active grazing paddocks (assume the
        existing paddock rotation is the right tool there). Polygon-level
        overlap with paddocks is not yet computed \u2014 a future iteration
        with turf-style intersection will refine the suggestions.
      </p>
    </div>
  );
}

function SpeciesColumn({ group }: { group: SpeciesGroup }) {
  const totalHa = group.candidates.reduce((s, c) => s + c.areaHa, 0);
  const totalHead = group.candidates.reduce((s, c) => s + c.headCount, 0);

  return (
    <div className={`${css.speciesCol} ${css[`col_${group.species}`]}`}>
      <div className={css.speciesHead}>
        <span className={css.speciesGlyph} aria-hidden>{group.glyph}</span>
        <div className={css.speciesMeta}>
          <span className={css.speciesLabel}>{group.label}</span>
          <span className={css.speciesSub}>
            {group.candidates.length === 0
              ? 'No candidates'
              : `${totalHa.toFixed(2)} ha \u00B7 \u2248${totalHead.toLocaleString()} head capacity`}
          </span>
        </div>
      </div>
      {group.candidates.length === 0 ? (
        <div className={css.colEmpty}>
          No suitable areas drawn yet.
        </div>
      ) : (
        <ul className={css.candList}>
          {group.candidates.slice(0, 4).map((c) => (
            <li key={c.id} className={css.cand}>
              <div className={css.candHead}>
                <span className={css.candName}>{c.name}</span>
                <span className={css.candHead2}>
                  {c.areaHa.toFixed(2)} ha
                </span>
              </div>
              <div className={css.candHead}>
                <span className={css.candType}>{c.typeLabel}</span>
                <span className={css.candHead2}>
                  \u2248{c.headCount.toLocaleString()} head
                </span>
              </div>
              <p className={css.candRationale}>{c.rationale}</p>
            </li>
          ))}
          {group.candidates.length > 4 && (
            <li className={css.candMore}>
              {' + '}{group.candidates.length - 4} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
