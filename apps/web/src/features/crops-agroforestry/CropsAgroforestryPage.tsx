// Section 12 — Crop, Orchard & Agroforestry Design ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function CropsAgroforestryPage() {
  return (
    <SectionScaffold
      section={12}
      slug="crops-agroforestry"
      name="Crop, Orchard & Agroforestry Design"
      realSurface={[
        'apps/web/src/features/crops/CropPanel.tsx',
        'apps/web/src/features/map/overlays/AgroforestryOverlay.tsx',
        'apps/web/src/features/dashboard/pages/ForestHubDashboard.tsx',
      ]}
    />
  );
}
