// Section 26 — Administration, Governance & Data Integrity ([P1])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function AdminGovernancePage() {
  return (
    <SectionScaffold
      section={26}
      slug="admin-governance"
      name="Administration, Governance & Data Integrity"
      realSurface={[
        'apps/web/src/app/AppShell.tsx',
        'apps/web/src/features/collaboration/MembersTab.tsx',
        'apps/web/src/features/assessment/ConfidenceIndicator.tsx',
      ]}
      notes="Admin / governance is split across the app shell (auth, project ownership) and per-panel widgets (audit log, confidence indicators). No dedicated admin folder."
    />
  );
}
