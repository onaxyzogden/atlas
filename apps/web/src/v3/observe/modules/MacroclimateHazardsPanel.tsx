import type { ModulePanel } from './types.js';
import MacroclimateDashboard from './macroclimate-hazards/MacroclimateDashboard.js';
import SolarClimateDetail from './macroclimate-hazards/SolarClimateDetail.js';
import HazardsLogDetail from './macroclimate-hazards/HazardsLogDetail.js';

type DetailKey = 'solar-climate' | 'hazards-log';

const panel: ModulePanel<DetailKey> = {
  Dashboard: MacroclimateDashboard,
  details: {
    'solar-climate': SolarClimateDetail,
    'hazards-log': HazardsLogDetail,
  },
  detailLabels: {
    'solar-climate': 'Solar & Climate',
    'hazards-log': 'Hazards Log',
  },
};

export default panel;
