import type { ModulePanel } from './types.js';
import SectorsDashboard from './sectors-zones/SectorsDashboard.js';
import SectorCompassDetail from './sectors-zones/SectorCompassDetail.js';
import CartographicDetail from './topography/CartographicDetail.js';

type DetailKey = 'sector-compass' | 'cartographic';

const panel: ModulePanel<DetailKey> = {
  Dashboard: SectorsDashboard,
  details: {
    'sector-compass': SectorCompassDetail,
    cartographic: CartographicDetail,
  },
  detailLabels: {
    'sector-compass': 'Sector Compass',
    cartographic: 'Cartographic Detail',
  },
};

export default panel;
