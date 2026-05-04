// Section 29 — Moontrance-Specific Features ([MT])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function MoontranceIdentityPage() {
  return (
    <SectionScaffold
      section={29}
      slug="moontrance-identity"
      name="Moontrance-Specific Features"
      realSurface={[
        'apps/web/src/features/moontrance/MoontrancePanel.tsx',
        'apps/web/src/features/spiritual/SpiritualPanel.tsx',
        'apps/web/src/features/spiritual/PrayerSpaceAlignment.tsx',
        'apps/web/src/features/spiritual/QuietZonePlanning.tsx',
        'apps/web/src/features/spiritual/SignsInCreation.tsx',
      ]}
    />
  );
}
