// Section 4 — Site Assessment & Diagnostic Atlas ([P1])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function SiteAssessmentPage() {
  return (
    <SectionScaffold
      section={4}
      slug="site-assessment"
      name="Site Assessment & Diagnostic Atlas"
      realSurface={[
        'apps/web/src/features/assessment/SiteAssessmentPanel.tsx',
        'apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx',
      ]}
    />
  );
}
