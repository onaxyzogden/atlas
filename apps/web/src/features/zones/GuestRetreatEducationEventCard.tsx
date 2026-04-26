/**
 * §5 GuestRetreatEducationEventCard — program-zone audit for guest /
 * retreat / education / event / parking allocations.
 *
 * Cross-references zoneStore allocations against project intent. A
 * retreat with no `retreat` zone, an educational project with no
 * `education` zone, a guest-receiving project with no `access` zone
 * — those gaps surface here. Approximate per-zone capacity by area
 * (people-density × m²) gives stewards a realistic ceiling on how
 * many guests/students/event attendees the current program can hold.
 *
 * Pure derivation from zoneStore + project.projectType. No writes.
 *
 * Closes manifest §5 `guest-retreat-education-event-parking` (P2)
 * partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import css from './GuestRetreatEducationEventCard.module.css';

interface Props {
  project: LocalProject;
}

type ProgramKind = 'guest' | 'retreat' | 'education' | 'event' | 'parking';

interface ProgramSpec {
  label: string;
  blurb: string;
  /**
   * Zone categories that belong to this program. A zone counts toward
   * the program if its category is in this list, OR if its keyword
   * regex matches name / primaryUse / secondaryUse / notes.
   */
  categories: ZoneCategory[];
  keyword: RegExp;
  /** People per square metre — coarse capacity heuristic. */
  density: number;
  capacityHint: string;
}

const PROGRAMS: Record<ProgramKind, ProgramSpec> = {
  guest: {
    label: 'Guest',
    blurb: 'Where visitors arrive, are oriented, and circulate.',
    categories: ['access', 'commons'],
    keyword: /\b(guest|visitor|reception|orient|welcome|arrival)\b/i,
    density: 0.05,
    capacityHint: '1 person per 20 m² — orientation / drop-off pacing',
  },
  retreat: {
    label: 'Retreat',
    blurb: 'Overnight stays, quiet program, sleeping quarters.',
    categories: ['retreat', 'habitation'],
    keyword: /\b(retreat|cabin|guesthouse|lodging|stay|sleep|dorm)\b/i,
    density: 0.04,
    capacityHint: '1 person per 25 m² — sleeping + private circulation',
  },
  education: {
    label: 'Education',
    blurb: 'Classrooms, demonstration plots, teaching surfaces.',
    categories: ['education'],
    keyword: /\b(class|teach|workshop|learn|demo|interpret|school|course)\b/i,
    density: 0.2,
    capacityHint: '1 student per 5 m² — classroom seating density',
  },
  event: {
    label: 'Event',
    blurb: 'Gatherings, ceremonies, group meals, performances.',
    categories: ['commons', 'spiritual'],
    keyword: /\b(event|gather|ceremony|meal|feast|celebration|wedding|festival|stage)\b/i,
    density: 0.5,
    capacityHint: '1 person per 2 m² — standing gathering density',
  },
  parking: {
    label: 'Parking',
    blurb: 'Vehicle staging — guests, staff, equipment.',
    categories: ['infrastructure', 'access'],
    keyword: /\b(park|lot|car|vehicle|trailer|drive|RV)\b/i,
    density: 0.04,
    capacityHint: '1 vehicle per 25 m² — stall + circulation',
  },
};

const PROGRAM_KINDS: ProgramKind[] = ['guest', 'retreat', 'education', 'event', 'parking'];

const PROJECT_TYPE_LABEL: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
};

type Criticality = 'core' | 'expected' | 'nice';

const EXPECTATIONS_BY_INTENT: Record<string, Partial<Record<ProgramKind, Criticality>>> = {
  regenerative_farm: { education: 'nice', parking: 'expected' },
  retreat_center: { guest: 'core', retreat: 'core', event: 'expected', parking: 'expected' },
  homestead: { guest: 'nice', parking: 'nice' },
  educational_farm: { education: 'core', event: 'expected', parking: 'expected', guest: 'expected' },
  conservation: { education: 'nice', parking: 'nice' },
};

interface ProgramRow {
  kind: ProgramKind;
  zones: LandZone[];
  totalAreaM2: number;
  capacity: number;
  expected: Criticality | null;
}

function classifyZone(zone: LandZone, kind: ProgramKind): boolean {
  const spec = PROGRAMS[kind];
  if (spec.categories.includes(zone.category)) return true;
  const haystack = `${zone.name} ${zone.primaryUse} ${zone.secondaryUse} ${zone.notes}`;
  return spec.keyword.test(haystack);
}

function formatAreaShort(m2: number): string {
  if (m2 <= 0) return '0 m²';
  if (m2 < 1000) return `${Math.round(m2)} m²`;
  if (m2 < 10000) return `${(m2 / 1000).toFixed(1)} k m²`;
  return `${(m2 / 10000).toFixed(2)} ha`;
}

