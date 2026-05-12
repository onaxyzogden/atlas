import { useMemo, useState, type CSSProperties } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  Download,
  Flag,
  Leaf,
  Sprout,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSwotStore } from '../../../../store/swotStore.js';
import { swotCounts } from './derivations.js';
import { api } from '../../../../lib/apiClient.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';

function Ring({ value }: { value: number }) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={obsx.ring} style={style}>
      <span>{value}%</span>
    </div>
  );
}

export default function SwotDiagnosisReport() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allEntries = useSwotStore((s) => s.swot);
  const entries = useMemo(() => allEntries.filter((e) => e.projectId === id), [allEntries, id]);
  const counts = swotCounts(entries);
  const total = counts.total;
  const resilience = total === 0 ? 0 : Math.min(100, Math.round((total / 12) * 100));

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data } = await api.exports.generate(id, {
        exportType: 'swot_diagnosis_report',
        payload: { swot: { entries } },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('SWOT diagnosis export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const facts: Array<[string, string]> = [
    ['Site area', '42.6 ha'],
    ['Climate', 'Temperate'],
    ['Land use', 'Mixed use'],
    ['Design stage', 'Pre-concept'],
  ];

  const quadrants: Array<[string, number, string]> = [
    ['Strengths', counts.S, 'Strong foundation to build on'],
    ['Weaknesses', counts.W, 'Limit performance and resilience'],
    ['Opportunities', counts.O, 'High leverage for improvement'],
    ['Threats', counts.T, 'External risks to monitor'],
  ];

  const insights: Array<[LucideIcon, string, string]> = [
    [
      Leaf,
      'Water is the organizing factor.',
      'Seasonal flows and infiltration opportunities shape most design decisions.',
    ],
    [
      Sprout,
      'Soil biological activity is key leverage.',
      'Build soil organic matter to unlock water holding capacity and fertility.',
    ],
    [
      Target,
      'Access needs rethinking.',
      'Current circulation creates erosion risk and inefficient movement.',
    ],
  ];

  const findings: Array<[string, string, string]> = [
    ['Water resilience', 'High', 'High'],
    ['Soil health', 'High', 'Medium'],
    ['Access & circulation', 'High', 'High'],
    ['Biodiversity', 'Medium', 'Medium'],
    ['Stewardship capacity', 'Medium', 'Low'],
  ];

  const risks: Array<[string, string]> = [
    ['High', 'Erosion risk on north-facing slopes'],
    ['High', 'Overland flow damaging access track'],
    ['Medium', 'Invasive species along waterways'],
    ['Medium', 'Limited dry-season water availability'],
    ['Low', 'Wildfire exposure (low site risk)'],
  ];

  const actions: Array<[string, string, string]> = [
    ['Establish keyline swales on contour in upper slopes', 'High', 'Jun 15'],
    ['Implement cover cropping + compost program in priority zones', 'High', 'Jun 30'],
    ['Reroute main access to ridge alignment and stabilize track', 'Medium', 'Jul 15'],
    ['Remove priority invasive species along waterways', 'Medium', 'Aug 01'],
    ['Install monitoring for soil moisture + rainfall', 'Low', 'Aug 15'],
  ];

  const evidence = [
    'Water flows & erosion on lower slope',
    'Soil tests — low OM in Zone 2',
    'Access mapping & constraints',
  ];

  const priorityPill = (priority: string) =>
    `${card.pill} ${
      priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet
    }`;

  return (
    <div className={card.page}>
      <div className={card.hero} data-stage="observe">
        <div className={obsx.heroRow}>
          <div>
            <p className={card.lede}>
              Turning observations into a clear diagnosis to guide design decisions. A clear
              diagnosis today leads to a regenerative design tomorrow.
            </p>
            <div className={card.btnRow}>
              <button
                type="button"
                className={card.btn}
                onClick={handleExport}
                disabled={exporting}
              >
                <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {exporting ? 'Generating…' : 'Export report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={resilience} />
            <span className={obsx.label}>Site resilience</span>
            <span className={obsx.value}>
              {resilience >= 70 ? 'Resilient' : resilience >= 30 ? 'Forming' : 'Sparse'}
            </span>
            <span className={obsx.note}>Composite score</span>
          </div>
          {quadrants.map(([label, count, note]) => (
            <div key={label} className={obsx.kpiBlock}>
              <span className={obsx.label}>{label}</span>
              <span className={obsx.value}>{count > 0 ? count : '—'}</span>
              <span className={obsx.note}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <div className={obsx.cardEyebrow}>
          <Sprout aria-hidden="true" size={12} />
          Executive summary
        </div>
        <h2 className={card.sectionTitle}>Site diagnosis at a glance</h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>
          Riverbend Land has strong natural assets and stewardship potential, with key
          opportunities to improve water resilience, soil function, and access layout. Addressing
          erosion risk and invasive pressure will unlock long-term productivity and ecological
          stability.
        </p>
        {facts.map(([label, value]) => (
          <div key={label} className={card.statRow}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <Target aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Top insights
        </h2>
        <div className={obsx.synthesisBlock}>
          {insights.map(([Icon, title, text]) => (
            <p key={title}>
              <Icon aria-hidden="true" size={14} />
              <span>
                <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}</b> {text}
              </span>
            </p>
          ))}
        </div>
        <p className={card.sectionBody}>
          {total > 0
            ? `Scores reflect synthesis of ${total} journal ${total === 1 ? 'entry' : 'entries'}.`
            : 'Add journal entries to generate synthesis scores.'}
        </p>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Leaf aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Prioritized findings
          </h2>
          <table className={card.table}>
            <thead>
              <tr>
                <th>Theme</th>
                <th>Impact</th>
                <th>Certainty</th>
              </tr>
            </thead>
            <tbody>
              {findings.map(([row, impact, certainty]) => (
                <tr key={row}>
                  <td>{row}</td>
                  <td>
                    <span className={priorityPill(impact)}>{impact}</span>
                  </td>
                  <td>
                    <span className={priorityPill(certainty)}>{certainty}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Flag aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Risk flags
          </h2>
          {risks.map(([level, text]) => (
            <div key={text} className={card.statRow}>
              <span>{text}</span>
              <span className={priorityPill(level)}>{level}</span>
            </div>
          ))}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <BookOpen aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Evidence from SWOT journal
        </h2>
        {evidence.length === 0 ? (
          <p className={card.empty}>No evidence linked yet.</p>
        ) : (
          <ul className={card.list}>
            {evidence.map((item, index) => (
              <li key={item} className={card.listRow}>
                <span>{item}</span>
                <span className={`${card.pill} ${card.pillPartial}`}>W {index + 1}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <CalendarDays aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Recommended actions
        </h2>
        <table className={card.table}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Priority</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {actions.map(([title, priority, due]) => (
              <tr key={title}>
                <td>
                  <Check aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {title}
                </td>
                <td>
                  <span className={priorityPill(priority)}>{priority}</span>
                </td>
                <td>{due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
