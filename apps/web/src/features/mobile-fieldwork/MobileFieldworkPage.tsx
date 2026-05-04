// Section 24 — Mobile, Fieldwork & Site Visit Tools ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function MobileFieldworkPage() {
  return (
    <SectionScaffold
      section={24}
      slug="mobile-fieldwork"
      name="Mobile, Fieldwork & Site Visit Tools"
      realSurface={[
        'apps/web/src/features/fieldwork/FieldworkPanel.tsx',
        'apps/web/src/features/fieldwork/SiteChecklist.tsx',
        'apps/web/src/features/fieldwork/WalkRouteRecorder.tsx',
        'apps/web/src/features/mobile/GPSTracker.tsx',
      ]}
    />
  );
}