function formatCapacity(kind: ProgramKind, capacity: number): string {
  if (capacity <= 0) return '—';
  const rounded = Math.round(capacity);
  if (kind === 'parking') return `~${rounded} vehicle${rounded === 1 ? '' : 's'}`;
  if (kind === 'event') return `~${rounded} attendee${rounded === 1 ? '' : 's'}`;
  if (kind === 'education') return `~${rounded} student${rounded === 1 ? '' : 's'}`;
  return `~${rounded} ${rounded === 1 ? 'person' : 'people'}`;
}

export default function GuestRetreatEducationEventCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);

  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );

  const projectType = project.projectType ?? '';
  const intentLabel = PROJECT_TYPE_LABEL[projectType] ?? null;
  const expectations = EXPECTATIONS_BY_INTENT[projectType] ?? {};

  const rows: ProgramRow[] = useMemo(() => {
    return PROGRAM_KINDS.map((kind) => {
      const matched = zones.filter((z) => classifyZone(z, kind));
      const totalAreaM2 = matched.reduce((sum, z) => sum + (z.areaM2 || 0), 0);
      const spec = PROGRAMS[kind];
      const capacity = totalAreaM2 * spec.density;
      return {
        kind,
        zones: matched,
        totalAreaM2,
        capacity,
        expected: expectations[kind] ?? null,
      };
    });
  }, [zones, expectations]);

  const totalAreaM2 = useMemo(
    () => zones.reduce((sum, z) => sum + (z.areaM2 || 0), 0),
    [zones],
  );

  const coreUnmet = rows.filter((r) => r.expected === 'core' && r.zones.length === 0).length;
  const expectedUnmet = rows.filter((r) => r.expected === 'expected' && r.zones.length === 0).length;
  const programCovered = rows.filter((r) => r.zones.length > 0).length;

  const verdict =
    !intentLabel
      ? { tone: 'unknown', label: 'Project intent unset — set type to enable program audit' }
      : zones.length === 0
        ? { tone: 'block', label: 'No zones drawn yet — program audit empty' }
        : coreUnmet > 0
          ? { tone: 'block', label: `${coreUnmet} core program${coreUnmet === 1 ? '' : 's'} missing` }
          : expectedUnmet > 0
            ? { tone: 'work', label: `Core covered — ${expectedUnmet} expected program${expectedUnmet === 1 ? '' : 's'} open` }
            : { tone: 'done', label: 'All expected programs allocated' };

  return (
    <section className={css.card} aria-label="Guest, retreat, education, event, parking zones audit">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Guest · Retreat · Education · Event · Parking</h3>
          <p className={css.cardHint}>
            Five program-zone surfaces audited against the project's stated intent.
            Each row shows total allocated area and an approximate capacity ceiling
            (people-density {'\u00d7'} m²) so the program ambition has a realistic upper bound.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={zones.length} label="zones" />
        <Headline value={formatAreaShort(totalAreaM2)} label="total area" />
        <Headline value={programCovered} label="programs covered" />
        <Headline value={coreUnmet} label="core gaps" tone="block" />
      </div>

      {intentLabel && (
        <p className={css.intentLine}>
          Audited for <span className={css.intentTag}>{intentLabel}</span>
        </p>
      )}

      <ul className={css.programList}>
        {rows.map((r) => {
          const spec = PROGRAMS[r.kind];
          const present = r.zones.length > 0;
          const isGap = !present && r.expected !== null;
          return (
            <li
              key={r.kind}
              className={`${css.program} ${present ? css.programMet : ''} ${
                isGap ? css[`programGap_${r.expected}`] ?? '' : ''
              }`}
            >
              <div className={css.programHead}>
                <span className={css.programLabel}>{spec.label}</span>
                {r.expected && (
                  <span className={`${css.expectBadge} ${css[`crit_${r.expected}`]}`}>
                    {r.expected}
                  </span>
                )}
                <span className={css.programArea}>
                  {present ? `${r.zones.length} zone${r.zones.length === 1 ? '' : 's'} · ${formatAreaShort(r.totalAreaM2)}` : 'not allocated'}
                </span>
              </div>
              <p className={css.programBlurb}>{spec.blurb}</p>
              {present && (
                <>
                  <div className={css.capacityRow}>
                    <span className={css.capacityValue}>{formatCapacity(r.kind, r.capacity)}</span>
                    <span className={css.capacityHint}>{spec.capacityHint}</span>
                  </div>
                  <ul className={css.zoneStrip}>
                    {r.zones.map((z) => (
                      <li key={z.id} className={css.zoneChip}>
                        <span
                          className={css.zoneSwatch}
                          style={{ background: ZONE_CATEGORY_CONFIG[z.category]?.color ?? '#888' }}
                        />
                        <span className={css.zoneName}>{z.name}</span>
                        <span className={css.zoneArea}>{formatAreaShort(z.areaM2 || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        Capacity is a planning heuristic, not a permit number {'\u2014'} actual occupancy depends on
        seating layout, fire-code, sanitation, and parking ratios. Use these ceilings to size
        ambition against parcel reality before the feasibility report.
      </p>
    </section>
  );
}

function Headline({
  value,
  label,
  tone,
}: {
  value: number | string;
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
