import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CloudLightning,
  Download,
  Leaf,
  Mountain,
  Sprout,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSwotStore, type SwotEntry } from '../../../../store/swotStore.js';
import { swotCounts } from './derivations.js';
import { api } from '../../../../lib/apiClient.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';

const BUCKET_LABELS: Record<SwotEntry['bucket'], string> = {
  S: 'Strength',
  W: 'Weakness',
  O: 'Opportunity',
  T: 'Threat',
};

const BUCKET_PILL: Record<SwotEntry['bucket'], string> = {
  S: 'pillMet',
  W: 'pillFail',
  O: 'pillMet',
  T: 'pillFail',
};

export default function SwotDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allEntries = useSwotStore((s) => s.swot);
  const entries = useMemo(() => allEntries.filter((e) => e.projectId === id), [allEntries, id]);

  const counts = swotCounts(entries);
  const total = counts.total;
  const completeness = total === 0 ? 0 : Math.min(100, Math.round((total / 12) * 100));

  const recent = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [entries],
  );

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data } = await api.exports.generate(id, {
        exportType: 'swot_synthesis',
        payload: { swot: { entries } },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('SWOT synthesis export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const quadrants: Array<[SwotEntry['bucket'], LucideIcon, string, number, string]> = [
    ['S', Leaf,           'Strengths',     counts.S, 'Internal assets and positive factors you can build upon.'],
    ['W', Mountain,       'Weaknesses',    counts.W, 'Internal limitations or gaps that may constrain success.'],
    ['O', Sprout,         'Opportunities', counts.O, 'External conditions and trends that can be leveraged.'],
    ['T', CloudLightning, 'Threats',       counts.T, 'External risks or pressures that could impact outcomes.'],
  ];

  const synthArticles: Array<[LucideIcon, string, string]> = [
    [
      Leaf,
      'Strengths Ã— Opportunities',
      counts.S > 0 && counts.O > 0
        ? 'Pair internal assets with external openings to maximize leverage.'
        : 'Capture both strengths and opportunities to surface high-leverage moves.',
    ],
    [
      Mountain,
      'Weaknesses Ã— Threats',
      counts.W > 0 && counts.T > 0
        ? 'Address internal gaps before external risks compound them.'
        : 'Log weaknesses and threats to expose risks that need mitigation.',
    ],
    [
      Target,
      'Design implications',
      total > 0
        ? `${total} synthesis entr${total === 1 ? 'y' : 'ies'} â€” translate into design priorities next.`
        : 'Start capturing entries to surface design priorities.',
    ],
  ];

  const priorities: Array<[string, string]> = [
    ['Leverage soil fertility & water', 'High'],
    ['Address access constraints', 'High'],
    ['Build resilience to climate risks', 'Medium'],
    ['Engage & co-create with community', 'Low'],
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-swot-synthesis-dashboard"
        lede="Synthesize insights from your journal and diagnosis to reveal strategic leverage points and inform robust, regenerative design decisions."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generatingâ€¦' : 'Export synthesis summary'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={completeness} />
            <span className={obsx.label}>Synthesis depth</span>
            <span className={obsx.value}>
              {completeness >= 70 ? 'Well grounded' : completeness >= 30 ? 'Filling in' : 'Just getting started'}
            </span>
            <span className={obsx.note}>{total} entries captured</span>
          </div>
          {quadrants.map(([, Icon, label, count]) => (
            <div key={label} className={obsx.kpiBlock}>
              <span className={obsx.label}>
                <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {label}
              </span>
              <span className={obsx.value}>{count > 0 ? count : 'â€”'}</span>
              <span className={obsx.note}>{count > 0 ? 'Logged' : 'None yet'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>SWOT quadrants</h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>
          Internal factors (Strengths, Weaknesses) and external factors (Opportunities, Threats)
          combined to inform design moves.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {quadrants.map(([bucket, Icon, title, count, note]) => (
            <section key={title} className={card.section} style={{ margin: 0 }}>
              <div className={obsx.cardEyebrow}>
                <Icon aria-hidden="true" size={12} />
                {title}
                <span className={`${card.pill} ${card[BUCKET_PILL[bucket]]}`} style={{ marginLeft: 'auto' }}>
                  {count > 0 ? count : 'â€”'}
                </span>
              </div>
              <p className={card.sectionBody}>{note}</p>
            </section>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>How the synthesis works</h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>
          By combining internal factors with external factors, we identify strategic leverage
          points and design implications to guide resilient decisions.
        </p>
        <div className={obsx.synthesisGrid}>
          {synthArticles.map(([Icon, title, text]) => (
            <div key={title} className={obsx.synthesisBlock}>
              <h3>{title}</h3>
              <p>
                <Icon aria-hidden="true" size={14} />
                <span>{text}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <BookOpen aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Recent journal entries
          </h2>
          {recent.length === 0 ? (
            <p className={card.empty}>No entries yet â€” add one from the journal.</p>
          ) : (
            <ul className={card.list}>
              {recent.map((e) => (
                <li key={e.id} className={card.listRow}>
                  <span>
                    <strong>{e.title}</strong>
                    <span className={card.listMeta} style={{ display: 'block', marginTop: 2 }}>
                      {new Date(e.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className={`${card.pill} ${card[BUCKET_PILL[e.bucket]]}`}>
                    {BUCKET_LABELS[e.bucket]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Target aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Design implications
          </h2>
          {priorities.map(([label, priority]) => (
            <div key={label} className={card.statRow}>
              <span>
                <ArrowRight aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {label}
              </span>
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

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <Users aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          SWOT field tags
        </h2>
        <AnnotationListCard
          title=""
          projectId={id}
          kinds={['swotTag']}
          emptyHint="No SWOT tags pinned to the map yet â€” drop a strength, weakness, opportunity, or threat with the tools panel."
        />
      </section>
    </div>
  );
}
