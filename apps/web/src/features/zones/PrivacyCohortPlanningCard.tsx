/**
 * PrivacyCohortPlanningCard — §8 program-design rollup.
 *
 * Surfaces three program-design intents the §8 spec calls out under
 * "Land Use & Zone Planning":
 *
 *   - Family / women's privacy zones (§8 women-family-privacy-planning)
 *   - Men's cohort activity zones    (§8 mens-cohort-activity-zone-planning)
 *   - Spiritual contemplation zones  (existing §8 partial coverage)
 *
 * The card is descriptive, not prescriptive: it inspects zones already
 * placed by the steward — by category and by keyword in name / notes —
 * and reports what's there. A small advisory nudges the steward when
 * there are habitation zones but nothing tagged for family / women's
 * privacy, since that's a common omission for residential designs.
 *
 * Pure presentation. No new rule logic, no new entity model.
 *
 * Spec: §8 women-family-privacy-planning, §8 mens-cohort-activity-zone-planning.
 */

import { useMemo } from 'react';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import css from '../rules/SitingWarningsCard.module.css';

interface Props {
  projectId: string;
}

type IntentId = 'family' | 'cohort' | 'contemplation';

interface IntentConfig {
  id: IntentId;
  label: string;
  icon: string;
  blurb: string;
  /** Zone categories that count as a natural fit for this intent. */
  naturalCategories: LandZone['category'][];
  /** Lowercase keyword fragments matched against name + notes. */
  keywords: string[];
}

const INTENTS: IntentConfig[] = [
  {
    id: 'family',
    label: 'Family / women',
    icon: '\u{1F3E1}', // house with garden
    blurb: 'Sheltered residential space for family and women',
    naturalCategories: ['habitation'],
    keywords: ['family', 'women', "women's", 'ladies', 'mother', 'mom', 'mum', 'hareem', 'harem', 'wife', 'private'],
  },
  {
    id: 'cohort',
    label: "Men's cohort",
    icon: '\u{1F465}', // bust silhouettes
    blurb: 'Training, work, and gathering space for cohort programs',
    /* No natural category — being a "men's cohort zone" is a deliberate
       program designation rather than a default for any zone type. */
    naturalCategories: [],
    keywords: ['cohort', 'men', "men's", 'brother', 'brothers', 'rijal', 'fraternity', 'training', 'apprentice'],
  },
  {
    id: 'contemplation',
    label: 'Contemplation',
    icon: '\u{1F54B}', // kaaba
    blurb: 'Prayer, dhikr, meditation, and quiet retreat',
    naturalCategories: ['spiritual'],
    keywords: ['prayer', 'salah', 'salat', 'dhikr', 'contemplation', 'meditation', 'khalwa', 'quiet', 'retreat'],
  },
];

interface IntentRollup {
  intent: IntentConfig;
  zones: LandZone[];
}

function matchesIntent(zone: LandZone, intent: IntentConfig): boolean {
  if (intent.naturalCategories.includes(zone.category)) return true;
  const haystack = `${zone.name} ${zone.notes} ${zone.primaryUse} ${zone.secondaryUse}`.toLowerCase();
  return intent.keywords.some((kw) => haystack.includes(kw));
}

/** Per-intent zone list cap — keep the rollup compact. */
const PER_INTENT_LIST_CAP = 4;

export default function PrivacyCohortPlanningCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);

  const projectZones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );

  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );

  const rollups = useMemo<IntentRollup[]>(() => {
    return INTENTS.map((intent) => ({
      intent,
      zones: projectZones.filter((z) => matchesIntent(z, intent)),
    }));
  }, [projectZones]);

  const totalTagged = rollups.reduce((acc, r) => acc + r.zones.length, 0);

  /* Advisory: residential structures (cabin / yurt / earthship / classroom-style
     dwellings) without any family/women-tagged zone is the most common omission
     for small homestead designs. */
  const hasResidentialStructures = projectStructures.some((s) =>
    ['cabin', 'yurt', 'earthship', 'tent_glamping'].includes(s.type),
  );
  const familyRollup = rollups.find((r) => r.intent.id === 'family');
  const familyAdvisory =
    hasResidentialStructures && familyRollup && familyRollup.zones.length === 0;

  if (projectZones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Family privacy &amp; cohort zones</h2>
          <span className={css.cardHint}>0 zones</span>
        </div>
        <div className={css.empty}>
          No zones drawn yet {'\u2014'} family-privacy and cohort-activity
          intents are surfaced from zone categories and keywords in the zone
          name / notes once you start drawing.
        </div>
        <div className={css.footnote}>
          Spec ref: §8 women / family privacy planning &middot; §8 men&rsquo;s
          cohort activity zone planning.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Family privacy &amp; cohort zones</h2>
        <span className={css.cardHint}>
          {projectZones.length} zone{projectZones.length !== 1 ? 's' : ''} &middot; {totalTagged} tagged
        </span>
      </div>

      {/* Tile strip — one cell per program-design intent */}
      <div className={css.tileGrid}>
        {rollups.map(({ intent, zones }) => {
          const pending = zones.length === 0;
          return (
            <div
              key={intent.id}
              className={`${css.tile} ${pending ? css.tilePending ?? '' : ''}`}
            >
              <div className={css.tileHead}>
                <span className={css.tileIcon}>{intent.icon}</span>
                <span className={css.tileLabel}>{intent.label}</span>
              </div>
              <span className={css.tileCount}>{zones.length}</span>
              <span className={css.tileBlurb}>{intent.blurb}</span>
              {pending && (
                <span className={css.pendingPill}>Not yet tagged</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-intent zone list */}
      {totalTagged > 0 && (
        <ul className={css.violationList}>
          {rollups.flatMap(({ intent, zones }) =>
            zones.slice(0, PER_INTENT_LIST_CAP).map((z) => (
              <li key={`${intent.id}-${z.id}`} className={css.violationRow}>
                <span
                  className={css.dot}
                  style={{
                    background: z.color,
                    borderColor: z.color,
                  }}
                />
                <div className={css.violationBody}>
                  <span className={css.violationDim}>{intent.label}</span>
                  <span className={css.violationTitle}>{z.name}</span>
                  <span className={css.violationSuggest}>
                    {(z.areaM2 / 4046.86).toFixed(2)} acre &middot; {z.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </li>
            )),
          )}
        </ul>
      )}

      {familyAdvisory && (
        <div className={css.empty}>
          {projectStructures.filter((s) =>
            ['cabin', 'yurt', 'earthship', 'tent_glamping'].includes(s.type),
          ).length}{' '}
          residential structure(s) placed but no zone tagged for family or
          women&rsquo;s privacy. Consider tagging a habitation zone with
          &ldquo;family&rdquo; or &ldquo;women&rdquo; in its name or notes so
          the rollup reflects the intended program.
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §8 women / family privacy planning &middot; §8 men&rsquo;s
        cohort activity zone planning. Tags are <em>surfaced</em> from zone
        categories and keywords in zone names / notes {'\u2014'} they reflect
        the steward&rsquo;s design intent, not a prescription.
      </div>
    </div>
  );
}
