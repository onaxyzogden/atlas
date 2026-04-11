/**
 * FieldNoteExport — print-friendly view of field notes.
 * Uses window.print() pattern from ProjectSummaryExport.
 * Hidden with .noPrint on screen, shown in print media.
 */

import type { FieldworkEntry } from '../../store/fieldworkStore.js';
import css from './FieldworkPanel.module.css';

interface FieldNoteExportProps {
  entries: FieldworkEntry[];
  projectName: string;
}

const TYPE_LABELS: Record<string, string> = {
  observation: 'Observation',
  question: 'Question',
  measurement: 'Measurement',
  issue: 'Issue',
  soil_sample: 'Soil Sample',
  water_issue: 'Water Issue',
  structure_issue: 'Structure Issue',
  annotation: 'Annotation',
};

export default function FieldNoteExport({ entries, projectName }: FieldNoteExportProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button onClick={handlePrint} className={`${css.ctaBtn} ${css.noPrint}`}>
        EXPORT FIELD NOTES
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>

      {/* Print-only content */}
      <div style={{ display: 'none' }} className="print-only">
        <style>{`
          @media print {
            .print-only { display: block !important; }
            body > *:not(.print-only) { display: none !important; }
          }
        `}</style>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          Field Notes — {projectName}
        </h1>
        <p style={{ fontSize: 11, color: '#666', marginBottom: 16 }}>
          Exported {new Date().toLocaleDateString()} &middot; {entries.length} entries
        </p>

        {entries.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 12, padding: 8, borderBottom: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ fontSize: 12 }}>
                {TYPE_LABELS[entry.noteType ?? entry.type] ?? entry.type}
              </strong>
              <span style={{ fontSize: 10, color: '#666' }}>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
            {entry.notes && <div style={{ fontSize: 11, marginBottom: 4 }}>{entry.notes}</div>}
            <div style={{ fontSize: 9, color: '#999' }}>
              GPS: {entry.location[1].toFixed(5)}, {entry.location[0].toFixed(5)}
              {entry.verified && ' | Verified'}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
