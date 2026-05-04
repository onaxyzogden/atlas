// Section 25 — Template System & Reusable Design Frameworks ([P3])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function ReusableFrameworksPage() {
  return (
    <SectionScaffold
      section={25}
      slug="reusable-frameworks"
      name="Template System & Reusable Design Frameworks"
      realSurface={[
        'apps/web/src/features/templates/TemplatePanel.tsx',
        'apps/web/src/features/templates/TemplateMarketplace.tsx',
      ]}
    />
  );
}
