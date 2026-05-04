// Section 28 — Advanced Geospatial / Latent Features ([LATENT])
// Phase tag renamed FUTURE → LATENT per ADR
// 2026-05-02-phase-gated-future-routes-scoping (D2, accepted 2026-05-04).
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function FutureGeospatialPage() {
  return (
    <SectionScaffold
      section={28}
      slug="future-geospatial"
      name="Advanced Geospatial / Latent Features"
      realSurface="(none — entirely LATENT phase)"
      notes="LiDAR, AR/VR, sensor integration, multi-property planning. No real surface yet — all features are LATENT-tagged in featureManifest.ts."
    />
  );
}
