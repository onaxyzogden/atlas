// Section 16 — Simulation & Scenario Modeling ([P3])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function SimulationScenariosPage() {
  return (
    <SectionScaffold
      section={16}
      slug="simulation-scenarios"
      name="Simulation & Scenario Modeling"
      realSurface={[
        'apps/web/src/features/scenarios/ScenarioPanel.tsx',
        'apps/web/src/features/climate/ClimateScenarioOverlay.tsx',
      ]}
    />
  );
}
