import { useEffect, useState } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import type { ElevationProfileResponse } from '@ogden/shared';
import { semantic } from '../../lib/tokens.js';

interface CrossSectionToolProps {
  projectId: string;
  map: maplibregl.Map | null;
  draw: MapboxDraw | null;
}

/**
 * §2 cross-section profile tool. On activate, switches MapboxDraw into
 * `draw_line_string` mode. On completion, POSTs the LineString to
 * `/api/v1/elevation/profile` and renders the returned samples as an inline
 * SVG line chart in a floating panel.
 */
export default function CrossSectionTool({ projectId, map, draw }: CrossSectionToolProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ElevationProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !map || !draw) return;

    const handleCreate = (e: { features: Array<{ geometry: GeoJSON.Geometry }> }) => {
      const feature = e.features[0];
      if (!feature || feature.geometry.type !== 'LineString') return;
      const line = feature.geometry as GeoJSON.LineString;

      setLoading(true);
      setError(null);
      api.elevation
        .profile({
          projectId,
          geometry: { type: 'LineString', coordinates: line.coordinates as [number, number][] },
          sampleCount: 128,
        })
        .then(({ data }) => setProfile(data))
        .catch((err: Error) => setError(err.message))
        .finally(() => {
          setLoading(false);
          setActive(false);
          draw.deleteAll();
        });
    };

    draw.changeMode('draw_line_string');
    map.on('draw.create', handleCreate);
    return () => {
      map.off('draw.create', handleCreate);
    };
  }, [active, map, draw, projectId]);

  const btnStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    background: active ? semantic.primary : 'rgba(26, 22, 17, 0.85)',
    color: active ? '#fff' : '#c4b49a',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  };

  return (
    <>
      <button
        onClick={() => {
          if (active) {
            draw?.changeMode('simple_select');
            draw?.deleteAll();
            setActive(false);
          } else {
            setProfile(null);
            setError(null);
            setActive(true);
          }
        }}
        style={btnStyle}
        aria-pressed={active}
        title="Draw a line on the map to sample its elevation profile"
      >
        {active ? 'Cancel' : 'Cross-section'}
      </button>

      {(loading || profile || error) && (
        <ProfilePanel
          loading={loading}
          profile={profile}
          error={error}
          onClose={() => {
            setProfile(null);
            setError(null);
          }}
        />
      )}
    </>
  );
}

interface ProfilePanelProps {
  loading: boolean;
  profile: ElevationProfileResponse | null;
  error: string | null;
  onClose: () => void;
}

function ProfilePanel({ loading, profile, error, onClose }: ProfilePanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 12,
        right: 12,
        maxWidth: 720,
        margin: '0 auto',
        background: 'rgba(26, 22, 17, 0.95)',
        border: '1px solid rgba(196,180,154,0.25)',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
        zIndex: 50,
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#e9decb', fontSize: 13, fontWeight: 600 }}>Elevation profile</div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#c4b49a', cursor: 'pointer', fontSize: 16 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {loading && <div style={{ color: '#c4b49a', fontSize: 12 }}>Sampling DEM…</div>}
      {error && <div style={{ color: '#d07b7b', fontSize: 12 }}>{error}</div>}
      {profile && <ProfileChart profile={profile} />}
    </div>
  );
}

function ProfileChart({ profile }: { profile: ElevationProfileResponse }) {
  const { samples, totalDistanceM, minM, maxM, reliefM, sourceApi } = profile;
  const W = 680;
  const H = 160;
  const padL = 40, padR = 10, padT = 10, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yMin = minM ?? 0;
  const yMax = maxM ?? 1;
  const yRange = Math.max(yMax - yMin, 1);

  const points = samples
    .filter((s) => s.elevationM !== null)
    .map((s) => {
      const x = padL + (s.distanceM / Math.max(totalDistanceM, 1)) * plotW;
      const y = padT + plotH - ((s.elevationM! - yMin) / yRange) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <svg width={W} height={H} style={{ maxWidth: '100%', display: 'block' }}>
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="rgba(255,255,255,0.03)" />
        {/* y-axis labels */}
        <text x={padL - 6} y={padT + 4} fill="#c4b49a" fontSize="10" textAnchor="end">
          {yMax.toFixed(0)}m
        </text>
        <text x={padL - 6} y={padT + plotH} fill="#c4b49a" fontSize="10" textAnchor="end">
          {yMin.toFixed(0)}m
        </text>
        {/* x-axis labels */}
        <text x={padL} y={H - 6} fill="#c4b49a" fontSize="10">0</text>
        <text x={padL + plotW} y={H - 6} fill="#c4b49a" fontSize="10" textAnchor="end">
          {totalDistanceM >= 1000 ? `${(totalDistanceM / 1000).toFixed(2)} km` : `${totalDistanceM.toFixed(0)} m`}
        </text>
        <polyline points={points} fill="none" stroke={semantic.primary} strokeWidth={1.5} />
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#c4b49a', marginTop: 4 }}>
        <span>min {minM?.toFixed(1) ?? '—'} m</span>
        <span>max {maxM?.toFixed(1) ?? '—'} m</span>
        <span>relief {reliefM?.toFixed(1) ?? '—'} m</span>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{sourceApi}</span>
      </div>
    </div>
  );
}
