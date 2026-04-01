/**
 * SiteAssessmentPanel — displays computed site scores with confidence indicators.
 *
 * P1 features from Section 4:
 *   - Property suitability, regenerative potential, buildability scores
 *   - Water resilience, agricultural suitability, habitat sensitivity scores
 *   - Risk / opportunity / limitation summaries
 *
 * All scores show confidence levels per Section 0d.
 * Without real data layers, scores are shown as "pending" with low confidence.
 */

import type { ConfidenceLevel } from '@ogden/shared';
import ConfidenceIndicator from './ConfidenceIndicator.js';
import type { LocalProject } from '../../store/projectStore.js';

interface ScoreEntry {
  label: string;
  value: number | null; // 0-100 or null if not computed
  confidence: ConfidenceLevel;
  sources: string[];
  description: string;
}

interface AssessmentFlag {
  type: 'risk' | 'opportunity' | 'limitation';
  title: string;
  description: string;
  confidence: ConfidenceLevel;
}

interface SiteAssessmentPanelProps {
  project: LocalProject;
}

export default function SiteAssessmentPanel({ project }: SiteAssessmentPanelProps) {
  // Compute scores based on what data we have locally
  const scores = computeLocalScores(project);
  const flags = computeLocalFlags(project);

  return (
    <div style={{ padding: 20 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: 16,
        }}
      >
        Site Assessment
      </h3>

      {/* Score cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {scores.map((score) => (
          <ScoreCard key={score.label} score={score} />
        ))}
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-muted)',
              marginBottom: 10,
            }}
          >
            Site Flags
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {flags.map((flag, i) => (
              <FlagCard key={i} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Data sources notice */}
      <div
        style={{
          marginTop: 20,
          padding: 12,
          background: 'var(--color-earth-100)',
          borderRadius: 'var(--radius-md)',
          fontSize: 11,
          color: 'var(--color-earth-700)',
          lineHeight: 1.6,
        }}
      >
        <strong>Note:</strong> These preliminary scores are based on available project metadata.
        Full assessment requires Tier 1 data layers (elevation, soils, watershed, climate) which
        will auto-populate when the data pipeline is connected.
      </div>
    </div>
  );
}

function ScoreCard({ score }: { score: ScoreEntry }) {
  const barColor =
    score.value === null
      ? 'var(--color-border)'
      : score.value >= 70
        ? 'var(--color-confidence-high)'
        : score.value >= 40
          ? 'var(--color-confidence-medium)'
          : 'var(--color-confidence-low)';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{score.label}</span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: score.value !== null ? barColor : 'var(--color-text-muted)',
          }}
        >
          {score.value !== null ? `${score.value}` : '—'}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: 'var(--color-border)',
          marginBottom: 6,
        }}
      >
        {score.value !== null && (
          <div
            style={{
              height: '100%',
              width: `${score.value}%`,
              borderRadius: 2,
              background: barColor,
              transition: 'width 400ms ease',
            }}
          />
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {score.description}
      </div>

      <ConfidenceIndicator confidence={score.confidence} dataSources={score.sources} compact />
    </div>
  );
}

function FlagCard({ flag }: { flag: AssessmentFlag }) {
  const typeColors = {
    risk: { bg: 'rgba(155, 58, 42, 0.08)', border: 'rgba(155, 58, 42, 0.2)', icon: '⚠' },
    opportunity: { bg: 'rgba(45, 122, 79, 0.08)', border: 'rgba(45, 122, 79, 0.2)', icon: '✦' },
    limitation: { bg: 'rgba(138, 109, 30, 0.08)', border: 'rgba(138, 109, 30, 0.2)', icon: '◆' },
  };

  const cfg = typeColors[flag.type];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-md)',
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{cfg.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{flag.title}</span>
        <ConfidenceIndicator confidence={flag.confidence} compact />
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5, paddingLeft: 18 }}>
        {flag.description}
      </div>
    </div>
  );
}

// ─── Local score computation (preliminary, pre-API) ────────────────────────

function computeLocalScores(project: LocalProject): ScoreEntry[] {
  const hasBoundary = project.hasParcelBoundary;
  const hasAddress = !!project.address;
  const hasZoning = !!project.zoningNotes;
  const hasWater = !!project.waterRightsNotes;

  // Base score from available metadata
  const metadataScore = [hasBoundary, hasAddress, hasZoning, hasWater].filter(Boolean).length;
  const baseConfidence: ConfidenceLevel = metadataScore >= 3 ? 'medium' : 'low';

  return [
    {
      label: 'Property Suitability',
      value: hasBoundary ? 35 + metadataScore * 8 : null,
      confidence: baseConfidence,
      sources: ['Project metadata'],
      description: 'Overall suitability for regenerative land use',
    },
    {
      label: 'Regenerative Potential',
      value: hasBoundary ? 40 + metadataScore * 6 : null,
      confidence: baseConfidence,
      sources: ['Project metadata'],
      description: 'Capacity for ecological restoration and soil improvement',
    },
    {
      label: 'Buildability',
      value: hasAddress ? 30 + metadataScore * 10 : null,
      confidence: baseConfidence,
      sources: hasZoning ? ['Zoning notes', 'Project metadata'] : ['Project metadata'],
      description: 'Feasibility for structures, access, and utilities',
    },
    {
      label: 'Water Resilience',
      value: null,
      confidence: 'low',
      sources: [],
      description: 'Requires watershed and climate data layers',
    },
    {
      label: 'Agricultural Suitability',
      value: null,
      confidence: 'low',
      sources: [],
      description: 'Requires soils and climate data layers',
    },
  ];
}

function computeLocalFlags(project: LocalProject): AssessmentFlag[] {
  const flags: AssessmentFlag[] = [];

  if (!project.hasParcelBoundary) {
    flags.push({
      type: 'limitation',
      title: 'No property boundary',
      description: 'Define a boundary to enable terrain analysis, data layer fetching, and area calculations.',
      confidence: 'high',
    });
  }

  if (!project.zoningNotes) {
    flags.push({
      type: 'risk',
      title: 'Zoning not documented',
      description: 'Zoning constraints may affect permitted uses. Add zoning notes or connect to municipal GIS data.',
      confidence: 'medium',
    });
  }

  if (!project.waterRightsNotes) {
    flags.push({
      type: 'risk',
      title: 'Water rights unknown',
      description: 'Water access is critical for agricultural and retreat operations. Document existing water rights.',
      confidence: 'medium',
    });
  }

  if (project.hasParcelBoundary) {
    flags.push({
      type: 'opportunity',
      title: 'Ready for site analysis',
      description: 'Property boundary is set. Connect Tier 1 data layers to unlock terrain, soils, and climate analysis.',
      confidence: 'high',
    });
  }

  if (project.country === 'CA' && project.provinceState === 'ON') {
    flags.push({
      type: 'opportunity',
      title: 'Ontario Conservation Authority data available',
      description: 'Conservation Halton, CVC, and TRCA datasets can enhance wetland and flood risk analysis.',
      confidence: 'medium',
    });
  }

  return flags;
}
