/**
 * §19 SignsInCreationPanel — toggleable interpretive overlay.
 *
 * Maps placed-feature classes to āyāt of creation widely cited in Islamic
 * ecology literature. Each entry surfaces:
 *   - the theme (a steward-facing label)
 *   - the Qur'an reference (sūrah name + chapter:verse)
 *   - a one-line *interpretive connection* between the placed feature and
 *     the theme of the verse
 *
 * IMPORTANT (Amanah framing):
 *   This panel does NOT quote, translate, or paraphrase Qur'anic content.
 *   It only points the steward to canonical references and offers the
 *   designer's own interpretive framing of the design connection. Any
 *   reader who wants the verse text should consult the Qur'an directly.
 *
 * Untriggered signs are shown as quiet "ghost" cards — an invitation to
 * design rather than a prescription.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './SignsInCreationPanel.module.css';

// ── Trigger sets ──────────────────────────────────────────────────────────

const WATER_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set([
  'water_tank', 'well_pump', 'rain_catchment', 'greywater',
]);
const WATER_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'well', 'water_tank', 'water_pump_house',
]);
const DWELLING_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'cabin', 'yurt', 'earthship', 'tent_glamping',
]);
const PRAYER_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'prayer_space',
]);
const CANOPY_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard', 'food_forest', 'silvopasture', 'windbreak', 'shelterbelt',
]);
const FOOD_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard', 'food_forest', 'garden_bed', 'market_garden', 'row_crop',
]);
const FOOD_ZONE_CATEGORIES: ReadonlySet<ZoneCategory> = new Set([
  'food_production',
]);
const REGEN_ZONE_CATEGORIES: ReadonlySet<ZoneCategory> = new Set([
  'conservation', 'water_retention',
]);
const REGEN_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set([
  'compost', 'biochar',
]);

// ── Counts derived from placed features ──────────────────────────────────

interface PlacedCounts {
  waterSources: number;
  livestock: number;
  bees: number;
  productiveLand: number;
  trees: number;
  pollinatorStrips: number;
  soilRegen: number;
  dwellings: number;
  prayerSpaces: number;
  conservation: number;
  canopyShelter: number;
  totalAnyFeatures: number;
}

// ── Signs catalog ────────────────────────────────────────────────────────
// Each entry pairs a placed-feature class with a canonical āyah of
// creation and a short interpretive frame the steward can read. These
// references are widely cited in Islamic ecology and stewardship
// literature; the *connection* sentence is editorial, not translation.

interface SignEntry {
  id: string;
  theme: string;
  surah: string;          // Sūrah name (no diacritics required by typography)
  ayahRef: string;        // chapter:verse(s)
  triggerLabel: string;   // human-readable count noun
  connection: (count: number) => string;
  triggerCount: (counts: PlacedCounts) => number;
  invitation: string;     // shown when untriggered
}

const SIGNS: SignEntry[] = [
  {
    id: 'water-origin',
    theme: 'Water — origin of every living thing',
    surah: 'Al-Anbiy\u0101\u0027',
    ayahRef: '21:30',
    triggerLabel: 'water source',
    connection: (n) =>
      `Your ${n} placed water source${n === 1 ? '' : 's'} hold this sign in physical form: every drop you catch and store is a thread back to the verse's reminder that life itself begins here.`,
    triggerCount: (c) => c.waterSources,
    invitation:
      'When you place a well, tank, rain catchment, or greywater system, this sign surfaces as an interpretive layer for the design.',
  },
  {
    id: 'livestock-provision',
    theme: 'Livestock — warmth, sustenance, and adornment',
    surah: 'An-Na\u1E25l',
    ayahRef: '16:5\u20138',
    triggerLabel: 'paddock',
    connection: (n) =>
      `Your ${n} grazing paddock${n === 1 ? '' : 's'} carry this sign — the verses speak of cattle granted for warmth, food, and beauty, and the animals you steward are placed within that same provision.`,
    triggerCount: (c) => c.livestock,
    invitation:
      'When you place paddocks or animal shelters, this sign surfaces — animals as a granted provision of warmth and food.',
  },
  {
    id: 'bees-revelation',
    theme: 'The bee — revelation in a created form',
    surah: 'An-Na\u1E25l',
    ayahRef: '16:68\u201369',
    triggerLabel: 'bee paddock',
    connection: (n) =>
      `Your ${n} bee colon${n === 1 ? 'y' : 'ies'} surface this sign directly — the sūrah is named for the bee, and its verses describe a creature that receives instruction from its Lord and produces healing for humanity.`,
    triggerCount: (c) => c.bees,
    invitation:
      'When you place bee colonies (a paddock with species "bees") or pollinator strips, this sign surfaces.',
  },
  {
    id: 'food-look-at-it',
    theme: 'Productive land — "let mankind look at his food"',
    surah: '\u02BFAbasa',
    ayahRef: '80:24\u201332',
    triggerLabel: 'food-producing area',
    connection: (n) =>
      `Your ${n} food-producing area${n === 1 ? '' : 's'} embody the verse's invitation — the steward is asked to actually look at how food arrives: rain, split earth, grain, fruit, pasture. Your design lays out exactly that arc.`,
    triggerCount: (c) => c.productiveLand,
    invitation:
      'When you place food-production zones or row/garden crop areas, this sign surfaces — the verse asks the steward to look at how food arrives.',
  },
  {
    id: 'gardens-trellised',
    theme: 'Gardens — trellised and untrellised, layered with fruit',
    surah: 'Al-An\u02BF\u0101m',
    ayahRef: '6:141',
    triggerLabel: 'orchard / food-forest area',
    connection: (n) =>
      `Your ${n} canopy-bearing area${n === 1 ? '' : 's'} mirror this sign — gardens described as both trellised and free-growing, layered with date, olive, pomegranate, and grain.`,
    triggerCount: (c) => c.trees,
    invitation:
      'When you place orchards, food forests, silvopasture, windbreaks, or shelterbelts, this sign surfaces.',
  },
  {
    id: 'soil-revival',
    theme: 'Soil — dead earth revived as a sign',
    surah: 'Y\u0101-S\u012Bn',
    ayahRef: '36:33',
    triggerLabel: 'regenerative area',
    connection: (n) =>
      `Your ${n} conservation, retention, or composting feature${n === 1 ? '' : 's'} carry this sign — the verse points to dead earth made alive as evidence of resurrection. Regenerative work is theology made physical.`,
    triggerCount: (c) => c.soilRegen,
    invitation:
      'When you place conservation zones, water-retention zones, compost stations, or biochar systems, this sign surfaces.',
  },
  {
    id: 'dwellings-rest',
    theme: 'Dwellings — homes as places of rest',
    surah: 'An-Na\u1E25l',
    ayahRef: '16:80',
    triggerLabel: 'dwelling',
    connection: (n) =>
      `Your ${n} placed dwelling${n === 1 ? '' : 's'} carry this sign — the verse names homes (and even tent-skins) as a granted means of rest and quiet. Your siting decisions shape that rest.`,
    triggerCount: (c) => c.dwellings,
    invitation:
      'When you place cabins, yurts, earthships, or glamping tents, this sign surfaces.',
  },
  {
    id: 'prayer-orientation',
    theme: 'Prayer space — orientation toward the qiblah',
    surah: 'Al-Baqara',
    ayahRef: '2:144',
    triggerLabel: 'prayer space',
    connection: (n) =>
      `Your ${n} prayer space${n === 1 ? '' : 's'} carry this sign — the verse anchors prayer in physical orientation toward the sacred mosque. Siting and bearing are not incidental; they are the act.`,
    triggerCount: (c) => c.prayerSpaces,
    invitation:
      'When you place a prayer space or a spiritual zone, this sign surfaces alongside qiblah-orientation guidance.',
  },
  {
    id: 'animals-communities',
    theme: 'Wildlife — communities like your own',
    surah: 'Al-An\u02BF\u0101m',
    ayahRef: '6:38',
    triggerLabel: 'conservation zone',
    connection: (n) =>
      `Your ${n} conservation zone${n === 1 ? '' : 's'} carry this sign — the verse names every creature on earth and bird in flight as communities like the human community. Setting land aside is recognition of that.`,
    triggerCount: (c) => c.conservation,
    invitation:
      'When you place conservation zones, this sign surfaces — wildlife as communities granted the same recognition as human ones.',
  },
  {
    id: 'pollinators-bloom',
    theme: 'Pollinators — bloom, nectar, and reciprocity',
    surah: 'Ar-Ra\u1E25m\u0101n',
    ayahRef: '55:11\u201312',
    triggerLabel: 'pollinator strip',
    connection: (n) =>
      `Your ${n} pollinator strip${n === 1 ? '' : 's'} carry this sign — the verses count fruit, date palms in their sheaths, and grain with chaff among gifts to be reciprocated through care, not extraction.`,
    triggerCount: (c) => c.pollinatorStrips,
    invitation:
      'When you place pollinator strips, this sign surfaces — bloom and nectar as a gift inviting reciprocity.',
  },
  {
    id: 'shade-mercy',
    theme: 'Shade and shelter — a granted mercy',
    surah: 'An-Na\u1E25l',
    ayahRef: '16:81',
    triggerLabel: 'shelter feature',
    connection: (n) =>
      `Your ${n} shelter feature${n === 1 ? '' : 's'} (pavilions, windbreaks, shelterbelts) carry this sign — the verse names shade from what He created, garments of warmth, and refuge in the mountains as granted mercies.`,
    triggerCount: (c) => c.canopyShelter,
    invitation:
      'When you place pavilions, windbreaks, or shelterbelts, this sign surfaces — shade as a granted mercy.',
  },
];

// ── Component ────────────────────────────────────────────────────────────

interface SignsInCreationPanelProps {
  project: LocalProject;
}

export default function SignsInCreationPanel({ project }: SignsInCreationPanelProps) {
  const [open, setOpen] = useState<boolean>(false);

  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const counts = useMemo<PlacedCounts>(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const cropAreas = allCropAreas.filter((c) => c.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);

    const waterUtilities = utilities.filter((u) => WATER_UTILITY_TYPES.has(u.type));
    const waterStructures = structures.filter((s) => WATER_STRUCTURE_TYPES.has(s.type));
    const dwellings = structures.filter((s) => DWELLING_STRUCTURE_TYPES.has(s.type));
    const prayerStructures = structures.filter((s) => PRAYER_STRUCTURE_TYPES.has(s.type));
    const spiritualZones = zones.filter((z) => z.category === 'spiritual');

    const canopyCrops = cropAreas.filter((c) => CANOPY_CROP_TYPES.has(c.type));
    const foodCrops = cropAreas.filter((c) => FOOD_CROP_TYPES.has(c.type));
    const foodZones = zones.filter((z) => FOOD_ZONE_CATEGORIES.has(z.category));
    const pollinatorStrips = cropAreas.filter((c) => c.type === 'pollinator_strip');

    const regenZones = zones.filter((z) => REGEN_ZONE_CATEGORIES.has(z.category));
    const regenUtilities = utilities.filter((u) => REGEN_UTILITY_TYPES.has(u.type));

    const beePaddocks = paddocks.filter((p) => p.species.includes('bees'));
    const livestockPaddocks = paddocks.filter(
      (p) => p.species.some((sp) => sp !== 'bees'),
    );

    const conservationZones = zones.filter((z) => z.category === 'conservation');

    // canopyShelter — pavilions + windbreak/shelterbelt areas
    const pavilions = structures.filter((s) => s.type === 'pavilion');
    const windbreakBelts = cropAreas.filter(
      (c) => c.type === 'windbreak' || c.type === 'shelterbelt',
    );

    return {
      waterSources: waterUtilities.length + waterStructures.length,
      livestock: livestockPaddocks.length,
      bees: beePaddocks.length,
      productiveLand: foodCrops.length + foodZones.length,
      trees: canopyCrops.length,
      pollinatorStrips: pollinatorStrips.length,
      soilRegen: regenZones.length + regenUtilities.length,
      dwellings: dwellings.length,
      prayerSpaces: prayerStructures.length + spiritualZones.length,
      conservation: conservationZones.length,
      canopyShelter: pavilions.length + windbreakBelts.length,
      totalAnyFeatures:
        structures.length + zones.length + utilities.length +
        cropAreas.length + paddocks.length,
    };
  }, [allStructures, allZones, allUtilities, allCropAreas, allPaddocks, project.id]);

  const triggered = useMemo(
    () => SIGNS.map((s) => ({ sign: s, count: s.triggerCount(counts) })).filter((x) => x.count > 0),
    [counts],
  );
  const untriggered = useMemo(
    () => SIGNS.map((s) => ({ sign: s, count: s.triggerCount(counts) })).filter((x) => x.count === 0),
    [counts],
  );

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h2 className={css.cardTitle}>Signs in Creation</h2>
          <span className={css.cardHint}>
            {'Interpretive overlay \u2014 placed features paired with canonical \u0101y\u0101t.'}
          </span>
        </div>
        <button
          className={css.toggleBtn}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide overlay' : 'Show overlay'}
        </button>
      </div>

      {open && (
        <>
          <p className={css.amanah}>
            <strong>A note on framing:</strong> this panel does not quote or
            translate Qur&rsquo;anic content. It points to references widely
            cited in Islamic ecology, paired with the designer&rsquo;s
            interpretive framing of the connection to placed features. For
            verse text, consult the Qur&rsquo;an directly.
          </p>

          {triggered.length > 0 ? (
            <>
              <h3 className={css.sectionLabel}>Surfaced by your design</h3>
              <ul className={css.signList}>
                {triggered.map(({ sign, count }) => (
                  <li key={sign.id} className={css.signItem}>
                    <div className={css.signHead}>
                      <span className={css.signTheme}>{sign.theme}</span>
                      <span className={css.signRef}>
                        {'Qur\u2019an '}{sign.ayahRef}{' \u00B7 '}{sign.surah}
                      </span>
                    </div>
                    <p className={css.signConnection}>{sign.connection(count)}</p>
                    <span className={css.signCount}>
                      {count} {sign.triggerLabel}{count === 1 ? '' : 's'} placed
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className={css.empty}>
              <p>
                No features placed yet that surface a sign. Add a water source,
                paddock, orchard, prayer space, or conservation zone to bring
                this overlay to life.
              </p>
            </div>
          )}

          {untriggered.length > 0 && (
            <>
              <h3 className={css.sectionLabel}>Invitations</h3>
              <ul className={css.signListGhost}>
                {untriggered.map(({ sign }) => (
                  <li key={sign.id} className={css.signGhost}>
                    <div className={css.signHead}>
                      <span className={css.signTheme}>{sign.theme}</span>
                      <span className={css.signRef}>
                        {'Qur\u2019an '}{sign.ayahRef}{' \u00B7 '}{sign.surah}
                      </span>
                    </div>
                    <p className={css.signInvitation}>{sign.invitation}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className={css.footnote}>
            {'References selected from \u0101y\u0101t commonly cited in Islamic ecology and stewardship literature. The connection sentences are editorial, not translation.'}
          </p>
        </>
      )}
    </div>
  );
}
