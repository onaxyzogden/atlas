/**
 * NurseryLedgerDashboard — propagation inventory, germination calendar,
 * readiness tracking, stock transfers, seed saving notes.
 *
 * All data from nurseryStore, climate adapter, zoneStore, and microclimate.
 * No hardcoded stock or phenology data.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { useNurseryStore } from '../../../store/nurseryStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import {
  computeGerminationCalendar,
  computeNurseryMicroclimate,
  computeReadinessTracking,
  computeStockSummary,
} from '../../nursery/nurseryAnalysis.js';
import { PROPAGATION_BY_SPECIES } from '../../nursery/propagationData.js';
import css from './NurseryLedgerDashboard.module.css';

interface NurseryLedgerDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary {
  first_frost_date?: string;
  last_frost_date?: string;
  hardiness_zone?: string;
  growing_season_days?: number;
}
interface MicroclimateSummary {
  sun_trap_count?: number;
  frost_risk_high_pct?: number;
  wind_shelter_pct?: number;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STAGE_LABELS: Record<string, string> = {
  seed: 'Seed', germinating: 'Germinating', seedling: 'Seedling',
  juvenile: 'Juvenile', ready_to_plant: 'Ready',
};

export default function NurseryLedgerDashboard({ project, onSwitchToMap }: NurseryLedgerDashboardProps) {
  const siteData = useSiteData(project.id);
  const allBatches = useNurseryStore((s) => s.batches);
  const allTransfers = useNurseryStore((s) => s.transfers);
  const allZones = useZoneStore((s) => s.zones);

  const climate = useMemo(() => siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null, [siteData]);
  const microclimate = useMemo(() => siteData ? getLayerSummary<MicroclimateSummary>(siteData, 'microclimate') : null, [siteData]);

  const batches = useMemo(() => allBatches.filter((b) => b.projectId === project.id), [allBatches, project.id]);
  const transfers = useMemo(() => allTransfers.filter((t) => t.projectId === project.id), [allTransfers, project.id]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);

  // Germination calendar from climate data
  const calendar = useMemo(() => computeGerminationCalendar(climate), [climate]);

  // Nursery zone microclimate
  const nurseryMicro = useMemo(() => computeNurseryMicroclimate(zones, microclimate), [zones, microclimate]);

  // Readiness tracking
  const readiness = useMemo(() => computeReadinessTracking(batches, zones), [batches, zones]);

  // Stock summary
  const summary = useMemo(() => computeStockSummary(batches), [batches]);

  // Seed saving batches
  const seedSaving = useMemo(() => batches.filter((b) => b.seedSaving), [batches]);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Nursery Ledger</h1>
      <p className={css.desc}>
        Propagation inventory, germination calendar, and readiness tracking.
        Climate zone: {climate?.hardiness_zone ?? 'loading...'}.
      </p>

      {/* ── Summary ────────────────────────────────────────────── */}
      <div className={css.summaryGrid}>
        <div className={css.summaryCard}>
          <span className={css.summaryValue}>{summary.totalBatches}</span>
          <span className={css.summaryUnit}>BATCHES</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryValue}>{summary.totalQuantity.toLocaleString()}</span>
          <span className={css.summaryUnit}>TOTAL PLANTS</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryValue}>{summary.seedSavingCount}</span>
          <span className={css.summaryUnit}>SEED SAVING</span>
        </div>
      </div>

      {/* ── Propagation Inventory ──────────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>PROPAGATION INVENTORY</h2>
        {batches.length > 0 ? (
          <div className={css.stockRow}>
            {batches.map((b) => {
              const info = PROPAGATION_BY_SPECIES[b.species];
              return (
                <div key={b.id} className={css.stockCard}>
                  <div className={css.stockHeader}>
                    <h3 className={css.stockName}>{info?.commonName ?? b.species}</h3>
                    <div>
                      <span className={css.stageBadge}>{STAGE_LABELS[b.stage] ?? b.stage}</span>
                      <span className={css.methodBadge}>{b.method}</span>
                    </div>
                  </div>
                  <div className={css.stockStats}>
                    <span className={css.stockValue}>{b.quantity.toLocaleString()}<span className={css.stockUnit}>plants</span></span>
                  </div>
                  {b.notes && <div style={{ fontSize: 11, color: 'rgba(240,253,244,0.4)', marginTop: 6 }}>{b.notes}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={css.emptyState}>
            No propagation batches yet. Add batches to track nursery stock.
          </div>
        )}
      </div>

      {/* ── Germination Calendar ───────────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>GERMINATION CALENDAR</h2>
        <div className={css.calendarWrap}>
          {/* Month headers */}
          <div className={css.calMonthRow}>
            <div />
            {MONTH_LABELS.map((m) => (
              <div key={m} className={css.calMonth}>{m}</div>
            ))}
          </div>

          {/* Species rows */}
          {calendar.slice(0, 12).map((entry) => (
            <div key={entry.speciesId} className={css.calRow}>
              <span className={css.calSpeciesLabel}>{entry.commonName}</span>
              {MONTH_LABELS.map((_, idx) => {
                const isSow = idx === entry.sowMonth;
                const isTransplant = idx === entry.transplantMonth;
                return (
                  // a11y: keyboard tooltip deferred — see accessibility-audit.md §5
                  // (calendar grid: 12×N cells would spam focus order)
                  <div
                    key={idx}
                    className={isSow ? css.calCellSow : isTransplant ? css.calCellTransplant : css.calCell}
                    title={isSow ? `Sow: ${entry.germinationDays}` : isTransplant ? 'Transplant window' : ''}
                  />
                );
              })}
            </div>
          ))}

          <div className={css.calLegend}>
            <span><span className={css.calLegendDot} style={{ background: 'rgba(21,128,61,0.45)' }} /> Sow</span>
            <span><span className={css.calLegendDot} style={{ background: 'rgba(202,138,4,0.45)' }} /> Transplant</span>
          </div>
        </div>
      </div>

      {/* ── Nursery Zone Microclimate ──────────────────────────── */}
      {nurseryMicro.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>NURSERY ZONE MICROCLIMATE</h2>
          {nurseryMicro.map((nz) => (
            <div key={nz.zoneId} className={css.readinessItem}>
              <div className={css.readinessLeft}>
                <div className={css.readinessSpecies}>{nz.zoneName}</div>
                <div className={css.readinessDest}>
                  Sun: {nz.sunExposure}% &middot; Frost risk: {nz.frostRisk}% &middot; Wind shelter: {nz.windShelter}%
                </div>
              </div>
              <span className={css.readinessDays}>Score: {nz.overallScore}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Readiness Tracking ─────────────────────────────────── */}
      {readiness.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>READINESS TRACKING</h2>
          {readiness.map((r) => (
            <div key={r.batchId} className={r.isOverdue ? css.readinessOverdue : css.readinessItem}>
              <div className={css.readinessLeft}>
                <div className={css.readinessSpecies}>
                  {r.species} ({r.quantity} plants)
                </div>
                {r.destinationZone && (
                  <div className={css.readinessDest}>{'\u2192'} {r.destinationZone}</div>
                )}
              </div>
              <span className={r.isOverdue ? css.readinessDaysOverdue : css.readinessDays}>
                {r.isOverdue ? 'Overdue' : `${r.daysRemaining}d`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Stock Transfer Log ─────────────────────────────────── */}
      {transfers.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>STOCK TRANSFER LOG</h2>
          {transfers.map((t) => (
            <div key={t.id} className={css.transferItem}>
              {t.quantity} plants transferred on {new Date(t.transferDate).toLocaleDateString()}
              {t.notes && ` \u2014 ${t.notes}`}
            </div>
          ))}
        </div>
      )}

      {/* ── Seed Saving Notes ──────────────────────────────────── */}
      {seedSaving.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>SEED SAVING</h2>
          {seedSaving.map((b) => {
            const info = PROPAGATION_BY_SPECIES[b.species];
            const windowLabel = info?.seedSavingWindow?.replace('_', ' ') ?? 'unknown';
            return (
              <div key={b.id} className={css.seedSavingItem}>
                <div className={css.seedSavingSpecies}>{info?.commonName ?? b.species}</div>
                <div className={css.seedSavingWindow}>Harvest window: {windowLabel}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stock Summary by Stage ─────────────────────────────── */}
      {summary.byStage.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>STOCK BY STAGE</h2>
          {summary.byStage.map((s) => (
            <div key={s.stage} className={css.readinessItem}>
              <span className={css.readinessSpecies}>{STAGE_LABELS[s.stage] ?? s.stage}</span>
              <span className={css.readinessDays}>{s.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <button className={css.reportBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
