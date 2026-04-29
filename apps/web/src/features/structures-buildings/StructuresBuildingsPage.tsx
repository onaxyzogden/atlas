// Section 9 — Structures & Built Environment Planning ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function StructuresBuildingsPage() {
  return (
    <SectionScaffold
      section={9}
      slug="structures-buildings"
      name="Structures & Built Environment Planning"
      realSurface={[
        'apps/web/src/features/structures/SupportInfrastructureCard.tsx',
        'apps/web/src/features/structures/SpiritualCommunalCard.tsx',
        'apps/web/src/features/structures/GatheringRetreatCard.tsx',
        'apps/web/src/features/structures/BuildOrderCard.tsx',
        'apps/web/src/features/structures/PermitReadinessCard.tsx',
      ]}
    />
  );
}
