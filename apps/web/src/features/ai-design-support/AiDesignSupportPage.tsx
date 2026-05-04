// Section 18 — AI-Assisted Design Support ([P3])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function AiDesignSupportPage() {
  return (
    <SectionScaffold
      section={18}
      slug="ai-design-support"
      name="AI-Assisted Design Support"
      realSurface={[
        'apps/api/src/routes/ai-outputs/index.ts',
        'apps/api/src/workers/narrativeWorker.ts',
        'apps/web/src/features/assessment/SiteAssessmentPanel.tsx',
      ]}
      notes="AI outputs are persisted server-side via NarrativeWorker and surfaced in panels (site narrative, design recommendations). No dedicated AI folder under features/."
    />
  );
}
