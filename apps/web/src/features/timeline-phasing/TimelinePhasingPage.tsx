// Section 15 — Timeline, Phasing & Staged Buildout ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function TimelinePhasingPage() {
  return (
    <SectionScaffold
      section={15}
      slug="timeline-phasing"
      name="Timeline, Phasing & Staged Buildout"
      realSurface={[
        'apps/web/src/features/dashboard/pages/PhasingDashboard.tsx',
        'apps/web/src/features/structures/PermitReadinessCard.tsx',
      ]}
    />
  );
}
