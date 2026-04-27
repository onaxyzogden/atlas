// Section 27 — Public Experience & Storytelling Portal ([P4])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function PublicPortalPage() {
  return (
    <SectionScaffold
      section={27}
      slug="public-portal"
      name="Public Experience & Storytelling Portal"
      realSurface={[
        'apps/web/src/features/portal/PortalConfigPanel.tsx',
        'apps/web/src/features/portal/PublicPortalShell.tsx',
        'apps/web/src/routes/portal.$slug.tsx',
      ]}
      notes="Routed at /portal/$slug — see routes/index.tsx for the live registration."
    />
  );
}
