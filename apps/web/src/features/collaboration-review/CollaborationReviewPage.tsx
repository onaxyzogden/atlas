// Section 20 — Collaboration, Teamwork & Review ([P3])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function CollaborationReviewPage() {
  return (
    <SectionScaffold
      section={20}
      slug="collaboration-review"
      name="Collaboration, Teamwork & Review"
      realSurface={[
        'apps/web/src/features/collaboration/CollaborationPanel.tsx',
        'apps/web/src/features/collaboration/MembersTab.tsx',
        'apps/web/src/features/collaboration/SuggestEditPanel.tsx',
      ]}
    />
  );
}
