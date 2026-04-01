/**
 * EducationalBookletExport — printable educational booklet with hotspot content.
 */

import type { LocalProject } from '../../store/projectStore.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

const EDUCATIONAL_CONTENT = [
  {
    category: 'Water Systems',
    title: 'Keyline Water Design',
    content: 'Keyline design reads the natural water lines of the landscape to harvest, slow, and distribute rainfall across the entire property. By placing dams, swales, and channels along the "keyline" — the point where a valley transitions to a ridge — water is moved from wet areas to dry areas using gravity alone.',
    icon: '\u{1F4A7}',
  },
  {
    category: 'Livestock',
    title: 'Rotational Grazing Systems',
    content: 'Managed rotational grazing mimics the movement patterns of wild herbivore herds. Animals are concentrated in small paddocks for short periods, then moved, allowing the land to fully recover. This builds soil, sequesters carbon, and produces healthier animals than continuous grazing.',
    icon: '\u{1F404}',
  },
  {
    category: 'Spiritual Design',
    title: 'Sacred Spaces & Contemplation',
    content: 'In the OGDEN design philosophy, sacred spaces are not afterthoughts — they are primary design elements. Prayer pavilions, contemplation gardens, and quiet zones are sited first, with productive systems arranged around them. The land serves both body and spirit.',
    icon: '\u{1F54C}',
  },
  {
    category: 'Agroforestry',
    title: 'Food Forest Design',
    content: 'A food forest mimics the seven layers of a natural forest ecosystem: tall canopy trees, understory trees, shrubs, herbaceous plants, ground cover, root crops, and climbing vines. Once established, it produces abundant food with minimal maintenance while building soil and habitat.',
    icon: '\u{1F333}',
  },
  {
    category: 'Ecology',
    title: 'Regenerative Land Management',
    content: 'Regenerative design goes beyond sustainability — it actively improves the land over time. Every intervention is evaluated by whether it builds soil, increases biodiversity, improves water cycles, and enhances the productive capacity of the land for future generations.',
    icon: '\u{1F331}',
  },
  {
    category: 'Community',
    title: 'Community Commons & Gathering',
    content: 'The commons is the heart of any intentional land project. It provides space for shared meals, celebrations, learning, and decision-making. In the OGDEN model, the commons connects the productive landscape with the human community that stewards it.',
    icon: '\u{1F3D5}',
  },
];

export default function EducationalBookletExport({ project, onClose }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 680, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, color: '#312617' }}>
        {/* Controls */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e4d9c6' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Educational Booklet</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: '#7d6140', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding: '6px 12px', fontSize: 14, border: '1px solid #e4d9c6', borderRadius: 6, background: 'transparent', color: '#9a8a74', cursor: 'pointer' }}>
              {'\u00D7'}
            </button>
          </div>
        </div>

        <div style={{ padding: '32px 40px' }}>
          {/* Cover */}
          <div style={{ textAlign: 'center', marginBottom: 40, paddingBottom: 24, borderBottom: '2px solid #7d6140' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#9a8a74', textTransform: 'uppercase', marginBottom: 8 }}>
              OGDEN Land Design Atlas
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 300, margin: '0 0 8px', color: '#312617' }}>
              {project.name}
            </h1>
            <p style={{ fontSize: 14, color: '#634c31', fontStyle: 'italic' }}>
              An interpretive guide to the design decisions, ecology, and purpose behind the land.
            </p>
          </div>

          {/* Chapters */}
          {EDUCATIONAL_CONTENT.map((chapter, i) => (
            <div key={chapter.title} style={{ marginBottom: 32, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#f2ede3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {chapter.icon}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#9a8a74', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Chapter {i + 1} — {chapter.category}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: '#312617' }}>
                    {chapter.title}
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: '#4a3823', margin: 0, paddingLeft: 48 }}>
                {chapter.content}
              </p>
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e4d9c6', fontSize: 10, color: '#9a8a74', textAlign: 'center', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px' }}>
              This booklet was generated by the OGDEN Land Design Atlas for {project.name}.
            </p>
            <p style={{ margin: 0, fontStyle: 'italic' }}>
              &ldquo;A tool for seeing land whole — and building it wisely.&rdquo;
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 9 }}>
              {new Date().toLocaleDateString()} — For educational purposes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
