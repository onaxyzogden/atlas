// Section 21 — Decision Support & Feasibility ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function DecisionFeasibilityPage() {
  return (
    <SectionScaffold
      section={21}
      slug="decision-feasibility"
      name="Decision Support & Feasibility"
      realSurface={[
        'apps/web/src/features/decision/DecisionSupportPanel.tsx',
        'apps/web/src/features/regulatory/RegulatoryPanel.tsx',
      ]}
    />
  );
}
