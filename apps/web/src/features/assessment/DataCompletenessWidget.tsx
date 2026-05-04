/**
 * DataCompletenessWidget — shows a visual ring/progress chart
 * of how much data has been gathered for a project.
 *
 * P1 features from Section 3:
 *   - Data Completeness Score on project dashboard
 *
 * The score is computed from:
 *   - Property boundary (required for most analyses)
 *   - Metadata completeness (address, zoning, water rights, etc.)
 *   - Tier 1 data layer availability (7 layer types)
 *   - Tier 2 user-provided data (uploads, notes)
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';

interface DataCompletenessWidgetProps {
  project: LocalProject;
  compact?: boolean;
}

interface CompletenessBreakdown {
  category: string;
  label: string;
  score: number; // 0-100
  weight: number; // 0-1
  items: { name: string; complete: boolean }[];
}

export default function DataCompletenessWidget({ project, compact }: DataCompletenessWidgetProps) {
  const siteData = useSiteData(project.id);
  const breakdown = computeCompleteness(project, siteData);
  const overallScore = Math.round(
    breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) /
      breakdown.reduce((sum, b) => sum + b.weight, 0),
  );

  if (compact) {
    return <CompactRing score={overallScore} />;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <CompactRing score={overallScore} size={64} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Data Completeness</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {overallScore >= 70
              ? 'Good coverage for initial assessment'
              : overallScore >= 40
                ? 'Partial data — some analyses limited'
                : 'Add more data to unlock analyses'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {breakdown.map((cat) => (
          <CategoryRow key={cat.category} breakdown={cat} />
        ))}
      </div>

      {overallScore < 70 && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            background: 'rgba(138, 109, 30, 0.08)',
            border: '1px solid rgba(138, 109, 30, 0.15)',
            borderRadius: 'var(--radius-md)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}
        >
          Upload site data (soil tests, surveys, photos) to improve analysis confidence.
        </div>
      )}
    </div>
  );
}

// ─── Ring component ──────────────────────────────────────────────────────

function CompactRing({ score, size = 48 }: { score: number; size?: number }) {
  const strokeWidth = size > 50 ? 5 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  const color =
    score >= 70
      ? 'var(--color-confidence-high, #2d7a4f)'
      : score >= 40
        ? 'var(--color-confidence-medium, #8a6d1e)'
        : 'var(--color-confidence-low, #9b3a2a)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border, rgba(82, 72, 52, 0.14))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 50 ? 16 : 12,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text, #f2ede3)',
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Category row ────────────────────────────────────────────────────────

function CategoryRow({ breakdown }: { breakdown: CompletenessBreakdown }) {
  const completedCount = breakdown.items.filter((i) => i.complete).length;
  const totalCount = breakdown.items.length;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{breakdown.label}</span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
          }}
        >
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', marginBottom: 6 }}>
        <div
          style={{
            height: '100%',
            width: `${breakdown.score}%`,
            borderRadius: 2,
            background:
              breakdown.score >= 70
                ? 'var(--color-confidence-high, #2d7a4f)'
                : breakdown.score >= 40
                  ? 'var(--color-confidence-medium, #8a6d1e)'
                  : 'var(--color-confidence-low, #9b3a2a)',
            transition: 'width 400ms ease',
          }}
        />
      </div>

      {/* Item checklist */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {breakdown.items.map((item) => (
          <span
            key={item.name}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 3,
              background: item.complete ? 'rgba(45, 122, 79, 0.12)' : 'rgba(0,0,0,0.1)',
              color: item.complete ? 'var(--color-confidence-high, #2d7a4f)' : 'var(--color-text-muted)',
            }}
          >
            {item.complete ? '+' : '-'} {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Scoring logic ───────────────────────────────────────────────────────

function isLayerComplete(siteData: import('../../store/siteDataStore.js').SiteData | null, layerType: string): boolean {
  if (!siteData) return false;
  const layer = siteData.layers.find((l) => l.layerType === layerType);
  return layer?.fetchStatus === 'complete';
}

function computeCompleteness(project: LocalProject, siteData: import('../../store/siteDataStore.js').SiteData | null): CompletenessBreakdown[] {
  const categories: CompletenessBreakdown[] = [];

  // 1. Property basics (weight 0.3)
  const basicItems = [
    { name: 'Name', complete: !!project.name },
    { name: 'Address', complete: !!project.address },
    { name: 'Boundary', complete: project.hasParcelBoundary },
    { name: 'Project Type', complete: !!project.projectType },
    { name: 'Province/State', complete: !!project.provinceState },
  ];
  categories.push({
    category: 'basics',
    label: 'Property Basics',
    weight: 0.3,
    items: basicItems,
    score: Math.round((basicItems.filter((i) => i.complete).length / basicItems.length) * 100),
  });

  // 2. Regulatory & notes (weight 0.25)
  const regItems = [
    { name: 'Zoning Notes', complete: !!project.zoningNotes },
    { name: 'Water Rights', complete: !!project.waterRightsNotes },
    { name: 'Access Notes', complete: !!project.accessNotes },
    { name: 'Owner Notes', complete: !!project.ownerNotes },
  ];
  categories.push({
    category: 'regulatory',
    label: 'Regulatory & Notes',
    weight: 0.25,
    items: regItems,
    score: Math.round((regItems.filter((i) => i.complete).length / regItems.length) * 100),
  });

  // 3. Tier 1 data layers (weight 0.3) — checks real fetch status from siteDataStore
  const layerItems = [
    { name: 'Elevation', complete: isLayerComplete(siteData, 'elevation') },
    { name: 'Soils', complete: isLayerComplete(siteData, 'soils') },
    { name: 'Watershed', complete: isLayerComplete(siteData, 'watershed') },
    { name: 'Wetlands/Flood', complete: isLayerComplete(siteData, 'wetlands_flood') },
    { name: 'Land Cover', complete: isLayerComplete(siteData, 'land_cover') },
    { name: 'Climate', complete: isLayerComplete(siteData, 'climate') },
    { name: 'Zoning GIS', complete: isLayerComplete(siteData, 'zoning') },
  ];
  categories.push({
    category: 'tier1',
    label: 'Tier 1 Data Layers',
    weight: 0.3,
    items: layerItems,
    score: Math.round((layerItems.filter((i) => i.complete).length / layerItems.length) * 100),
  });

  // 4. User-provided data (weight 0.15)
  const hasGeoAttachment = project.attachments.some(
    (a) => a.type === 'kml' || a.type === 'geojson' || a.type === 'shapefile',
  );
  const hasPhoto = project.attachments.some((a) => a.type === 'photo');
  const hasDoc = project.attachments.some((a) => a.type === 'document');

  const userItems = [
    { name: 'Site Files', complete: hasGeoAttachment },
    { name: 'Photos', complete: hasPhoto },
    { name: 'Documents', complete: hasDoc },
  ];
  categories.push({
    category: 'user',
    label: 'User-Provided Data',
    weight: 0.15,
    items: userItems,
    score: Math.round((userItems.filter((i) => i.complete).length / userItems.length) * 100),
  });

  return categories;
}
