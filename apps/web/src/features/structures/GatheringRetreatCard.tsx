/**
 * GatheringRetreatCard — §9 dashboard card that rolls up the four
 * "gathering and retreat" structure subtypes called out by the spec line
 * "Tent / glamping layout, outdoor gathering, fire circle, lookout
 * placement": tent_glamping, pavilion (open-air gathering), fire_circle,
 * lookout. Sibling to SupportInfrastructureCard but framed for the
 * Educational Atlas surface — what program / retreat capacity has the
 * design committed to.
 *
 * Pure presentation: structureStore + STRUCTURE_TEMPLATES drive
 * everything. No new entities, no shared-package math.
 *
 * Spec: §9 `tent-glamping-gathering-firecircle-lookout` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useStructureStore,
  type StructureType,
} from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from './footprints.js';
import css from './GatheringRetreatCard.module.css';

interface Props {
  projectId: string;
}

/**
 * The four structure subtypes the §9 spec calls out as "gathering and
 * retreat" surfaces. Order follows the spec line: "Tent / glamping
 * layout, outdoor gathering, fire circle, lookout placement". Pavilion
 * is the canonical "outdoor gathering" template (its `description` reads
 * "Open-air gathering structure").
 *
 * Classroom is intentionally excluded — it lives under the §9
 * `prayer-bathhouse-classroom-placement` line and is rolled up there.
 */
const GATHERING_TYPES: StructureType[] = [
  'tent_glamping',
  'pavilion',
  'fire_circle',
  'lookout',
];

/**
 * Heuristic per-subtype seating capacity. These are presentation-layer
 * defaults — a programming director would tune them for a specific
 * site, but the order-of-magnitude is what stewards need to answer
 * "can we host a 60-person retreat?" without leaving the dashboard.
 */
const SEATS_PER_INSTANCE: Record<StructureType, number> = {
  cabin: 0, yurt: 0, pavilion: 40, greenhouse: 0, barn: 0, workshop: 0,
  prayer_space: 0, bathhouse: 0, classroom: 0,
  storage: 0, animal_shelter: 0, compost_station: 0, water_pump_house: 0,
  tent_glamping: 2, fire_circle: 16, lookout: 4,
  earthship: 0, solar_array: 0, well: 0, water_tank: 0,
};

interface SubtypeRow {
  type: StructureType;
  label: string;
  icon: string;
  count: number;
  floorAreaM2: number;
  seats: number;
}

export default function GatheringRetreatCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);

  const { rows, totals } = useMemo(() => {
    const projectStructures = allStructures.filter((s) => s.projectId === projectId);

    const subtypeRows: SubtypeRow[] = GATHERING_TYPES.map((type) => {
      const tmpl = STRUCTURE_TEMPLATES[type];
      const items = projectStructures.filter((s) => s.type === type);
      let area = 0;
      for (const s of items) {
        area += (s.widthM ?? tmpl.widthM) * (s.depthM ?? tmpl.depthM);
      }
      return {
        type,
        label: tmpl.label,
        icon: tmpl.icon,
        count: items.length,
        floorAreaM2: area,
        seats: items.length * SEATS_PER_INSTANCE[type],
      };
    });

    const t = subtypeRows.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        floorAreaM2: acc.floorAreaM2 + r.floorAreaM2,
        seats: acc.seats + r.seats,
      }),
      { count: 0, floorAreaM2: 0, seats: 0 },
    );

    return { rows: subtypeRows, totals: t };
  }, [allStructures, projectId]);

  if (totals.count === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Gathering &amp; Retreat Spaces</h2>
          <span className={css.cardHint}>
            §9 &mdash; tent / glamping, outdoor gathering, fire circle, lookout.
          </span>
        </div>
        <div className={css.empty}>
          No gathering or retreat spaces placed yet. Use the Map view &rarr;
          Design Tools &rarr; Structures tab to drop a Pavilion, Tent /
          Glamping site, Fire Circle, or Lookout &mdash; this card will roll
          them up by subtype with a heuristic seating capacity total so
          stewards can answer &ldquo;can we host this retreat?&rdquo; at a glance.
        </div>
      </div>
    );
  }

  // Bar widths normalize against the largest single bucket so the
  // visualization shows relative weight rather than absolute scale.
  const maxArea = Math.max(...rows.map((r) => r.floorAreaM2), 1);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Gathering &amp; Retreat Spaces ({totals.count})</h2>
        <span className={css.cardHint}>
          §9 &mdash; tent / glamping, outdoor gathering, fire circle, lookout.
        </span>
      </div>

      <div className={css.totals}>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Sites</span>
          <span className={css.totalValue}>{totals.count}</span>
        </div>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Floor area</span>
          <span className={css.totalValue}>
            {Math.round(totals.floorAreaM2).toLocaleString()} m&sup2;
          </span>
        </div>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Seating capacity</span>
          <span className={css.totalValue}>
            ~{totals.seats.toLocaleString()}
          </span>
        </div>
      </div>

      <ul className={css.subtypeList}>
        {rows.map((r) => {
          const widthPct = r.count > 0 ? (r.floorAreaM2 / maxArea) * 100 : 0;
          return (
            <li key={r.type} className={css.subtypeRow}>
              <div className={css.subtypeHead}>
                <span className={css.subtypeIcon}>{r.icon}</span>
                <span className={css.subtypeName}>{r.label}</span>
                <span className={css.subtypeCount}>
                  {r.count === 0 ? '—' : `${r.count} placed`}
                </span>
              </div>
              <div className={css.subtypeBarTrack}>
                <div
                  className={css.subtypeBarFill}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className={css.subtypeMeta}>
                {r.count > 0 ? (
                  <>
                    <span>{Math.round(r.floorAreaM2).toLocaleString()} m&sup2;</span>
                    <span>~{r.seats} seats</span>
                  </>
                ) : (
                  <span className={css.subtypeMetaMuted}>Not yet placed</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={css.footnote}>
        Seating capacity is a heuristic per-instance default (
        {SEATS_PER_INSTANCE.pavilion} per pavilion,{' '}
        {SEATS_PER_INSTANCE.fire_circle} per fire circle,{' '}
        {SEATS_PER_INSTANCE.lookout} per lookout,{' '}
        {SEATS_PER_INSTANCE.tent_glamping} per tent / glamping site).
        Programming directors should tune these for the specific site &mdash;
        the totals are an order-of-magnitude check, not a booking system.
      </div>
    </div>
  );
}
