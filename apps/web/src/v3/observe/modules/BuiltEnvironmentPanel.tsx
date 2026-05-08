import type { ModulePanel } from './types.js';
import BuiltEnvironmentDashboard from './built-environment/BuiltEnvironmentDashboard.js';

const panel: ModulePanel = {
  Dashboard: BuiltEnvironmentDashboard,
  details: {},
};

export default panel;
