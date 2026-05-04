// Section 14 — Moontrance Vision Layer & Concept Overlay ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function MoontranceVisionPage() {
  return (
    <SectionScaffold
      section={14}
      slug="moontrance-vision"
      name="Moontrance Vision Layer & Concept Overlay"
      realSurface={[
        'apps/web/src/features/vision/VisionPanel.tsx',
        'apps/web/src/features/moontrance/MoontrancePanel.tsx',
      ]}
    />
  );
}
