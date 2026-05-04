// Section 11 — Livestock System Design ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function LivestockSystemsPage() {
  return (
    <SectionScaffold
      section={11}
      slug="livestock-systems"
      name="Livestock System Design"
      realSurface={[
        'apps/web/src/features/livestock/LivestockPanel.tsx',
        'apps/web/src/features/livestock/LivestockLandFitCard.tsx',
        'apps/web/src/features/dashboard/pages/PaddockDesignDashboard.tsx',
        'apps/web/src/features/dashboard/pages/HerdRotationDashboard.tsx',
      ]}
    />
  );
}
