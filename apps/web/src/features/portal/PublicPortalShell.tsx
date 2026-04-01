/**
 * PublicPortalShell — full-page storytelling layout for the public portal.
 * Dark earth-tone aesthetic, scroll-spy navigation, OGDEN footer.
 */

import { useState, useRef } from 'react';
import type { PortalConfig } from '../../store/portalStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import HeroSection from './sections/HeroSection.js';
import MissionOverlay from './sections/MissionOverlay.js';
import InteractiveMapView from './sections/InteractiveMapView.js';
import StageRevealStory from './sections/StageRevealStory.js';
import BeforeAfterSlider from './sections/BeforeAfterSlider.js';
import NarrativeSections from './sections/NarrativeSections.js';
import SupportCTA from './sections/SupportCTA.js';

interface Props {
  config: PortalConfig;
  project: LocalProject;
}

const SECTION_COMPONENTS: Record<string, React.FC<{ config: PortalConfig; project: LocalProject }>> = {
  hero: HeroSection,
  mission: MissionOverlay,
  map: InteractiveMapView,
  stageReveal: StageRevealStory,
  narrative: NarrativeSections,
  support: SupportCTA,
};

export default function PublicPortalShell({ config, project }: Props) {
  const [activeSection, setActiveSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sectionLabels: Record<string, string> = {
    hero: project.name,
    mission: 'Our Mission',
    map: 'Explore the Land',
    stageReveal: 'The Vision',
    beforeAfter: 'Transformation',
    guidedTour: 'Guided Tour',
    narrative: 'The Journey',
    support: 'Get Involved',
    education: 'Learn',
  };

  return (
    <div
      ref={scrollRef}
      style={{
        minHeight: '100vh',
        background: '#1a1611',
        color: '#f2ede3',
        fontFamily: "'Inter', 'Georgia', system-ui, serif",
        overflowX: 'hidden',
      }}
    >
      {/* Floating nav */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(26, 22, 17, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(196,162,101,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#c4a265' }}>
            OGDEN
          </span>
          <span style={{ fontSize: 11, color: '#9a8a74', borderLeft: '1px solid #3d3328', paddingLeft: 8 }}>
            {project.name}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {config.sections.map((section, i) => (
            <button
              key={section}
              onClick={() => {
                const el = document.getElementById(`portal-section-${section}`);
                el?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection(i);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: activeSection === i ? '#c4a265' : '#9a8a74',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: activeSection === i ? 600 : 400,
                letterSpacing: '0.02em',
              }}
            >
              {sectionLabels[section] ?? section}
            </button>
          ))}
        </div>
      </nav>

      {/* Sections */}
      {config.sections.map((section) => {
        const Component = SECTION_COMPONENTS[section];
        if (!Component) return null;
        return (
          <div key={section} id={`portal-section-${section}`}>
            <Component config={config} project={project} />
          </div>
        );
      })}

      {/* Before/After pairs (if in sections) */}
      {config.sections.includes('beforeAfter') && config.beforeAfterPairs.length > 0 && (
        <div id="portal-section-beforeAfter">
          {config.beforeAfterPairs.map((pair) => (
            <BeforeAfterSlider key={pair.id} pair={pair} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          borderTop: '1px solid rgba(196,162,101,0.1)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#c4a265', marginBottom: 8 }}>
          OGDEN
        </div>
        <div style={{ fontSize: 11, color: '#6b5b4a' }}>
          Land Design Atlas — A tool for seeing land whole and building it wisely.
        </div>
        <div style={{ fontSize: 10, color: '#4a3823', marginTop: 12 }}>
          {project.address && <span>{project.address}</span>}
          {project.provinceState && <span> &middot; {project.provinceState}, {project.country}</span>}
        </div>
      </footer>
    </div>
  );
}
