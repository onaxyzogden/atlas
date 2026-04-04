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
  'herd-rotation': 'Rotation Metrics',
  'paddock-design': 'Paddock Overview',
  'livestock-inventory': 'Inventory Summary',
  'health-ledger': 'Health Metrics',
  'planting-tool': 'Design Metrics',
  'forest-hub': 'Forest Metrics',
  'carbon-diagnostic': 'Carbon Metrics',
  'nursery-ledger': 'Nursery Summary',
  'hydrology-dashboard': 'Water Metrics',
  'cartographic': 'Spatial Data',
  'ecological': 'Ecological Metrics',
  'terrain-dashboard': 'Terrain Metrics',
  'stewardship': 'Stewardship Goals',
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
    case 'herd-rotation':
      return [
        { label: 'Active Paddock', value: '09', description: 'The Basin — 4.5 acres, 3 days on site.' },
        { label: 'Herd Size', value: '142', unit: 'Head', description: 'Angus Cross herd, North Range sector.' },
        { label: 'Rest Cycle Target', value: '120', unit: 'Days', description: 'Minimum rest for structural root resilience.' },
        { label: 'Soil Moisture', value: '22.4', unit: '%', trend: '+3.1%', trendPositive: true },
      ];
    case 'paddock-design':
      return [
        { label: 'Total Paddocks', value: '6' },
        { label: 'Total Acreage', value: '20.9', unit: 'Acres' },
        { label: 'Avg Rest Period', value: '40', unit: 'Days' },
        { label: 'Active Grazing', value: '04A', description: 'The Basin — currently occupied.' },
      ];
    case 'livestock-inventory':
    case 'health-ledger':
      return [
        { label: 'Total Animal Units', value: '218.4', unit: 'AU' },
        { label: 'Total Head', value: '452' },
        { label: 'Stocking Rate', value: '1.2', unit: 'AU/Acre' },
        { label: 'Forage Demand', value: 'High' },
      ];
    case 'planting-tool':
      return [
        { label: 'Total Linear Feet', value: '2,480' },
        { label: 'Tree Count', value: '124' },
        { label: 'Canopy Cover (Yr 15)', value: '22', unit: '%' },
        { label: 'In-Row Spacing', value: '20', unit: 'ft' },
      ];
    case 'forest-hub':
      return [
        { label: 'Tree Health Index', value: '94', unit: '%', trend: '+1.2%', trendPositive: true },
        { label: 'Canopy Vitality', value: '0.82', unit: 'NDVI' },
        { label: 'F:B Ratio', value: '3.2:1', description: 'Optimal for forest — target range 2.0–5.0' },
        { label: 'Mycorrhizal Colonization', value: '78', unit: '%' },
      ];
    case 'carbon-diagnostic':
      return [
        { label: 'Maturity Score', value: '8.2', description: 'Prime Growth phase' },
        { label: 'Carbon Sequestration', value: '42.5', unit: 'TCO2e/HA' },
        { label: 'Biomass Accumulation', value: '+18', unit: '% YoY', trend: '+18%', trendPositive: true },
        { label: 'Stand Age', value: '7', unit: 'Years' },
      ];
    case 'nursery-ledger':
      return [
        { label: 'Total Trees on Site', value: '2,480' },
        { label: 'Survival Rate', value: '96', unit: '%' },
        { label: 'Planting Density', value: '120', unit: 'TPA' },
        { label: 'Avg Annual Growth', value: '2.4', unit: 'ft' },
      ];
    case 'hydrology-dashboard':
      return [
        { label: 'Water Resilience Score', value: '84', unit: '/100' },
        { label: 'Total Storage', value: '1.2M', unit: 'Gallons' },
        { label: 'Catchment Potential', value: '4.8M', unit: 'Gal/Year' },
        { label: 'Drought Buffer', value: '214', unit: 'Days', trend: '+14 days', trendPositive: true },
      ];
    case 'cartographic':
      return [
        { label: 'Active Layers', value: '5', description: 'Topographic, Watershed, Soil, Flood, Aerial' },
        { label: 'Survey Accuracy', value: '\u00b10.5', unit: 'm' },
        { label: 'Datum', value: 'NAD83' },
      ];
    case 'ecological':
      return [
        { label: 'Regenerative Potential', value: '85', unit: '/100' },
        { label: 'Organic Matter', value: '5', unit: '%' },
        { label: 'Shannon Diversity', value: '3.2', description: 'Target: >3.5 for high biodiversity' },
        { label: 'Zones Assessed', value: '4' },
      ];
    case 'terrain-dashboard':
      return [
        { label: 'Total Relief', value: '44', unit: 'm' },
        { label: 'Avg Slope', value: '6.2', unit: '%' },
        { label: 'Highest Point', value: '412', unit: 'm ASL' },
        { label: 'Erosion Risk', value: 'Low-Mod' },
      ];
    case 'stewardship':
      return [
        { label: 'Goals on Track', value: '4/5' },
        { label: 'Action Items', value: '4', description: '1 high priority, 2 medium, 1 low' },
        { label: 'Carbon Target', value: '50', unit: 'TCO2e/ha', description: 'By Year 10 — currently at 85%' },
      ];
    default:
      return [
        { label: 'Data Completeness', value: '—', description: 'Metrics will appear here as data is populated.' },
      ];
  }
}
