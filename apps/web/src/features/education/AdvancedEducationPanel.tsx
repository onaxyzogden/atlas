/**
 * AdvancedEducationPanel — passive tour, guided walkthrough, quiz mode.
 */

import { useState } from 'react';
import p from '../../styles/panel.module.css';

type Mode = 'browse' | 'tour' | 'quiz';

const HOTSPOTS = [
  { id: '1', category: 'Water', title: 'Keyline Water Design', desc: 'Keyline design harvests rainfall across the landscape by reading the natural water lines of the land.', quiz: 'What is the primary purpose of keyline design?' },
  { id: '2', category: 'Livestock', title: 'Rotational Grazing', desc: 'Managed rotational grazing mimics wild herbivore movement patterns, regenerating grassland rather than degrading it.', quiz: 'How does rotational grazing benefit the land?' },
  { id: '3', category: 'Spiritual', title: 'Prayer Pavilion', desc: 'A place designed not for productivity, but for presence \u2014 witnessing the signs of the Creator in land, water, and sky.', quiz: 'What makes a prayer space different from other structures?' },
  { id: '4', category: 'Agroforestry', title: 'Food Forest Design', desc: 'A multi-layer food forest mimics the structure and abundance of natural forest while producing food, medicine, and habitat.', quiz: 'How many layers does a typical food forest have?' },
  { id: '5', category: 'Community', title: 'Commons & Hospitality', desc: 'The heart of the community gathering space \u2014 where visitors, community, and family gather in the spirit of adab.', quiz: 'What role does hospitality play in land design?' },
];

export default function AdvancedEducationPanel() {
  const [mode, setMode] = useState<Mode>('browse');
  const [tourStep, setTourStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={p.container}>
      <h2 className={p.title}>
        Learning Center
      </h2>

      {/* Mode selector */}
      <div className={p.tabBar}>
        {(['browse', 'tour', 'quiz'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setTourStep(0); }}
            className={`${p.tabBtn} ${mode === m ? p.tabBtnActive : ''}`}
          >
            {m === 'tour' ? 'Guided Tour' : m === 'quiz' ? 'Quiz Mode' : 'Browse'}
          </button>
        ))}
      </div>

      {/* Browse mode */}
      {mode === 'browse' && (
        <div className={`${p.section} ${p.sectionGapLg}`}>
          {HOTSPOTS.map((h) => (
            <button
              key={h.id}
              onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
              className={p.card}
              style={{ cursor: 'pointer', textAlign: 'left', color: 'inherit', width: '100%' }}
            >
              <div className={p.text10} style={{ color: '#6B5B8A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h.category}</div>
              <div className={`${p.text13} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)', marginTop: 2 }}>{h.title}</div>
              {expandedId === h.id && (
                <div className={`${p.text12} ${p.muted} ${p.leading16}`} style={{ marginTop: 8 }}>
                  {h.desc}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tour mode */}
      {mode === 'tour' && (
        <div>
          <div className={`${p.text10} ${p.muted} ${p.mb8}`}>
            Step {tourStep + 1} of {HOTSPOTS.length}
          </div>
          <div className={`${p.highlightBox} ${p.highlightBoxGold}`}>
            <div className={p.text10} style={{ color: '#6B5B8A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {HOTSPOTS[tourStep]?.category}
            </div>
            <h3 className={`${p.textLg} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)', marginBottom: 8, marginTop: 0 }}>
              {HOTSPOTS[tourStep]?.title}
            </h3>
            <p className={`${p.text13} ${p.muted} ${p.leading17}`} style={{ margin: 0 }}>
              {HOTSPOTS[tourStep]?.desc}
            </p>
          </div>
          <div className={p.flexGap8}>
            <button
              onClick={() => setTourStep(Math.max(0, tourStep - 1))}
              disabled={tourStep === 0}
              className={`${p.navBtnPrev} ${tourStep === 0 ? p.navBtnDisabled : ''}`}
              style={{ padding: 8, fontSize: 11 }}
            >
              {'\u2190'} Previous
            </button>
            <button
              onClick={() => setTourStep(Math.min(HOTSPOTS.length - 1, tourStep + 1))}
              disabled={tourStep === HOTSPOTS.length - 1}
              className={`${p.navBtnNext} ${tourStep === HOTSPOTS.length - 1 ? p.navBtnNextDisabled : ''}`}
              style={{ padding: 8, fontSize: 11 }}
            >
              Next {'\u2192'}
            </button>
          </div>
          {/* Progress dots */}
          <div className={p.progressDots}>
            {HOTSPOTS.map((_, i) => (
              <div key={i} className={`${p.progressDot} ${i === tourStep ? p.progressDotActive : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* Quiz mode */}
      {mode === 'quiz' && (
        <div className={p.flexCol} style={{ gap: 12 }}>
          {HOTSPOTS.map((h) => (
            <div key={h.id} className={p.card}>
              <div className={p.text10} style={{ color: '#6B5B8A', fontWeight: 600, marginBottom: 4 }}>{h.category}</div>
              <div className={`${p.text12} ${p.fontMedium} ${p.mb8}`} style={{ color: 'var(--color-panel-text)' }}>
                {h.quiz}
              </div>
              <textarea
                placeholder="Your answer..."
                value={quizAnswers[h.id] ?? ''}
                onChange={(e) => setQuizAnswers({ ...quizAnswers, [h.id]: e.target.value })}
                rows={2}
                className={p.input}
                style={{ resize: 'vertical', fontSize: 11, boxSizing: 'border-box' }}
              />
            </div>
          ))}
          <div className={`${p.text10} ${p.muted} ${p.textCenter} ${p.mutedItalic}`}>
            Quiz answers are for self-reflection. Click Browse to review the concepts.
          </div>
        </div>
      )}
    </div>
  );
}
