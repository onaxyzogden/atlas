/**
 * EducationalBookletExport — generates educational booklet PDF via backend.
 * Shows preview summary before export, progress indicator, and download link.
 */

import { useEffect, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { api } from '../../lib/apiClient.js';
import { sage, success, warning, group, semantic, zIndex } from '../../lib/tokens.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

const EDUCATIONAL_CONTENT = [
  {
    category: 'Water Systems',
    title: 'Keyline Water Design',
    content: 'Keyline design reads the natural water lines of the landscape to harvest, slow, and distribute rainfall across the entire property. By placing dams, swales, and channels along the "keyline" \u2014 the point where a valley transitions to a ridge \u2014 water is moved from wet areas to dry areas using gravity alone.',
  },
  {
    category: 'Livestock',
    title: 'Rotational Grazing Systems',
    content: 'Managed rotational grazing mimics the movement patterns of wild herbivore herds. Animals are concentrated in small paddocks for short periods, then moved, allowing the land to fully recover. This builds soil, sequesters carbon, and produces healthier animals than continuous grazing.',
  },
  {
    category: 'Spiritual Design',
    title: 'Sacred Spaces & Contemplation',
    content: 'In the OGDEN design philosophy, sacred spaces are not afterthoughts \u2014 they are primary design elements. Prayer pavilions, contemplation gardens, and quiet zones are sited first, with productive systems arranged around them. The land serves both body and spirit.',
  },
  {
    category: 'Agroforestry',
    title: 'Food Forest Design',
    content: 'A food forest mimics the seven layers of a natural forest ecosystem: tall canopy trees, understory trees, shrubs, herbaceous plants, ground cover, root crops, and climbing vines. Once established, it produces abundant food with minimal maintenance while building soil and habitat.',
  },
  {
    category: 'Ecology',
    title: 'Regenerative Land Management',
    content: 'Regenerative design goes beyond sustainability \u2014 it actively improves the land over time. Every intervention is evaluated by whether it builds soil, increases biodiversity, improves water cycles, and enhances the productive capacity of the land for future generations.',
  },
  {
    category: 'Community',
    title: 'Community Commons & Gathering',
    content: 'The commons is the heart of any intentional land project. It provides space for shared meals, celebrations, learning, and decision-making. In the OGDEN model, the commons connects the productive landscape with the human community that stewards it.',
  },
];

export default function EducationalBookletExport({ project, onClose }: Props) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus('generating');
    setError(null);
    try {
      const { data } = await api.exports.generate(project.id, {
        exportType: 'educational_booklet',
      });
      setDownloadUrl(data.storageUrl);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setStatus('error');
    }
  };

  // a11y: Escape key closes the booklet-export modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
    <div style={{ position: 'fixed', inset: 0, zIndex: zIndex.modal, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: 680, maxHeight: '90vh', overflowY: 'auto', background: semantic.surface, borderRadius: 12, color: sage[900] }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(21,128,61,0.15)' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Educational Booklet</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {status === 'idle' && (
              <button
                onClick={handleGenerate}
                style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: group.reporting, color: semantic.surface, cursor: 'pointer', fontWeight: 500 }}
              >
                Generate PDF
              </button>
            )}
            {status === 'generating' && (
              <span style={{ padding: '6px 16px', fontSize: 12, color: warning.DEFAULT, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={warning.DEFAULT} strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Generating PDF...
              </span>
            )}
            {status === 'done' && downloadUrl && (
              <>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: group.reporting, color: semantic.surface, textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </a>
                <button
                  onClick={handleGenerate}
                  style={{ padding: '6px 12px', fontSize: 12, border: '1px solid rgba(202,138,4,0.25)', borderRadius: 6, background: 'transparent', color: warning.DEFAULT, cursor: 'pointer', fontWeight: 500 }}
                >
                  Regenerate
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={handleGenerate}
                style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: group.reporting, color: semantic.surface, cursor: 'pointer', fontWeight: 500 }}
              >
                Retry
              </button>
            )}
            <button onClick={onClose} style={{ padding: '6px 12px', fontSize: 14, border: '1px solid rgba(21,128,61,0.15)', borderRadius: 6, background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>
              {'\u00D7'}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div style={{ margin: '12px 20px 0', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Preview summary */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(21,128,61,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: group.reporting, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
            Booklet Preview
          </div>
          <div style={{ fontSize: 12, color: sage[900], lineHeight: 1.6, marginBottom: 12 }}>
            This educational booklet for <strong>{project.name}</strong> will contain {EDUCATIONAL_CONTENT.length} chapters
            covering the core design principles and ecological strategies used in your project.
            Estimated length: ~8 pages.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EDUCATIONAL_CONTENT.map((ch) => (
              <span key={ch.category} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: success[50], color: group.reporting, fontWeight: 500,
              }}>
                {ch.category}
              </span>
            ))}
          </div>
        </div>

        {/* Chapter previews */}
        <div style={{ padding: '24px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: `2px solid ${group.reporting}` }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: warning.DEFAULT, textTransform: 'uppercase', marginBottom: 8 }}>
              OGDEN Land Design Atlas
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 300, margin: '0 0 8px', color: sage[900], fontFamily: "'Fira Code', monospace" }}>
              {project.name}
            </h1>
            <p style={{ fontSize: 13, color: group.reporting, fontStyle: 'italic' }}>
              An interpretive guide to the design decisions, ecology, and purpose behind the land.
            </p>
          </div>

          {EDUCATIONAL_CONTENT.map((chapter, i) => (
            <div key={chapter.title} style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: success[50], border: '1px solid rgba(21,128,61,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: group.reporting, flexShrink: 0,
                  fontFamily: "'Fira Code', monospace",
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: warning.DEFAULT, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {chapter.category}
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: sage[900], fontFamily: "'Fira Code', monospace" }}>
                    {chapter.title}
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.8, color: sage[900], margin: 0, paddingLeft: 44, opacity: 0.85 }}>
                {chapter.content}
              </p>
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid rgba(21,128,61,0.15)', fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px' }}>
              Generated by OGDEN Land Design Atlas for {project.name}.
            </p>
            <p style={{ margin: 0, fontStyle: 'italic', color: group.reporting }}>
              &ldquo;A tool for seeing land whole \u2014 and building it wisely.&rdquo;
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 9 }}>
              {new Date().toLocaleDateString()} \u2014 For educational purposes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
