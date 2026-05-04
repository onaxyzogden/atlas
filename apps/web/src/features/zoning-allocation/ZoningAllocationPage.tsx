// Section 8 — Land Use Zoning & Functional Allocation ([P1])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function ZoningAllocationPage() {
  return (
    <SectionScaffold
      section={8}
      slug="zoning-allocation"
      name="Land Use Zoning & Functional Allocation"
      realSurface={[
        'apps/web/src/features/zones/ZoneAutoSuggest.tsx',
        'apps/web/src/features/zones/ZoneAllocationSummary.tsx',
        'apps/web/src/features/zones/ZoneConflictDetector.tsx',
        'apps/web/src/features/zones/ContemplationZonesCard.tsx',
        'apps/web/src/features/zones/PrivacyCohortPlanningCard.tsx',
      ]}
    />
  );
}
