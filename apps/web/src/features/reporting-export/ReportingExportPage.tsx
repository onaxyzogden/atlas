// Section 23 — Reporting, Export & Presentation ([P2])
// Orphan scaffold — not routed. Real surface listed in SectionScaffold.
import { SectionScaffold } from '../_scaffolds/SectionScaffold';

export default function ReportingExportPage() {
  return (
    <SectionScaffold
      section={23}
      slug="reporting-export"
      name="Reporting, Export & Presentation"
      realSurface={[
        'apps/web/src/features/reporting/ReportingPanel.tsx',
        'apps/web/src/features/export/ProjectSummaryExport.tsx',
        'apps/web/src/features/export/InvestorSummaryExport.tsx',
        'apps/web/src/features/export/EducationalBookletExport.tsx',
        'apps/api/src/services/pdfExport.ts',
      ]}
    />
  );
}
