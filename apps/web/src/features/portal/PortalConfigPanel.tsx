/**
 * PortalConfigPanel — right-panel for configuring the public storytelling portal.
 */

import { useState, useMemo } from 'react';
import { usePortalStore, type PortalSection } from '../../store/portalStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import p from '../../styles/panel.module.css';

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

  const portalUrl = `${window.location.origin}/portal/${portalConfig.slug}`;

  return (
    <div className={p.container}>
      <h2 className={p.title}>
        Public Portal
      </h2>

      {/* Publish toggle */}
      <div className={`${p.publishCard} ${portalConfig.isPublished ? p.publishCardOn : p.publishCardOff}`}>
        <div>
          <div className={`${p.text13} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)' }}>
            {portalConfig.isPublished ? 'Published' : 'Not Published'}
          </div>
          <div className={`${p.text10} ${p.muted}`} style={{ marginTop: 2 }}>
            /portal/{portalConfig.slug}
          </div>
        </div>
        <button
          onClick={() => updateConfig(project.id, { isPublished: !portalConfig.isPublished })}
          className={p.btnSmall}
          style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none',
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
          className={p.btn}
          style={{ marginBottom: 16, fontWeight: 600, borderColor: 'rgba(196,162,101,0.2)', background: 'rgba(196,162,101,0.08)', color: '#c4a265' }}
        >
          Open Portal Preview
        </button>
      )}

      {/* Slug */}
      <SectionHeader label="Portal URL Slug" expanded={expanded === 'slug'} onToggle={() => setExpanded(expanded === 'slug' ? null : 'slug')} />
      {expanded === 'slug' && (
        <div className={p.mb12}>
          <input
            type="text"
            value={portalConfig.slug}
            onChange={(e) => updateConfig(project.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className={p.formInput}
            placeholder="my-project"
          />
        </div>
      )}

      {/* Hero */}
      <SectionHeader label="Hero Banner" expanded={expanded === 'hero'} onToggle={() => setExpanded(expanded === 'hero' ? null : 'hero')} />
      {expanded === 'hero' && (
        <div className={`${p.flexCol} ${p.mb12}`} style={{ gap: 8 }}>
          <input type="text" placeholder="Hero title" value={portalConfig.heroTitle} onChange={(e) => updateConfig(project.id, { heroTitle: e.target.value })} className={p.formInput} style={{ marginBottom: 0 }} />
          <input type="text" placeholder="Subtitle" value={portalConfig.heroSubtitle} onChange={(e) => updateConfig(project.id, { heroSubtitle: e.target.value })} className={p.formInput} style={{ marginBottom: 0 }} />
        </div>
      )}

      {/* Mission */}
      <SectionHeader label="Mission Statement" expanded={expanded === 'mission'} onToggle={() => setExpanded(expanded === 'mission' ? null : 'mission')} />
      {expanded === 'mission' && (
        <div className={p.mb12}>
          <textarea
            placeholder="Why this place exists..."
            value={portalConfig.missionStatement}
            onChange={(e) => updateConfig(project.id, { missionStatement: e.target.value })}
            rows={4}
            className={`${p.formInput} ${p.formTextarea}`}
            style={{ marginBottom: 0 }}
          />
        </div>
      )}

      {/* Data masking */}
      <SectionHeader label="Data Privacy" expanded={expanded === 'masking'} onToggle={() => setExpanded(expanded === 'masking' ? null : 'masking')} />
      {expanded === 'masking' && (
        <div className={`${p.flexCol} ${p.mb12}`} style={{ gap: 6 }}>
          {(['full', 'curated', 'minimal'] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateConfig(project.id, { dataMaskingLevel: level })}
              className={p.selectorBtn}
              style={{
                padding: '8px 12px', fontSize: 12,
                ...(portalConfig.dataMaskingLevel === level ? { borderColor: 'rgba(196,162,101,0.3)', background: 'rgba(196,162,101,0.08)' } : {}),
                color: 'var(--color-panel-text)',
              }}
            >
              <div>
                <div className={p.fontMedium} style={{ textTransform: 'capitalize' }}>{level}</div>
                <div className={`${p.text10} ${p.muted}`} style={{ marginTop: 2 }}>
                  {level === 'full' && 'Show all zones, boundaries, and data'}
                  {level === 'curated' && 'Show zones but hide exact parcel boundary'}
                  {level === 'minimal' && 'Approximate location only, no boundaries'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sections ordering */}
      <SectionHeader label="Visible Sections" expanded={expanded === 'sections'} onToggle={() => setExpanded(expanded === 'sections' ? null : 'sections')} />
      {expanded === 'sections' && (
        <div className={`${p.flexCol} ${p.mb12}`} style={{ gap: 4 }}>
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
                className={p.selectorBtn}
                style={{
                  padding: '6px 10px', fontSize: 12,
                  background: active ? 'rgba(196,162,101,0.06)' : undefined,
                  color: active ? 'var(--color-panel-text)' : 'var(--color-panel-muted)',
                }}
              >
                <span className={p.text14}>{active ? '\u2611' : '\u2610'}</span>
                {SECTION_LABELS[section]}
              </button>
            );
          })}
        </div>
      )}

      {/* Donation */}
      <SectionHeader label="Support & Donations" expanded={expanded === 'support'} onToggle={() => setExpanded(expanded === 'support' ? null : 'support')} />
      {expanded === 'support' && (
        <div className={`${p.flexCol} ${p.mb12}`} style={{ gap: 8 }}>
          <input type="url" placeholder="Donation URL" value={portalConfig.donationUrl ?? ''} onChange={(e) => updateConfig(project.id, { donationUrl: e.target.value || null })} className={p.formInput} style={{ marginBottom: 0 }} />
          <input type="email" placeholder="Inquiry email" value={portalConfig.inquiryEmail ?? ''} onChange={(e) => updateConfig(project.id, { inquiryEmail: e.target.value || null })} className={p.formInput} style={{ marginBottom: 0 }} />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`${p.sectionToggle} ${expanded ? p.sectionToggleExpanded : ''}`}
    >
      {label}
      <span className={p.sectionToggleChevron}>{expanded ? '\u25BE' : '\u25B8'}</span>
    </button>
  );
}
