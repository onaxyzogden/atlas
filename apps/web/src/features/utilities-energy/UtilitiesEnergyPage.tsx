// Section 13 — Utilities, Energy & Support Systems ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function UtilitiesEnergyPage() {
  return (
    <SectionScaffold
      section={13}
      slug="utilities-energy"
      name="Utilities, Energy & Support Systems"
      realSurface={[
        'apps/web/src/features/utilities/UtilityPanel.tsx',
        'apps/web/src/features/utilities/SolarPlacement.tsx',
        'apps/web/src/features/utilities/WaterSystemPlanning.tsx',
        'apps/web/src/features/utilities/OffGridReadiness.tsx',
        'apps/web/src/features/dashboard/pages/EnergyDashboard.tsx',
      ]}
    />
  );
}
