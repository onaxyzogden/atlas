/**
 * TerrainAnalysisFlags — detects and displays terrain-based hazards
 * and opportunities from the map elevation data.
 *
 * P1 features from Section 4:
 *   - Steep slope, flood-prone area, frost pocket, wind exposure detection
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';

interface TerrainAnalysisFlagsProps {
  project: LocalProject;
  layerData: MockLayerResult[] | null;
}

interface TerrainFlag {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'hazard' | 'opportunity' | 'info';
  title: string;
  description: string;
  recommendation: string;
  needsSiteVisit: boolean;
}

export default function TerrainAnalysisFlags({ project, layerData }: TerrainAnalysisFlagsProps) {
  const [expanded, setExpanded] = useState(false);

  const flags = computeTerrainFlags(project, layerData);

  if (flags.length === 0) return null;

  const hazards = flags.filter((f) => f.category === 'hazard');
  const opportunities = flags.filter((f) => f.category === 'opportunity');
  const info = flags.filter((f) => f.category === 'info');

  return (
    <div style={{ padding: '0 20px 16px' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
          }}
        >
          Terrain Analysis ({flags.length} flags)
        </h3>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Hazards first */}
          {hazards.length > 0 && (
            <FlagGroup label="Hazards" flags={hazards} />
          )}

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <FlagGroup label="Opportunities" flags={opportunities} />
          )}

          {/* Info */}
          {info.length > 0 && (
            <FlagGroup label="Information" flags={info} />
          )}

          {/* Site visit notice */}
          {flags.some((f) => f.needsSiteVisit) && (
            <div
              style={{
                padding: 10,
                background: 'rgba(138, 109, 30, 0.08)',
                border: '1px solid rgba(138, 109, 30, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
              }}
            >
              <strong>Needs Site Visit:</strong> Some flags require on-site verification.
              Remote data cannot fully assess local conditions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlagGroup({ label, flags }: { label: string; flags: TerrainFlag[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {flags.map((flag) => (
          <FlagCard key={flag.id} flag={flag} />
        ))}
      </div>
    </div>
  );
}

function FlagCard({ flag }: { flag: TerrainFlag }) {
  const severityConfig = {
    high: { bg: 'rgba(196, 78, 63, 0.08)', border: 'rgba(196, 78, 63, 0.2)', dot: '#c44e3f' },
    medium: { bg: 'rgba(138, 109, 30, 0.08)', border: 'rgba(138, 109, 30, 0.2)', dot: '#8a6d1e' },
    low: { bg: 'rgba(45, 122, 79, 0.08)', border: 'rgba(45, 122, 79, 0.2)', dot: '#2d7a4f' },
  };

  const cfg = severityConfig[flag.severity];

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
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{flag.title}</span>
        {flag.needsSiteVisit && (
          <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(138,109,30,0.15)', color: '#8a6d1e' }}>
            Site Visit
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
        {flag.description}
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-earth-600, #7d6140)', fontStyle: 'italic' }}>
        {flag.recommendation}
      </div>
    </div>
  );
}

// ─── Flag computation ────────────────────────────────────────────────────

function computeTerrainFlags(
  project: LocalProject,
  layerData: MockLayerResult[] | null,
): TerrainFlag[] {
  const flags: TerrainFlag[] = [];

  if (!layerData) return flags;

  const elevation = layerData.find((l) => l.layer_type === 'elevation');
  const soils = layerData.find((l) => l.layer_type === 'soils');
  const climate = layerData.find((l) => l.layer_type === 'climate');
  const wetlands = layerData.find((l) => l.layer_type === 'wetlands_flood');

  // Steep slope detection
  if (elevation) {
    const maxSlope = elevation.summary['max_slope_deg'] as number;
    if (maxSlope > 25) {
      flags.push({
        id: 'steep-slope-high',
        severity: 'high',
        category: 'hazard',
        title: 'Steep Slope Detected',
        description: `Maximum slope of ${maxSlope}° detected. Slopes above 25° present significant challenges for construction, access roads, and erosion control.`,
        recommendation: 'Avoid placing structures on steep slopes. Consider terracing or retaining walls if development is necessary.',
        needsSiteVisit: true,
      });
    } else if (maxSlope > 15) {
      flags.push({
        id: 'moderate-slope',
        severity: 'medium',
        category: 'info',
        title: 'Moderate Slopes Present',
        description: `Maximum slope of ${maxSlope}°. Some areas may require grading or slope stabilization for building pads.`,
        recommendation: 'Plan building sites on flatter portions. Use slopes for orchards, terraced gardens, or water features.',
        needsSiteVisit: false,
      });
    }

    // Elevation range — frost pocket potential
    const minElev = elevation.summary['min_elevation_m'] as number;
    const maxElev = elevation.summary['max_elevation_m'] as number;
    const range = maxElev - minElev;
    if (range > 50) {
      flags.push({
        id: 'frost-pocket-risk',
        severity: 'medium',
        category: 'hazard',
        title: 'Frost Pocket Risk',
        description: `${range}m elevation range across the property. Cold air pools in low-lying areas, creating frost pockets that may damage sensitive crops and extend frost season by 2-4 weeks.`,
        recommendation: 'Avoid placing orchards or frost-sensitive plantings in the lowest elevations. Use cold air drainage corridors to direct frost away from productive areas.',
        needsSiteVisit: true,
      });
    }

    // Aspect-based opportunity
    const aspect = elevation.summary['predominant_aspect'] as string;
    if (aspect === 'S' || aspect === 'SE' || aspect === 'SW') {
      flags.push({
        id: 'south-facing',
        severity: 'low',
        category: 'opportunity',
        title: 'South-Facing Exposure',
        description: `Predominant ${aspect} aspect provides excellent solar exposure for agriculture, passive solar design, and extended growing season.`,
        recommendation: 'Prioritize this aspect for orchards, greenhouses, and primary dwelling sites.',
        needsSiteVisit: false,
      });
    }
  }

  // Wind exposure
  if (climate) {
    const wind = climate.summary['prevailing_wind'] as string;
    flags.push({
      id: 'wind-exposure',
      severity: 'medium',
      category: 'info',
      title: `Prevailing Wind: ${wind}`,
      description: `Prevailing winds from ${wind}. Exposed ridgelines and open fields on this aspect will experience higher wind loads.`,
      recommendation: 'Plant windbreaks on the windward side. Site livestock shelters with wind protection. Consider wind for ventilation in building design.',
      needsSiteVisit: false,
    });

    // Hardiness zone
    const zone = climate.summary['hardiness_zone'] as string;
    flags.push({
      id: 'hardiness-zone',
      severity: 'low',
      category: 'info',
      title: `Hardiness Zone ${zone}`,
      description: `Growing season of ${climate.summary['growing_season_days']} days. First frost: ${climate.summary['first_frost_date']}, Last frost: ${climate.summary['last_frost_date']}.`,
      recommendation: 'Select plant species and cultivars appropriate for this zone. Plan season extension structures for early spring and late fall.',
      needsSiteVisit: false,
    });
  }

  // Soil drainage
  if (soils) {
    const drainage = soils.summary['drainage_class'] as string;
    if (drainage.toLowerCase().includes('poor')) {
      flags.push({
        id: 'poor-drainage',
        severity: 'high',
        category: 'hazard',
        title: 'Poorly Drained Soils',
        description: 'Soil drainage is classified as poor. This affects foundation stability, septic system placement, and limits crop selection.',
        recommendation: 'Plan drainage improvements before construction. Consider raised beds for gardens. Septic system may require engineered design.',
        needsSiteVisit: true,
      });
    }

    // Agricultural opportunity
    const farmClass = soils.summary['farmland_class'] as string;
    if (farmClass.toLowerCase().includes('prime') || farmClass.includes('Class 1') || farmClass.includes('Class 2')) {
      flags.push({
        id: 'prime-farmland',
        severity: 'low',
        category: 'opportunity',
        title: `${farmClass}`,
        description: 'High-quality agricultural soils present. This land has strong potential for productive food systems.',
        recommendation: 'Preserve the best soils for food production. Avoid placing buildings or roads on prime agricultural land.',
        needsSiteVisit: false,
      });
    }
  }

  // Flood / wetland
  if (wetlands) {
    const floodZone = wetlands.summary['flood_zone'] as string;
    if (floodZone && !floodZone.toLowerCase().includes('minimal') && !floodZone.toLowerCase().includes('not regulated')) {
      flags.push({
        id: 'flood-risk',
        severity: 'high',
        category: 'hazard',
        title: 'Flood Zone Detected',
        description: `Property includes ${floodZone} designation. Building in flood zones requires elevated construction, flood insurance, and may restrict certain uses.`,
        recommendation: 'Keep all structures out of the flood zone. Use flood-prone areas for water retention, wetland restoration, or pasture.',
        needsSiteVisit: true,
      });
    }

    const wetlandPct = wetlands.summary['wetland_pct'] as number;
    if (wetlandPct > 10) {
      flags.push({
        id: 'wetland-significant',
        severity: 'medium',
        category: 'info',
        title: `${wetlandPct}% Wetland Coverage`,
        description: 'Significant wetland areas may limit development footprint but provide ecological benefits including water filtration and habitat.',
        recommendation: 'Treat wetlands as assets. Buffer them appropriately and integrate them into the water management strategy.',
        needsSiteVisit: true,
      });
    }
  }

  return flags;
}
