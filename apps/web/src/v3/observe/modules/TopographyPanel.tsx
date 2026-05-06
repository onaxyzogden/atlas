import type { ModulePanel } from './types.js';
import TopographyDashboard from './topography/TopographyDashboard.js';
import TerrainDetail from './topography/TerrainDetail.js';
import CartographicDetail from './topography/CartographicDetail.js';
import CrossSectionDetail from './topography/CrossSectionDetail.js';

type DetailKey = 'terrain-detail' | 'cartographic-detail' | 'cross-section';

const panel: ModulePanel<DetailKey> = {
  Dashboard: TopographyDashboard,
  details: {
    'terrain-detail': TerrainDetail,
    'cartographic-detail': CartographicDetail,
    'cross-section': CrossSectionDetail,
  },
  detailLabels: {
    'terrain-detail': 'Terrain Detail',
    'cartographic-detail': 'Cartographic Detail',
    'cross-section': 'Cross-section Tool',
  },
};

export default panel;
