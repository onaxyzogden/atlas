import type { ModulePanel } from './types.js';
import SwotDashboard from './swot-synthesis/SwotDashboard.js';
import SwotJournal from './swot-synthesis/SwotJournal.js';
import SwotDiagnosisReport from './swot-synthesis/SwotDiagnosisReport.js';

type DetailKey = 'journal' | 'diagnosis-report';

const panel: ModulePanel<DetailKey> = {
  Dashboard: SwotDashboard,
  details: {
    journal: SwotJournal,
    'diagnosis-report': SwotDiagnosisReport,
  },
  detailLabels: {
    journal: 'SWOT Journal',
    'diagnosis-report': 'Diagnosis Report',
  },
};

export default panel;
