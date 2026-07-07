import { useMemo, useState } from 'react';
import {
  BookOpen,
  CloudLightning,
  Download,
  Leaf,
  Lightbulb,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSwotStore, type SwotEntry } from '../../../../store/swotStore.js';
import { journalMetrics, swotCounts, type MetricItem } from './derivations.js';
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import {
  useServerProjectId,
  NOT_SYNCED_EXPORT_TITLE,
} from '../../../../hooks/useServerProjectId.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';

const BUCKET_LABELS: Record<SwotEntry['bucket'], string> = {
  S: 'Strengths',
  W: 'Weaknesses',
  O: 'Opportunities',
  T: 'Threats',
};

const BUCKET_PILL: Record<SwotEntry['bucket'], string> = {
  S: 'pillMet',
  W: 'pillFail',
  O: 'pillMet',
  T: 'pillFail',
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  Strengths: ShieldCheck,
  Weaknesses: TriangleAlert,
  Opportunities: Lightbulb,
  Threats: CloudLightning,
  'Total entries': BookOpen,
};

export default function SwotJournal() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  // The exports API addresses the SERVER project UUID; `id` is the local
  // store id (H4, deep-audit 2026-07-03). Null → not yet synced → disable.
  const serverProjectId = useServerProjectId(id);

  const allEntries = useSwotStore((s) => s.swot);
  const removeSwot = useSwotStore((s) => s.removeSwot);
  const entries = useMemo(
    () => allEntries.filter((e) => e.projectId === id),
    [allEntries, id],
  );

  const metrics = journalMetrics(entries);
  const counts = swotCounts(entries);
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const completeness = counts.total === 0 ? 0 : Math.min(100, Math.round((counts.total / 12) * 100));

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting || serverProjectId === null) return;
    setExporting(true);
    try {
      const { data } = await api.exports.generate(serverProjectId, {
        exportType: 'swot_journal',
        payload: { swot: { entries } },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('SWOT journal export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const patterns = [
    'Water is a recurring theme in both opportunities and threats.',
    'Erosion and slope appear in 5 recent weaknesses.',
    'Biodiversity and habitat are strong across multiple zones.',
  ];

  const followups: Array<[string, string]> = [
    ['Investigate erosion control options', 'High'],
    ['Map seasonal water flows', 'High'],
    ['Assess water storage potential', 'Medium'],
    ['Plan wildlife protection strategy', 'Medium'],
    ['Explore eco-tourism opportunities', 'Low'],
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-swot-synthesis-journal"
        lede="Capture observations and insights about your site using the SWOT framework. Tag entries with the relevant quadrant and watch patterns emerge across the journal."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED || serverProjectId === null}
          title={!DEMO_OFFLINE_ENABLED && serverProjectId === null ? NOT_SYNCED_EXPORT_TITLE : undefined}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export journal'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={completeness} />
            <span className={obsx.label}>Journal depth</span>
            <span className={obsx.value}>
              {completeness >= 70 ? 'Rich' : completeness >= 30 ? 'Building' : 'Sparse'}
            </span>
            <span className={obsx.note}>{counts.total} entries</span>
          </div>
          {metrics.slice(0, 3).map((item: MetricItem) => {
            const Icon = METRIC_ICONS[item.label] ?? BookOpen;
            return (
              <div key={item.label} className={obsx.kpiBlock}>
                <span className={obsx.label}>
                  <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {item.label}
                </span>
                <span className={obsx.value}>{item.value}</span>
                <span className={obsx.note}>{item.delta}</span>
              </div>
            );
          })}
        </div>
      </section>

      {metrics.length > 3 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Other categories</h2>
          <div className={obsx.kpiGrid}>
            {metrics.slice(3).map((item: MetricItem) => {
              const Icon = METRIC_ICONS[item.label] ?? BookOpen;
              return (
                <div key={item.label} className={obsx.kpiBlock}>
                  <span className={obsx.label}>
                    <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {item.label}
                  </span>
                  <span className={obsx.value}>{item.value}</span>
                  <span className={obsx.note}>{item.delta}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <BookOpen aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Journal entries
        </h2>
        {sorted.length === 0 ? (
          <p className={card.empty}>No journal entries yet — add one from the toolbar above.</p>
        ) : (
          <ul className={card.list}>
            {sorted.map((e) => (
              <li key={e.id} className={card.listRow}>
                <span>
                  <strong>{e.title}</strong>
                  {e.body ? (
                    <span className={card.listMeta} style={{ display: 'block', marginTop: 2 }}>
                      {e.body}
                    </span>
                  ) : null}
                  <span className={card.listMeta} style={{ display: 'block', marginTop: 2 }}>
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`${card.pill} ${card[BUCKET_PILL[e.bucket]]}`}>
                    {BUCKET_LABELS[e.bucket]}
                  </span>
                  <button
                    type="button"
                    className={card.removeBtn}
                    onClick={() => removeSwot(e.id)}
                    aria-label={`Remove ${e.title}`}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Leaf aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Emerging patterns
          </h2>
          <div className={obsx.synthesisBlock}>
            {patterns.map((item) => (
              <p key={item}>
                <Leaf aria-hidden="true" size={14} />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Recommended follow-ups</h2>
          {followups.map(([name, priority]) => (
            <div key={name} className={card.statRow}>
              <span>{name}</span>
              <span
                className={`${card.pill} ${
                  priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet
                }`}
              >
                {priority}
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
