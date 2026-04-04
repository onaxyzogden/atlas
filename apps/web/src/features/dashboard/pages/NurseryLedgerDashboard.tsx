/**
 * NurseryLedgerDashboard — Stock inventory, growth trends, trials, milestones.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './NurseryLedgerDashboard.module.css';

interface NurseryLedgerDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const STOCKS = [
  { name: 'Hybrid Chestnut Batch A', count: 1420, unit: 'Heads', vitality: 94.2, lastCheck: '14h ago' },
  { name: 'Elderberry Nursery B', count: 1060, unit: 'Heads', vitality: 88.7, lastCheck: '2d ago' },
];

const MILESTONES = [
  { num: '01', title: 'Spring Planting Window', date: 'Mar 15 — Apr 20' },
  { num: '02', title: 'Inventory Audit', date: 'Scheduled for May 02' },
  { num: '03', title: 'Seed Stratification', date: 'Mid-summer cycle' },
];

export default function NurseryLedgerDashboard({ project, onSwitchToMap }: NurseryLedgerDashboardProps) {
  return (
    <div className={css.page}>
      <h1 className={css.title}>Forest Inventory Ledger</h1>
      <p className={css.desc}>
        Systematic monitoring of tree health, sapling mortality rates, and physiological
        trends across the OGDEN estates.
      </p>

      {/* Stock cards */}
      <div className={css.stockRow}>
        {STOCKS.map((s) => (
          <div key={s.name} className={css.stockCard}>
            <span className={css.stockLabel}>ACTIVE STOCK</span>
            <h3 className={css.stockName}>{s.name}</h3>
            <div className={css.stockStats}>
              <div>
                <span className={css.stockValue}>{s.count.toLocaleString()}</span>
                <span className={css.stockUnit}>{s.unit}</span>
              </div>
              <div className={css.stockRight}>
                <span className={css.stockCheckLabel}>Last Check</span>
                <span className={css.stockCheckValue}>{s.lastCheck}</span>
              </div>
            </div>
            <span className={css.stockVitality}>Vitality Score: {s.vitality}%</span>
          </div>
        ))}
      </div>

      {/* Detailed ledger */}
      <div className={css.ledgerSection}>
        <div className={css.ledgerHeader}>
          <h3 className={css.ledgerTitle}>Hybrid Chestnut - Detailed Ledger</h3>
          <span className={css.ledgerTrend}>GROWTH TREND (MOM)</span>
        </div>

        <SimpleBarChart
          data={[
            { label: 'JAN', value: 30, color: 'rgba(138,154,116,0.4)' },
            { label: 'FEB', value: 35, color: 'rgba(138,154,116,0.45)' },
            { label: 'MAR', value: 42, color: 'rgba(138,154,116,0.5)' },
            { label: 'APR', value: 52, color: 'rgba(138,154,116,0.55)' },
            { label: 'MAY', value: 65, color: 'rgba(138,154,116,0.65)' },
            { label: 'JUN', value: 82, color: '#8a9a74' },
            { label: 'JUL', value: 75, color: 'rgba(138,154,116,0.7)' },
            { label: 'AUG', value: 70, color: 'rgba(138,154,116,0.6)' },
          ]}
          height={200}
        />

        <div className={css.trialStats}>
          <div className={css.trialStat}>
            <span className={css.trialLabel}>ACTIVE TRIALS</span>
            <span className={css.trialValue}>12 Units</span>
          </div>
          <div className={css.trialStat}>
            <span className={css.trialLabel}>TARGET BIO-MASS</span>
            <span className={css.trialValue}>820kg</span>
          </div>
          <div className={css.trialStat}>
            <span className={css.trialLabel}>EFFICIENCY</span>
            <span className={css.trialValue}>+12.4%</span>
          </div>
        </div>
      </div>

      {/* Upcoming milestones */}
      <div className={css.milestonesSection}>
        <h3 className={css.milestonesTitle}>Upcoming Milestones</h3>
        <div className={css.milestonesList}>
          {MILESTONES.map((m) => (
            <div key={m.num} className={css.milestoneItem}>
              <span className={css.milestoneNum}>{m.num}</span>
              <div>
                <span className={css.milestoneName}>{m.title}</span>
                <span className={css.milestoneDate}>{m.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className={css.reportBtn}>
        GENERATE INVENTORY REPORT
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
