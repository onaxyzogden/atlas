/**
 * PortalConfigPanel — right-panel for configuring the public storytelling portal.
 */

import { useState, useMemo } from 'react';
import { usePortalStore, type PortalSection } from '../../store/portalStore.js';
import type { LocalProject } from '../../store/projectStore.js';

interface Props { project: LocalProject }

const SECTION_LABELS: Record<PortalSection, string> = {
  hero: 'Hero Banner',
  mission: 'Mission Statement',
  map: 'Interactive Map',
  stageReveal: 'Phase Reveal Story',
  beforeAfter: 'Before / After Slider',
  guidedTour: 'Guided Tour',
  narrative: 'Narrative Sections',
  support: 'Get Involved / Donate',
  education: 'Educational Tour',
};

export default function PortalConfigPanel({ project }: Props) {
  const config = usePortalStore((s) => s.getConfig(project.id));
  const createConfig = usePortalStore((s) => s.createConfig);
  const updateConfig = usePortalStore((s) => s.updateConfig);

  const [expanded, setExpanded] = useState<string | null>(null);

  // Auto-create config if none exists
  const portalConfig = useMemo(() => {
    if (config) return config;
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return createConfig(project.id, slug || 'project');
  }, [config, project.id, project.name, createConfig]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 12,
    background: 'var(--color-panel-subtle)', border: '1px solid var(--color-panel-card-border)',
    borderRadius: 6, color: 'var(--color-panel-text)', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };

  const portalUrl = `${window.location.origin}/portal/${portalConfig.slug}`;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Public Portal
      </h2>

      {/* Publish toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 8,
        background: portalConfig.isPublished ? 'rgba(45,122,79,0.08)' : 'var(--color-panel-card)',
        border: `1px solid ${portalConfig.isPublished ? 'rgba(45,122,79,0.2)' : 'var(--color-panel-card-border)'}`,
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-text)' }}>
            {portalConfig.isPublished ? 'Published' : 'Not Published'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginTop: 2 }}>
            /portal/{portalConfig.slug}
          </div>
        </div>
        <button
          onClick={() => updateConfig(project.id, { isPublished: !portalConfig.isPublished })}
          style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
            background: portalConfig.isPublished ? 'rgba(196,78,63,0.15)' : 'rgba(45,122,79,0.15)',
            color: portalConfig.isPublished ? '#c44e3f' : '#2d7a4f',
            cursor: 'pointer',
          }}
        >
          {portalConfig.isPublished ? 'Unpublish' : 'Publish'}
        </button>
      </div>

      {/* Preview button */}
      {portalConfig.isPublished && (
        <button
          onClick={() => window.open(portalUrl, '_blank')}
          style={{
            width: '100%', padding: '10px', fontSize: 12, fontWeight: 600,
            border: '1px solid rgba(196,162,101,0.2)', borderRadius: 8,
            background: 'rgba(196,162,101,0.08)', color: '#c4a265',
            cursor: 'pointer', marginBottom: 16,
          }}
        >
          Open Portal Preview
        </button>
      )}

      {/* Slug */}
      <SectionHeader label="Portal URL Slug" expanded={expanded === 'slug'} onToggle={() => setExpanded(expanded === 'slug' ? null : 'slug')} />
      {expanded === 'slug' && (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={portalConfig.slug}
            onChange={(e) => updateConfig(project.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            style={inputStyle}
            placeholder="my-project"
          />
        </div>
      )}

      {/* Hero */}
      <SectionHeader label="Hero Banner" expanded={expanded === 'hero'} onToggle={() => setExpanded(expanded === 'hero' ? null : 'hero')} />
      {expanded === 'hero' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input type="text" placeholder="Hero title" value={portalConfig.heroTitle} onChange={(e) => updateConfig(project.id, { heroTitle: e.target.value })} style={inputStyle} />
          <input type="text" placeholder="Subtitle" value={portalConfig.heroSubtitle} onChange={(e) => updateConfig(project.id, { heroSubtitle: e.target.value })} style={inputStyle} />
        </div>
      )}

      {/* Mission */}
      <SectionHeader label="Mission Statement" expanded={expanded === 'mission'} onToggle={() => setExpanded(expanded === 'mission' ? null : 'mission')} />
      {expanded === 'mission' && (
        <div style={{ marginBottom: 12 }}>
          <textarea
            placeholder="Why this place exists..."
            value={portalConfig.missionStatement}
            onChange={(e) => updateConfig(project.id, { missionStatement: e.target.value })}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      )}

      {/* Data masking */}
      <SectionHeader label="Data Privacy" expanded={expanded === 'masking'} onToggle={() => setExpanded(expanded === 'masking' ? null : 'masking')} />
      {expanded === 'masking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {(['full', 'curated', 'minimal'] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateConfig(project.id, { dataMaskingLevel: level })}
              style={{
                padding: '8px 12px', fontSize: 12, textAlign: 'left',
                border: `1px solid ${portalConfig.dataMaskingLevel === level ? 'rgba(196,162,101,0.3)' : 'var(--color-panel-card-border)'}`,
                borderRadius: 6,
                background: portalConfig.dataMaskingLevel === level ? 'rgba(196,162,101,0.08)' : 'transparent',
                color: 'var(--color-panel-text)', cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{level}</div>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginTop: 2 }}>
                {level === 'full' && 'Show all zones, boundaries, and data'}
                {level === 'curated' && 'Show zones but hide exact parcel boundary'}
                {level === 'minimal' && 'Approximate location only, no boundaries'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sections ordering */}
      <SectionHeader label="Visible Sections" expanded={expanded === 'sections'} onToggle={() => setExpanded(expanded === 'sections' ? null : 'sections')} />
      {expanded === 'sections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {(Object.keys(SECTION_LABELS) as PortalSection[]).map((section) => {
            const active = portalConfig.sections.includes(section);
            return (
              <button
                key={section}
                onClick={() => {
                  const next = active
                    ? portalConfig.sections.filter((s) => s !== section)
                    : [...portalConfig.sections, section];
                  updateConfig(project.id, { sections: next });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', fontSize: 12,
                  border: '1px solid var(--color-panel-card-border)',
                  borderRadius: 6, background: active ? 'rgba(196,162,101,0.06)' : 'transparent',
                  color: active ? 'var(--color-panel-text)' : 'var(--color-panel-muted)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14 }}>{active ? '\u2611' : '\u2610'}</span>
                {SECTION_LABELS[section]}
              </button>
            );
          })}
        </div>
      )}

      {/* Donation */}
      <SectionHeader label="Support & Donations" expanded={expanded === 'support'} onToggle={() => setExpanded(expanded === 'support' ? null : 'support')} />
      {expanded === 'support' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input type="url" placeholder="Donation URL" value={portalConfig.donationUrl ?? ''} onChange={(e) => updateConfig(project.id, { donationUrl: e.target.value || null })} style={inputStyle} />
          <input type="email" placeholder="Inquiry email" value={portalConfig.inquiryEmail ?? ''} onChange={(e) => updateConfig(project.id, { inquiryEmail: e.target.value || null })} style={inputStyle} />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 0', background: 'none', border: 'none',
        borderBottom: '1px solid var(--color-panel-card-border)',
        color: 'var(--color-panel-text)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
        marginBottom: expanded ? 8 : 0,
      }}
    >
      {label}
      <span style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{expanded ? '\u25BE' : '\u25B8'}</span>
    </button>
  );
}
