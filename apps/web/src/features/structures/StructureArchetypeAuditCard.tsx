/**
 * §7 StructureArchetypeAuditCard — archetype audit of placed structures.
 *
 * Surfaces the spread of structure archetypes the steward has placed
 * (cabin · yurt · pavilion · greenhouse · barn · workshop · prayer space ·
 * earthship · etc.), groups them into functional clusters (habitation /
 * worship / production / gathering / support), and cross-references the
 * project's stated intent to flag archetypes the project is *expected* to
 * have but doesn't yet. A retreat with no cabin, a farm with no barn, a
 * classroom-tagged educational project with no classroom — those gaps
 * surface here before they bite the feasibility report.
 *
 * Pure derivation from structureStore + project.projectType. No writes.
 *
 * Closes manifest §7 `earthship-cabin-yurt-pavilion-greenhouse-barn-workshop`
 * (P2) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import css from './StructureArchetypeAuditCard.module.css';

interface Props {
  project: LocalProject;
}

const STRUCTURE_LABEL: Record<StructureType, string> = {
  cabin: 'Cabin',
  yurt: 'Yurt',
  pavilion: 'Pavilion',
  greenhouse: 'Greenhouse',
  barn: 'Barn',
  workshop: 'Workshop',
  prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse',
  classroom: 'Classroom',
  storage: 'Storage',
  animal_shelter: 'Animal shelter',
  compost_station: 'Compost station',
  water_pump_house: 'Pump house',
  tent_glamping: 'Glamping tent',
  fire_circle: 'Fire circle',
  lookout: 'Lookout',
  earthship: 'Earthship',
  solar_array: 'Solar array',
  well: 'Well',
  water_tank: 'Water tank',
};

type ArchetypeGroup = 'habitation' | 'worship' | 'production' | 'gathering' | 'support';

const GROUP_LABEL: Record<ArchetypeGroup, string> = {
  habitation: 'Habitation',
  worship: 'Worship',
  production: 'Production',
  gathering: 'Gathering',
  support: 'Support',
};

const GROUP_BLURB: Record<ArchetypeGroup, string> = {
  habitation: 'Where people sleep and live.',
  worship: 'Sacred and prayer surfaces.',
  production: 'Farm, craft, and animal work.',
  gathering: 'Where people meet, learn, sit.',
  support: 'Storage, water, energy, sanitation.',
};

const TYPE_GROUP: Record<StructureType, ArchetypeGroup> = {
  cabin: 'habitation',
  yurt: 'habitation',
  earthship: 'habitation',
  tent_glamping: 'habitation',
  prayer_space: 'worship',
  barn: 'production',
  greenhouse: 'production',
  workshop: 'production',
  animal_shelter: 'production',
  pavilion: 'gathering',
  classroom: 'gathering',
  fire_circle: 'gathering',
  lookout: 'gathering',
  bathhouse: 'support',
  storage: 'support',
  compost_station: 'support',
  water_pump_house: 'support',
  solar_array: 'support',
  well: 'support',
  water_tank: 'support',
};

const GROUPS: ArchetypeGroup[] = ['habitation', 'worship', 'production', 'gathering', 'support'];

type Criticality = 'core' | 'expected' | 'nice';

interface Need {
  type: StructureType;
  why: string;
  criticality: Criticality;
}

const NEEDS_BY_INTENT: Record<string, Need[]> = {
  regenerative_farm: [
    { type: 'barn', why: 'Stores feed, equipment, and shelter for livestock.', criticality: 'core' },
    { type: 'workshop', why: 'Repairs and tooling on the working farm.', criticality: 'expected' },
    { type: 'animal_shelter', why: 'Required when livestock is in the plan.', criticality: 'expected' },
    { type: 'greenhouse', why: 'Season extension for transplants and high-value crops.', criticality: 'nice' },
    { type: 'storage', why: 'Harvest, tools, dry goods.', criticality: 'expected' },
  ],
  retreat_center: [
    { type: 'cabin', why: 'Guest housing — primary revenue surface.', criticality: 'core' },
    { type: 'pavilion', why: 'Open gathering space for retreats and meals.', criticality: 'expected' },
    { type: 'bathhouse', why: 'Shared sanitation infrastructure for guests.', criticality: 'expected' },
    { type: 'fire_circle', why: 'Anchor point for evening programming.', criticality: 'nice' },
    { type: 'prayer_space', why: 'Quiet reflective surface — distinct from gathering.', criticality: 'nice' },
  ],
  homestead: [
    { type: 'cabin', why: 'Primary dwelling for the household.', criticality: 'core' },
    { type: 'workshop', why: 'Self-reliance — repairs, tools, projects.', criticality: 'expected' },
    { type: 'greenhouse', why: 'Year-round food security.', criticality: 'expected' },
    { type: 'storage', why: 'Tools, supplies, harvest, preserved food.', criticality: 'expected' },
    { type: 'animal_shelter', why: 'If small livestock is part of the plan.', criticality: 'nice' },
  ],
  educational_farm: [
    { type: 'classroom', why: 'Teaching surface — primary intent of the project.', criticality: 'core' },
    { type: 'pavilion', why: 'Outdoor demonstrations and group instruction.', criticality: 'expected' },
    { type: 'barn', why: 'Demonstration of working agriculture.', criticality: 'expected' },
    { type: 'greenhouse', why: 'Hands-on plant biology and propagation.', criticality: 'nice' },
  ],
  conservation: [
    { type: 'lookout', why: 'Monitoring and interpretive vantage.', criticality: 'core' },
    { type: 'storage', why: 'Stewardship tools and equipment.', criticality: 'expected' },
    { type: 'pavilion', why: 'Visitor orientation point.', criticality: 'nice' },
  ],
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
};

interface NeedRow {
  type: StructureType;
  expected: Criticality;
  placed: number;
  why: string;
}

export default function StructureArchetypeAuditCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);

  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  const counts = useMemo(() => {
    const out = new Map<StructureType, number>();
    for (const s of structures) {
      out.set(s.type, (out.get(s.type) ?? 0) + 1);
    }
    return out;
  }, [structures]);

  const groupCounts = useMemo(() => {
    const g: Record<ArchetypeGroup, number> = {
      habitation: 0,
      worship: 0,
      production: 0,
      gathering: 0,
      support: 0,
    };
    for (const s of structures) {
      const grp = TYPE_GROUP[s.type];
      if (grp) g[grp] += 1;
    }
    return g;
  }, [structures]);

  const placedTypes = useMemo(() => {
    const set = new Set<StructureType>();
    for (const s of structures) set.add(s.type);
    return Array.from(set).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  }, [structures, counts]);

  const projectType = project.projectType ?? '';
  const intentLabel = PROJECT_TYPE_LABEL[projectType] ?? null;
  const needs = NEEDS_BY_INTENT[projectType] ?? [];

  const needRows: NeedRow[] = useMemo(
    () =>
      needs.map((n) => ({
        type: n.type,
        expected: n.criticality,
        placed: counts.get(n.type) ?? 0,
        why: n.why,
      })),
    [needs, counts],
  );

  const coreUnmet = needRows.filter((n) => n.expected === 'core' && n.placed === 0).length;
  const expectedUnmet = needRows.filter((n) => n.expected === 'expected' && n.placed === 0).length;
  const total = structures.length;

  const verdict =
    !intentLabel
      ? { tone: 'unknown', label: 'Project intent unset — set type to enable gap audit' }
      : coreUnmet > 0
        ? { tone: 'block', label: `${coreUnmet} core archetype${coreUnmet === 1 ? '' : 's'} missing` }
        : expectedUnmet > 0
          ? { tone: 'work', label: `Core covered — ${expectedUnmet} expected archetype${expectedUnmet === 1 ? '' : 's'} still open` }
          : needRows.length > 0
            ? { tone: 'done', label: 'Core and expected archetypes all placed' }
            : { tone: 'unknown', label: `No archetype audit defined for ${intentLabel}` };

  return (
    <section className={css.card} aria-label="Structure archetype audit">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Structure Archetype Audit</h3>
          <p className={css.cardHint}>
            Twenty structure archetypes spread across five functional clusters. The audit
            cross-references what's placed against what the stated project intent expects to
            see {'\u2014'} a retreat with no cabin, a farm with no barn, an educational
            project with no classroom.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={total} label="placed" />
        <Headline value={placedTypes.length} label="archetypes" />
        <Headline value={coreUnmet} label="core gaps" tone="block" />
        <Headline value={expectedUnmet} label="expected gaps" tone="work" />
      </div>

      <ul className={css.groupStrip} aria-label="Archetype clusters">
        {GROUPS.map((g) => (
          <li key={g} className={`${css.groupChip} ${css[`group_${g}`]}`}>
            <span className={css.groupCount}>{groupCounts[g]}</span>
            <div className={css.groupMeta}>
              <span className={css.groupName}>{GROUP_LABEL[g]}</span>
              <span className={css.groupBlurb}>{GROUP_BLURB[g]}</span>
            </div>
          </li>
        ))}
      </ul>

      {placedTypes.length > 0 ? (
        <div className={css.placedSection}>
          <h4 className={css.sectionTitle}>Placed archetypes</h4>
          <ul className={css.typeGrid}>
            {placedTypes.map((t) => {
              const grp = TYPE_GROUP[t];
              return (
                <li key={t} className={`${css.typeChip} ${css[`group_${grp}`]}`}>
                  <span className={css.typeName}>{STRUCTURE_LABEL[t]}</span>
                  <span className={css.typeCount}>{counts.get(t)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className={css.empty}>No structures placed yet. Add buildings to populate the audit.</p>
      )}

      {intentLabel && needRows.length > 0 && (
        <div className={css.needsSection}>
          <h4 className={css.sectionTitle}>
            Expected for <span className={css.intentTag}>{intentLabel}</span>
          </h4>
          <ul className={css.needList}>
            {needRows.map((n) => {
              const placed = n.placed > 0;
              return (
                <li key={n.type} className={`${css.need} ${placed ? css.needMet : css[`needGap_${n.expected}`]}`}>
                  <div className={css.needHead}>
                    <span className={css.needType}>{STRUCTURE_LABEL[n.type]}</span>
                    <span className={`${css.needBadge} ${css[`crit_${n.expected}`]}`}>{n.expected}</span>
                    <span className={css.needPlaced}>
                      {placed ? `${'\u2713'} ${n.placed} placed` : 'not placed'}
                    </span>
                  </div>
                  <p className={css.needWhy}>{n.why}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className={css.footnote}>
        Audit needs are heuristic per project type {'\u2014'} a missing "expected" archetype
        is a question worth asking, not a hard constraint.
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
  tone?: 'block' | 'work';
}) {
  return (
    <div className={`${css.headline} ${tone ? css[`headline_${tone}`] : ''}`}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
