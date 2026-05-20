/**
 * CoverCropEconomicsCard — PLAN · Phasing & Budgeting (B5.2.x.b C4).
 *
 * Read-only per-phase rollup of cover-crop seed cost (USD) and seeding
 * labor (hours), joined from `CropArea.coverCropPlan` against
 * `COVER_CROP_CATALOG` + per-window steward overrides + the project's
 * declared `BuildPhase` list. Sibling to `LaborBudgetSummaryCard` — same
 * Plan module, different data path.
 *
 * Covenant locked: strictly project cost (D3 territory). "Seed cost" +
 * "Seeding labor" only. No "yield-as-return", no "investment-recovery",
 * no riba/gharar/CSRA/salam/investor/financing/cost-of-capital framing.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import {
  computeCoverCropEconomics,
  UNPHASED_BUCKET_ID,
} from './coverCropEconomicsMath.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap?: () => void;
}

export default function CoverCropEconomicsCard({ project }: Props) {
  const cropAreas = useCropStore((s) => s.cropAreas);
  const allPhases = usePhaseStore((s) => s.phases);

  const report = useMemo(
    () =>
      computeCoverCropEconomics({
        projectId: project.id,
        cropAreas,
        declaredPhases: allPhases,
      }),
    [cropAreas, allPhases, project.id],
  );

  const empty = report.rows.length === 0;
  const fmtUSD = (n: number) =>
    `$${Math.round(n).toLocaleString()}`;
  const fmtHrs = (n: number) => `${n.toFixed(1)} h`;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Phasing &amp; Budgeting</span>
        <h1 className={styles.title}>Cover-crop economics</h1>
        <p className={styles.lede}>
          Per-phase rollup of cover-crop seed cost and seeding labor hours,
          computed from each crop area&apos;s plan against the cited cover-crop
          catalog (SARE 3rd ed. / USDA-NRCS). Steward per-window overrides
          win over catalog defaults. Strictly project cost — no
          yield-as-return framing.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Totals</h2>
        <div className={styles.statRow}>
          <span>
            Seed cost{' '}
            <span className={styles.listMeta}>· catalog default ?? override</span>
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtUSD(report.totalSeedCostUSD)}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>
            Seeding labor{' '}
            <span className={styles.listMeta}>· hours per acre × acres</span>
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtHrs(report.totalSeedingLaborHrs)}
          </span>
        </div>
      </section>

      {empty ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No cover-crop windows with cost data yet — open Plant systems →
            Cover-crop planner to seed a window with a catalog-cited species.
          </p>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>By phase</h2>
          {report.rows.map((row) => (
            <div key={row.phaseId} className={styles.statRow}>
              <span>
                {row.phaseName}
                {row.phaseId === UNPHASED_BUCKET_ID && (
                  <span className={styles.listMeta}>
                    {' '}· crop area phase not joined to a declared phase
                  </span>
                )}
                {row.phaseId !== UNPHASED_BUCKET_ID && (
                  <span className={styles.listMeta}>
                    {' '}· {row.cropAreaCount} area(s) · {row.speciesCount} species
                  </span>
                )}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmtUSD(row.totalSeedCostUSD)} · {fmtHrs(row.totalSeedingLaborHrs)}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(232,220,200,0.55)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Cost data are national averages from SARE&apos;s <em>Managing Cover
          Crops Profitably (3rd ed.)</em> and USDA-NRCS Plant Materials Tech
          Notes. Site-specific calibration is via the per-window steward
          override (Cover-crop planner → Advanced).
        </p>
      </section>
    </div>
  );
}
