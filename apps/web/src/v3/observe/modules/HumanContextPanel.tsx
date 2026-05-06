import type { ModulePanel } from './types.js';
import HumanContextDashboard from './human-context/HumanContextDashboard.js';
import StewardSurveyDetail from './human-context/StewardSurveyDetail.js';
import IndigenousRegionalContextDetail from './human-context/IndigenousRegionalContextDetail.js';
import VisionDetail from './human-context/VisionDetail.js';

type DetailKey = 'steward-survey' | 'indigenous-regional-context' | 'vision';

const panel: ModulePanel<DetailKey> = {
  Dashboard: HumanContextDashboard,
  details: {
    'steward-survey': StewardSurveyDetail,
    'indigenous-regional-context': IndigenousRegionalContextDetail,
    vision: VisionDetail,
  },
  detailLabels: {
    'steward-survey': 'Steward Survey',
    'indigenous-regional-context': 'Indigenous & Regional Context',
    vision: 'Vision',
  },
};

export default panel;
