/**
 * LivingRootsCard — B5.1 cover-crop & living-roots audit surface.
 * Cross-registered under both the plant-systems and soil-fertility Plan
 * modules (one card, one sectionId, two surfacing tabs).
 *
 * Renders the parcel-level living-roots coverage % with per-area rows
 * showing which months carry living roots. Projects toward the new
 * `living-roots-coverage-pct` goal-tree criterion (sibling of
 * `regen-soil-cover` under `soil-health`).
 *
 * Strictly presentational. No store writes, no save gate. Reads
 * `useCropStore.cropAreas` filtered by `projectId`, calls
 * `computeLivingRootsReport` in a single useMemo.
 *
 * Covenant: soil-vitality (months of living roots in the ground) only.
 * Never a financial or yield-as-return notion — no riba / gharar / CSRA /
 * salam / investor / financing / cost-of-capital framing.
 */

import { useMemo } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { computeLivingRootsReport } from './livingRootsMath.js';
import css from './LivingRootsCard.module.css';

interface Props {
  projectId: string;
}

const AREA_PREVIEW_CAP = 8;
const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function pillClassFor(pct: number, base: typeof css): string {
  if (pct >= 70) return `${base.pill} ${base.pillGreen}`;
  if (pct >= 40) return `${base.pill} ${base.pillAmber}`;
  return `${base.pill} ${base.pillRed}`;
}

export default function LivingRootsCard({ projectId }: Props) {
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const report = useMemo(
    () => computeLivingRootsReport({ projectId, cropAreas: allCropAreas }),
    [projectId, allCropAreas],
  );

  const Head = () => (
    <div className={css.cardHead}>
      <div>
        <h3 className={css.cardTitle}>Living-roots audit</h3>
        <p className={css.cardHint}>
          Projected % of cropped area carrying living roots year-round, area-
          weighted across all crop areas in this parcel. Months of living
          roots — a soil-vitality projection. Add a cover-crop window to any
          crop area to light it up.
        </p>
      </div>
      <span className={css.modeBadge}>Read-only</span>
    </div>
  );

  if (report.overall.areaCount === 0) {
    return (
      <section className={css.card}>
        <Head />
        <div className={css.empty}>
          No crop areas yet — draw a row crop, garden bed, or orchard in the
          plant-systems module to begin the audit.
        </div>
      </section>
    );
  }

  if (report.overall.plannedAreaM2 === 0) {
    return (
      <section className={css.card}>
        <Head />
        <div className={css.empty}>
          No cover-crop plans yet — add a window to any crop area in the
          plant-systems module to begin the audit.
        </div>
      </section>
    );
  }

  const areaPreview = report.rows.slice(0, AREA_PREVIEW_CAP);
  const areaRest = report.rows.length - areaPreview.length;

  return (
    <section className={css.card}>
      <Head />

      <div className={css.headline}>
        <span className={css.headlineNumber}>
          {report.overall.coveragePct.toFixed(0)}
        </span>
        <span className={css.headlineLabel}>living-roots coverage %</span>
        <span className={pillClassFor(report.overall.coveragePct, css)}>
          {report.overall.coveragePct >= 70
            ? 'on track'
            : report.overall.coveragePct >= 40
              ? 'building'
              : 'sparse'}
        </span>
      </div>

      <div className={css.bandTitle}>Parcel</div>
      <div className={css.counterGrid}>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.plannedAreaM2.toFixed(0)}
          </span>
          <span className={css.counterLabel}>Planned m²</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.totalAreaM2.toFixed(0)}
          </span>
          <span className={css.counterLabel}>Total m²</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.distinctSpeciesCount}
          </span>
          <span className={css.counterLabel}>Distinct species</span>
        </div>
      </div>

      {report.overall.rolesPresent.length > 0 ? (
        <div className={css.categoryBlock}>
          <span className={css.categoryLabel}>Roles present:</span>{' '}
          {report.overall.rolesPresent.map((r) => (
            <span key={r} className={css.categoryChip}>
              {r.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ) : null}

      <div className={css.areaList}>
        <div className={css.bandTitle}>Per crop area</div>
        {areaPreview.map((row) => (
          <div key={row.cropAreaId} className={css.areaRow}>
            <div className={css.areaHead}>
              <span className={css.areaName}>{row.cropAreaName}</span>
              <span className={css.areaPct}>{row.coveragePct.toFixed(0)}%</span>
            </div>
            <div className={css.monthStrip}>
              {MONTH_LABELS.map((label, i) => (
                <span
                  key={i}
                  className={`${css.monthCell} ${
                    row.monthsCovered[i] ? css.monthOn : css.monthOff
                  }`}
                  aria-label={`Month ${i + 1}: ${
                    row.monthsCovered[i] ? 'living roots' : 'bare'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ))}
        {areaRest > 0 ? (
          <div className={css.areaMore}>+{areaRest} more</div>
        ) : null}
      </div>
    </section>
  );
}
