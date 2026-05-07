import type { ModulePanel } from './types.js';
import EarthWaterEcologyDashboard from './earth-water-ecology/EarthWaterEcologyDashboard.js';
import HydrologyDetail from './earth-water-ecology/HydrologyDetail.js';
import EcologicalDetail from './earth-water-ecology/EcologicalDetail.js';
import JarPercRoofDetail from './earth-water-ecology/JarPercRoofDetail.js';

type DetailKey = 'hydrology' | 'ecological' | 'jar-perc-roof';

const panel: ModulePanel<DetailKey> = {
  Dashboard: EarthWaterEcologyDashboard,
  details: {
    hydrology: HydrologyDetail,
    ecological: EcologicalDetail,
    'jar-perc-roof': JarPercRoofDetail,
  },
  detailLabels: {
    hydrology: 'Hydrology Detail',
    ecological: 'Ecological Detail',
    'jar-perc-roof': 'Jar / Perc / Roof',
  },
};

export default panel;
