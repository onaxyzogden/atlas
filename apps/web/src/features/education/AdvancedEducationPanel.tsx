/**
 * AdvancedEducationPanel — passive tour, guided walkthrough, quiz mode.
 */

import { useState } from 'react';

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
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Learning Center
      </h2>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {(['browse', 'tour', 'quiz'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setTourStep(0); }}
            style={{
              flex: 1, padding: '9px 0', fontSize: 11,
              fontWeight: mode === m ? 600 : 400,
              background: mode === m ? 'rgba(196,162,101,0.12)' : 'transparent',
              border: 'none', color: mode === m ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {m === 'tour' ? 'Guided Tour' : m === 'quiz' ? 'Quiz Mode' : 'Browse'}
          </button>
        ))}
      </div>

      {/* Browse mode */}
      {mode === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {HOTSPOTS.map((h) => (
            <button
              key={h.id}
              onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
              style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
                cursor: 'pointer', textAlign: 'left', color: 'inherit', width: '100%',
              }}
            >
              <div style={{ fontSize: 10, color: '#6B5B8A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h.category}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)', marginTop: 2 }}>{h.title}</div>
              {expandedId === h.id && (
                <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.6, marginTop: 8 }}>
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
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginBottom: 8 }}>
            Step {tourStep + 1} of {HOTSPOTS.length}
          </div>
          <div style={{
            padding: 16, borderRadius: 10,
            background: 'rgba(196,162,101,0.04)',
            border: '1px solid rgba(196,162,101,0.1)',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 10, color: '#6B5B8A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {HOTSPOTS[tourStep]?.category}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-panel-text)', marginBottom: 8, marginTop: 0 }}>
              {HOTSPOTS[tourStep]?.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-panel-muted)', lineHeight: 1.7, margin: 0 }}>
              {HOTSPOTS[tourStep]?.desc}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTourStep(Math.max(0, tourStep - 1))}
              disabled={tourStep === 0}
              style={{ flex: 1, padding: '8px', fontSize: 11, border: '1px solid var(--color-panel-card-border)', borderRadius: 6, background: 'transparent', color: tourStep === 0 ? 'var(--color-panel-muted)' : 'var(--color-panel-text)', cursor: tourStep === 0 ? 'not-allowed' : 'pointer' }}
            >
              {'\u2190'} Previous
            </button>
            <button
              onClick={() => setTourStep(Math.min(HOTSPOTS.length - 1, tourStep + 1))}
              disabled={tourStep === HOTSPOTS.length - 1}
              style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, background: tourStep === HOTSPOTS.length - 1 ? 'var(--color-panel-subtle)' : 'rgba(196,162,101,0.15)', color: tourStep === HOTSPOTS.length - 1 ? 'var(--color-panel-muted)' : '#c4a265', cursor: tourStep === HOTSPOTS.length - 1 ? 'not-allowed' : 'pointer' }}
            >
              Next {'\u2192'}
            </button>
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12 }}>
            {HOTSPOTS.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === tourStep ? '#c4a265' : 'var(--color-panel-card-border)' }} />
            ))}
          </div>
        </div>
      )}

      {/* Quiz mode */}
      {mode === 'quiz' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {HOTSPOTS.map((h) => (
            <div key={h.id} style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
            }}>
              <div style={{ fontSize: 10, color: '#6B5B8A', fontWeight: 600, marginBottom: 4 }}>{h.category}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)', marginBottom: 8 }}>
                {h.quiz}
              </div>
              <textarea
                placeholder="Your answer..."
                value={quizAnswers[h.id] ?? ''}
                onChange={(e) => setQuizAnswers({ ...quizAnswers, [h.id]: e.target.value })}
                rows={2}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 11,
                  background: 'var(--color-panel-subtle)', border: '1px solid var(--color-panel-card-border)',
                  borderRadius: 4, color: 'var(--color-panel-text)', fontFamily: 'inherit',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', textAlign: 'center', fontStyle: 'italic' }}>
            Quiz answers are for self-reflection. Click Browse to review the concepts.
          </div>
        </div>
      )}
    </div>
  );
}
