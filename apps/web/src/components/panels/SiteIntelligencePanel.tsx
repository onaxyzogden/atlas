/**
 * SiteIntelligencePanel — comprehensive site assessment.
 * Matches target design with "LIVE ONTARIO DATA" section,
 * Conservation Authority card, score circle, site summary,
 * and "What This Land Wants" block.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';

interface SiteIntelligencePanelProps {
  project: LocalProject;
}

// ─── Live data rows ──────────────────────────────────────────────────────

interface LiveDataRow {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  confidence: 'High' | 'Medium' | 'Low';
  color: string;
}

function getLiveData(project: LocalProject): LiveDataRow[] {
  if (project.country === 'CA') {
    return [
      { icon: '▲', label: 'Elevation',  value: '266–295 m',                                  confidence: 'High',   color: '#9a8a74' },
      { icon: '●', label: 'Climate',    value: '820 mm/yr · 175 frost-free days',  detail: '6b', confidence: 'High',   color: '#2d7a4f' },
      { icon: '◉', label: 'Soil',       value: 'Clay Loam (Southern Ontario typical)', detail: '2-3\n(CSCS)', confidence: 'High', color: '#9a8a74' },
      { icon: '≋', label: 'Wetlands',   value: 'Yes (298 found)',                              confidence: 'High',   color: '#5b9db8' },
      { icon: '∿', label: 'Hydrology',  value: 'None within 1km',                              confidence: 'High',   color: '#5b9db8' },
    ];
  }
  return [
    { icon: '▲', label: 'Elevation',  value: '185–312 m',                               confidence: 'High',   color: '#9a8a74' },
    { icon: '●', label: 'Climate',    value: '920 mm/yr · 165 frost-free days', detail: '6b', confidence: 'High', color: '#2d7a4f' },
    { icon: '◉', label: 'Soil',       value: 'Loam, Well drained',             detail: 'Prime', confidence: 'High', color: '#9a8a74' },
    { icon: '≋', label: 'Wetlands',   value: '4.2% of area',                              confidence: 'Medium', color: '#5b9db8' },
    { icon: '∿', label: 'Hydrology',  value: '420m to nearest stream',                    confidence: 'Medium', color: '#5b9db8' },
  ];
}

function getConservationAuth(project: LocalProject) {
  if (project.country === 'CA') {
    return {
      name: project.provinceState === 'ON' ? 'Conservation Halton' : 'Grand River Conservation Authority',
      watershed: project.provinceState === 'ON' ? 'Sixteen Mile Creek Watershed' : 'Grand River Watershed',
      buffer: 'Buffer: 30m from watercourse, 120m from wetland boundary (varies)',
    };
  }
  return null;
}

const DATA_LAYER_ROWS = [
  { label: 'Elevation',          value: '280\u2013358 m asl',     confidence: 'High' as const },
  { label: 'Rainfall',           value: '875 mm/year',           confidence: 'High' as const },
  { label: 'Soil Type',          value: 'Brookston Clay Loam',   confidence: 'High' as const },
  { label: 'Slope',              value: 'Not detected',          confidence: 'High' as const },
  { label: 'Frost Free Days',    value: 'Not detected',          confidence: 'High' as const },
  { label: 'Tree Cover',         value: 'Not detected',          confidence: 'Medium' as const },
  { label: 'Wetland Presence',   value: 'Present',               confidence: 'Medium' as const },
  { label: 'Floodplain',         value: 'Present',               confidence: 'High' as const },
];

const ASSESSMENT_SCORES = [
  { label: 'Water Resilience',       score: 76, rating: 'Good' },
  { label: 'Agricultural Suitability', score: 80, rating: 'Good' },
  { label: 'Regenerative Potential',  score: 88, rating: 'Exceptional' },
  { label: 'Buildability',           score: 62, rating: 'Moderate' },
  { label: 'Habitat Sensitivity',    score: 79, rating: 'Good' },
  { label: 'Economic Viability',     score: 74, rating: 'Good' },
];

export default function SiteIntelligencePanel({ project }: SiteIntelligencePanelProps) {
  const [liveDataOpen, setLiveDataOpen] = useState(true);
  const liveData = useMemo(() => getLiveData(project), [project]);
  const consAuth = useMemo(() => getConservationAuth(project), [project]);

  const fields = [
    project.hasParcelBoundary, !!project.address, !!project.projectType,
    !!project.parcelId, !!project.provinceState, !!project.ownerNotes,
    !!project.zoningNotes, !!project.waterRightsNotes,
  ];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const overallScore = 78;
  const now = new Date();
  const lastFetched = `${now.toLocaleDateString()}, ${now.toLocaleTimeString()}`;

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <PanelTitle>Site Intelligence</PanelTitle>
        <RefreshIcon />
      </div>

      {/* ── Overall Suitability ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 16,
          background: 'var(--color-panel-card)',
          border: '1px solid var(--color-panel-card-border)',
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <ScoreCircle score={overallScore} size={68} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-panel-text)' }}>Overall Suitability</div>
          <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 6 }}>Data completeness: {completeness}%</div>
          <div style={{ width: 130, height: 3, background: 'var(--color-panel-subtle)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${completeness}%`, height: '100%', background: '#c4a265', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* ── LIVE ONTARIO DATA ──────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid rgba(196, 162, 101, 0.15)',
          borderRadius: 10,
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        {/* Header bar — clickable to collapse */}
        <button
          onClick={() => setLiveDataOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(196, 162, 101, 0.06)',
            borderBottom: liveDataOpen ? '1px solid rgba(196, 162, 101, 0.1)' : 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#c4a265" strokeWidth={1.5}>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#c4a265', textTransform: 'uppercase' }}>
            Live {project.country === 'CA' ? 'Ontario' : 'US'} Data
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'rgba(45, 122, 79, 0.15)',
              color: '#2d7a4f',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Live
          </span>
          <div style={{ flex: 1 }} />
          <RefreshIcon />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="#9a8a74" strokeWidth={1.5} strokeLinecap="round" style={{ transform: liveDataOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms ease' }}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>

        {/* Data rows — collapsible */}
        {liveDataOpen && (<>
        {/* Data rows */}
        <div style={{ padding: '4px 0' }}>
          {liveData.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: i < liveData.length - 1 ? '1px solid var(--color-panel-subtle)' : 'none',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12, color: row.color, width: 16, textAlign: 'center', flexShrink: 0 }}>
                {row.icon}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-panel-muted)', minWidth: 70 }}>{row.label}</span>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-panel-text)' }}>{row.value}</span>
              </div>
              {row.detail && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'rgba(196, 162, 101, 0.1)',
                    color: '#c4a265',
                    whiteSpace: 'pre-line',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {row.detail}
                </span>
              )}
              <ConfBadge level={row.confidence} />
            </div>
          ))}
        </div>

        {/* Conservation Authority card */}
        {consAuth && (
          <div
            style={{
              margin: '0 10px 10px',
              padding: '10px 12px',
              background: 'rgba(45, 122, 79, 0.06)',
              border: '1px solid rgba(45, 122, 79, 0.15)',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2d7a4f', marginBottom: 2 }}>{consAuth.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', lineHeight: 1.5 }}>
              {consAuth.watershed}
              <br />
              {consAuth.buffer}
            </div>
          </div>
        )}

        {/* Last fetched */}
        <div style={{ padding: '6px 14px 10px', fontSize: 10, color: 'var(--color-panel-muted)', textAlign: 'right' }}>
          Last fetched: {lastFetched}
        </div>
        </>)}
      </div>

      {/* ── Site Summary ───────────────────────────────────────────── */}
      <SectionLabel>Site Summary</SectionLabel>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-panel-text)', marginBottom: 16 }}>
        The {project.name} property is a {project.acreage ? `${project.acreage}-acre` : 'None-acre'} parcel
        {project.provinceState === 'ON'
          ? ' situated within the Conservation Halton watershed in Halton Hills, Ontario. The land features gently rolling drumlin topography \u2014 characteristic of the Halton Uplands \u2014 with remnant Carolinian forest edges, tile-drained agricultural fields, and a seasonal tributary to Sixteen Mile Creek. Soils are primarily Brookston clay loam (CSCS Capability Class 2\u20133) with high organic matter recovery potential. Conservation Halton holds regulatory authority over all floodplain, wetland, and watercourse buffers on the property.'
          : ' with terrain suitable for regenerative land use planning. Site analysis indicates mixed agricultural and conservation potential based on available environmental data layers.'}
      </p>

      {/* ── What This Land Wants ───────────────────────────────────── */}
      <div
        style={{
          padding: 16,
          background: 'rgba(196, 162, 101, 0.04)',
          border: '1px solid rgba(196, 162, 101, 0.15)',
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <SectionLabel>What This Land Wants</SectionLabel>
        <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: 'italic', color: 'var(--color-panel-text)', margin: 0 }}>
          {project.provinceState === 'ON'
            ? '"This land bears the marks of intensive cash cropping \u2014 compacted soils, tile drains pushing water away rather than into the land, hedgerows long removed. It wants to slow water down, rebuild biological activity in the soil, and reestablish the forest\u2013field\u2013water mosaic that once defined this Carolinian landscape. The existing tile drainage is an asset in reverse: redirected and controlled through water control structures, it becomes a precision water management tool. The land is asking to breathe again."'
            : '"This land holds potential for thoughtful stewardship. The soil structure, water patterns, and existing vegetation suggest a landscape that would respond well to regenerative practices."'}
        </p>
      </div>

      {/* ── Assessment Scores ──────────────────────────────────────── */}
      <SectionLabel>Assessment Scores</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {ASSESSMENT_SCORES.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScoreCircle score={item.score} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)' }}>{item.label}</div>
              <div style={{ height: 3, background: 'var(--color-panel-card-border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${item.score}%`, height: '100%', background: getScoreColor(item.score), borderRadius: 2 }} />
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: `${getScoreColor(item.score)}18`,
                color: getScoreColor(item.score),
                minWidth: 65,
                textAlign: 'center',
              }}
            >
              {item.rating}
            </span>
          </div>
        ))}
      </div>

      {/* ── Opportunities ──────────────────────────────────────────── */}
      <SectionLabel>Main Opportunities</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {getOpportunities(project).map((opp, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--color-panel-text)' }}>
            <span style={{ color: '#2d7a4f', flexShrink: 0 }}>↗</span>
            <span>{opp}</span>
          </div>
        ))}
      </div>

      {/* ── Risks ──────────────────────────────────────────────────── */}
      <SectionLabel>Main Risks</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {getRisks(project).map((risk, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--color-panel-text)' }}>
            <span style={{ color: '#9b3a2a', flexShrink: 0 }}>⚠</span>
            <span>{risk}</span>
          </div>
        ))}
      </div>

      {/* ── Data Layers ────────────────────────────────────────────── */}
      <SectionLabel>Data Layers</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {DATA_LAYER_ROWS.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < DATA_LAYER_ROWS.length - 1 ? '1px solid var(--color-panel-subtle)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-panel-text)' }}>{row.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-panel-text)' }}>{row.value}</span>
              <ConfBadge level={row.confidence} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', margin: 0 }}>
      {children}
    </h2>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}

function RefreshIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#9a8a74" strokeWidth={1.5} strokeLinecap="round" style={{ cursor: 'pointer' }}>
      <path d="M1 1v5h5M15 15v-5h-5" />
      <path d="M2.5 10A6 6 0 0113.5 6M13.5 6A6 6 0 012.5 10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="#9a8a74" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 5l3-3 3 3" />
    </svg>
  );
}

function ConfBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const colors = { High: '#2d7a4f', Medium: '#8a6d1e', Low: '#9b3a2a' };
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: 3,
        background: `${colors[level]}18`,
        color: colors[level],
        flexShrink: 0,
      }}
    >
      {level}
    </span>
  );
}

function ScoreCircle({ score, size }: { score: number; size: number }) {
  const sw = size > 50 ? 4 : 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-panel-card-border)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={getScoreColor(score)} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 50 ? 20 : 12, fontWeight: 700, color: 'var(--color-panel-text)', lineHeight: 1 }}>{score}</span>
        {size > 50 && <span style={{ fontSize: 9, color: 'var(--color-panel-muted)' }}>/100</span>}
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#2d7a4f';
  if (score >= 60) return '#c4a265';
  return '#9b3a2a';
}

function getOpportunities(p: LocalProject): string[] {
  if (p.country === 'CA') return [
    'Strong local food economy \u2014 Halton-Peel farm gate, agri-tourism, and farmers market networks well-established',
    'Conservation Halton stewardship partnerships: cost-share programs for tree planting, wetland restoration, and riparian buffers',
    'OMAFRA Environmental Farm Plan (EFP) + Growing Forward 3 funding for beneficial management practices',
    "Carolinian forest fringe restoration aligns with Ontario's 30\u00d730 and Greenbelt priorities \u2014 grant-eligible",
  ];
  return [
    'Regional agricultural market access and direct-to-consumer sales potential',
    'Conservation stewardship program eligibility for habitat restoration',
    'Regenerative agriculture practices qualify for USDA EQIP and CSP funding',
    'Growing demand for agritourism and educational farm experiences',
  ];
}

function getRisks(p: LocalProject): string[] {
  if (p.country === 'CA') return [
    'Conservation Halton permit required for ANY work within Regulated Area \u2014 engage early, timeline 3\u20136 months',
    'Tile drainage disruption is a major hydrological intervention \u2014 independent drainage study required before action',
    'Dog-strangling vine (DSV), common buckthorn, and Norway maple dominate disturbed edges \u2014 multi-year removal program',
    'Ontario Nutrient Management Act applies if livestock planned at commercial scale \u2014 compliance plan required',
    'Bobolink and meadowlark nesting habitat (Species at Risk Act Ontario) may restrict pasture disturbance May\u2013Aug',
  ];
  return [
    'Local zoning may restrict agricultural operations \u2014 verify permitted uses before investment',
    'Soil compaction from prior use may require remediation before productive planting',
    'Stormwater management requirements may apply to any new impervious surfaces',
    'Environmental assessments may be required for wetland-adjacent development',
  ];
}
