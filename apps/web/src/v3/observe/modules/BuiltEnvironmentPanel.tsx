import type { ModulePanel } from './types.js';

function BuiltEnvironmentDashboard() {
  return (
    <div style={{ padding: 24, color: '#cfd6d8' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#e6ece8' }}>
        Built Environment
      </h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, opacity: 0.85 }}>
        Track buildings, utilities, and on-site infrastructure as you observe them.
      </p>
    </div>
  );
}

const panel: ModulePanel = {
  Dashboard: BuiltEnvironmentDashboard,
  details: {},
};

export default panel;
