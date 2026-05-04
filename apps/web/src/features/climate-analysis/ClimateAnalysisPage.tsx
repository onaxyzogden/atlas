// Section 6 — Solar, Wind & Climate Analysis ([P1])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function ClimateAnalysisPage() {
  return (
    <SectionScaffold
      section={6}
      slug="climate-analysis"
      name="Solar, Wind & Climate Analysis"
      realSurface={[
        'apps/web/src/features/climate/SolarClimateDashboard.tsx',
        'apps/web/src/features/climate/SolarClimatePanel.tsx',
        'apps/web/src/features/climate/ClimateScenarioOverlay.tsx',
      ]}
    />
  );
}
