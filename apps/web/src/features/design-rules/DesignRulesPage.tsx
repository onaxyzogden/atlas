// Section 17 — Rule-Based Design Intelligence ([P3])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function DesignRulesPage() {
  return (
    <SectionScaffold
      section={17}
      slug="design-rules"
      name="Rule-Based Design Intelligence"
      realSurface={[
        'apps/web/src/features/rules/RulesPanel.tsx',
        'apps/web/src/features/rules/SitingPanel.tsx',
        'apps/web/src/features/rules/SitingWarningsCard.tsx',
        'apps/web/src/features/rules/SpatialRelationshipsCard.tsx',
      ]}
    />
  );
}
