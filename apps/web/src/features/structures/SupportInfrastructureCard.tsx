/**
 * SupportInfrastructureCard — §9 dashboard card that rolls up the four
 * "support infrastructure" structure subtypes (storage shed, animal
 * shelter, compost station, water/pump house) so stewards can see at a
 * glance what operational scaffolding has been placed on the site
 * alongside their dwellings, gathering, and utility systems.
 *
 * The structure-placement picker (DesignToolsPanel "structures" tab)
 * already exposes all four subtypes via the existing category iteration
 * — this card is the missing read-side rollup that surfaces "what have
 * we put down" by subtype, with floor-area and cost-range totals.
 *
 * Pure presentation: structureStore + STRUCTURE_TEMPLATES drive
 * everything. No new entities, no shared-package math.
 *
 * Spec: §9 `storage-shelter-compost-pumphouse-placement` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useStructureStore,
  type StructureType,
} from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from './footprints.js';
import css from './SupportInfrastructureCard.module.css';

interface Props {
  projectId: string;
}

/**
 * The four structure subtypes the §9 spec calls out as "support
 * infrastructure". Order matches the section heading: "Storage, animal
 * shelter, compost, water/pump house placement".
 */
const SUPPORT_TYPES: StructureType[] = [
  'storage',
  'animal_shelter',
  'compost_station',
  'water_pump_house',
];

interface SubtypeRow {
  type: StructureType;
  label: string;
  icon: string;
  count: number;
  floorAreaM2: number;
  costLowUsd: number;
  costHighUsd: number;
  costMidUsd: number;
}

const fmtUsd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
      ? `$${Math.round(n / 1000)}k`
      : `$${n.toLocaleString()}`;

export default function SupportInfrastructureCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);

  const { rows, totals } = useMemo(() => {
    const projectStructures = allStructures.filter((s) => s.projectId === projectId);

    const subtypeRows: SubtypeRow[] = SUPPORT_TYPES.map((type) => {
      const tmpl = STRUCTURE_TEMPLATES[type];
      const items = projectStructures.filter((s) => s.type === type);
      let area = 0;
      let lo = 0;
      let hi = 0;
      for (const s of items) {
        area += (s.widthM ?? tmpl.widthM) * (s.depthM ?? tmpl.depthM);
        // Per-instance cost: use steward-entered estimate when present,
        // otherwise fall back to the midpoint of the template's range so
        // the rollup still gives a meaningful order-of-magnitude.
        if (typeof s.costEstimate === 'number' && s.costEstimate > 0) {
          lo += s.costEstimate;
          hi += s.costEstimate;
        } else {
          lo += tmpl.costRange[0];
          hi += tmpl.costRange[1];
        }
      }
      return {
        type,
        label: tmpl.label,
        icon: tmpl.icon,
        count: items.length,
        floorAreaM2: area,
        costLowUsd: lo,
        costHighUsd: hi,
        costMidUsd: (lo + hi) / 2,
      };
    });

    const t = subtypeRows.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        floorAreaM2: acc.floorAreaM2 + r.floorAreaM2,
        costLowUsd: acc.costLowUsd + r.costLowUsd,
        costHighUsd: acc.costHighUsd + r.costHighUsd,
      }),
      { count: 0, floorAreaM2: 0, costLowUsd: 0, costHighUsd: 0 },
    );

    return { rows: subtypeRows, totals: t };
  }, [allStructures, projectId]);

  if (totals.count === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Support Infrastructure</h2>
          <span className={css.cardHint}>
            §9 &mdash; storage, animal shelter, compost, water/pump house.
          </span>
        </div>
        <div className={css.empty}>
          No support infrastructure placed yet. Use the Map view &rarr; Design
          Tools &rarr; Structures tab to drop a Storage Shed, Animal Shelter,
          Compost Station, or Pump House &mdash; this card will roll them up
          by subtype with floor area and cost-range totals.
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
        <h2 className={css.cardTitle}>Support Infrastructure ({totals.count})</h2>
        <span className={css.cardHint}>
          §9 &mdash; storage, animal shelter, compost, water/pump house.
        </span>
      </div>

      <div className={css.totals}>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Items</span>
          <span className={css.totalValue}>{totals.count}</span>
        </div>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Floor area</span>
          <span className={css.totalValue}>
            {Math.round(totals.floorAreaM2).toLocaleString()} m&sup2;
          </span>
        </div>
        <div className={css.totalCell}>
          <span className={css.totalLabel}>Cost range</span>
          <span className={css.totalValue}>
            {fmtUsd(totals.costLowUsd)}&ndash;{fmtUsd(totals.costHighUsd)}
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
                    <span>
                      {fmtUsd(r.costLowUsd)}&ndash;{fmtUsd(r.costHighUsd)}
                    </span>
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
        Cost ranges use steward-entered estimates when set, otherwise fall
        back to the per-type template range from{' '}
        <code>features/structures/footprints.ts</code>. Floor area is the
        per-instance footprint (width &times; depth).
      </div>
    </div>
  );
}
