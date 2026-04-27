// Section 10 — Access, Circulation & Movement Systems ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function AccessCirculationPage() {
  return (
    <SectionScaffold
      section={10}
      slug="access-circulation"
      name="Access, Circulation & Movement Systems"
      realSurface={[
        'apps/web/src/features/access/AccessPanel.tsx',
        'apps/web/src/features/access/AccessibleRouteCard.tsx',
        'apps/web/src/features/access/RouteConflicts.tsx',
      ]}
    />
  );
}
