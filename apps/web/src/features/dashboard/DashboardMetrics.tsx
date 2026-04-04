/**
 * DashboardMetrics — contextual right sidebar with metric cards.
 */

import type { LocalProject } from '../../store/projectStore.js';
import MetricCard from './components/MetricCard.js';
import css from './DashboardMetrics.module.css';

interface DashboardMetricsProps {
  section: string;
  project: LocalProject;
}

export default function DashboardMetrics({ section }: DashboardMetricsProps) {
  return (
    <aside className={css.sidebar}>
      <h3 className={css.title}>
        {SECTION_TITLES[section] ?? 'Regenerative Metrics'}
      </h3>
      <div className={css.cards}>
        {getMetricsForSection(section).map((m, i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>

      {/* Stewardship guidance card */}
      <div className={css.guidanceCard}>
        <div className={css.guidanceIcon}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#c4a265" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
          </svg>
        </div>
        <p className={css.guidanceTitle}>Teaming With Life</p>
        <p className={css.guidanceDesc}>
          Soil microbiology is responding to the current stewardship protocol. Continue monitoring for seasonal shifts.
        </p>
      </div>
    </aside>
  );
}

const SECTION_TITLES: Record<string, string> = {
  'grazing-analysis': 'Regenerative Metrics',
  'livestock-inventory': 'Inventory Summary',
  'health-ledger': 'Health Metrics',
  'forest-hub': 'Forest Metrics',
  'nursery-ledger': 'Nursery Summary',
  'hydrology-dashboard': 'Water Metrics',
  'biomass': 'Biomass Metrics',
};

interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: string;
  trendPositive?: boolean;
}

function getMetricsForSection(section: string): MetricData[] {
  switch (section) {
    case 'grazing-analysis':
      return [
        { label: 'Forage Maturity Score', value: '8.4', trend: '+1.2 pts', trendPositive: true, description: 'Indicating high-density structural carbohydrates and optimal nutrient availability.' },
        { label: 'Soil Carbon Sequestration', value: '12.8', unit: 'TCO2E/HA', description: 'Estimated annual capture via root depth and mycorrhizal networks.' },
        { label: 'Cumulative Grazing Days', value: '1,420', unit: 'Optimal', description: 'Total pressure across all sectors. Sustainability threshold maintained.' },
      ];
    case 'livestock-inventory':
    case 'health-ledger':
      return [
        { label: 'Total Animal Units', value: '218.4' },
        { label: 'Forage Demand', value: 'Within Capacity' },
        { label: 'Avg Body Condition', value: '6.2', unit: 'Score' },
      ];
    case 'forest-hub':
    case 'nursery-ledger':
      return [
        { label: 'Total Trees on Site', value: '2,480' },
        { label: 'Survival Rate', value: '96', unit: '%' },
        { label: 'Planting Density', value: '120', unit: 'TPA' },
        { label: 'Avg Annual Growth', value: '2.4', unit: 'ft' },
      ];
    case 'hydrology-dashboard':
      return [
        { label: 'Total Storage Capacity', value: '1.2M', unit: 'Gallons' },
        { label: 'Annual Catchment Potential', value: '4.8M', unit: 'Gallons/Year' },
        { label: 'Drought Buffer', value: '214', unit: 'Days' },
      ];
    default:
      return [
        { label: 'Data Completeness', value: '—', description: 'Metrics will appear here as data is populated.' },
      ];
  }
}
