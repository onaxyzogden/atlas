// Section 7 — Soil, Ecology & Regeneration Diagnostics ([P1])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function SoilEcologyPage() {
  return (
    <SectionScaffold
      section={7}
      slug="soil-ecology"
      name="Soil, Ecology & Regeneration Diagnostics"
      realSurface={[
        'apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx',
        'apps/web/src/features/regeneration/RegenerationTimelineCard.tsx',
        'apps/web/src/features/soil-samples/SoilSamplesCard.tsx',
        'apps/web/src/features/dashboard/pages/CarbonDiagnosticDashboard.tsx',
      ]}
    />
  );
}
