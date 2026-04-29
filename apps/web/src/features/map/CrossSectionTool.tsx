import { useEffect, useRef, useState } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import type { ElevationProfileResponse } from '@ogden/shared';
import { mapZIndex, semantic } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  useSiteAnnotationsStore,
  newAnnotationId,
  type Transect,
} from '../../store/siteAnnotationsStore.js';

interface CrossSectionToolProps {
  projectId: string;
  map: maplibregl.Map | null;
  draw: MapboxDraw | null;
  /** When true, render a 40 px icon-only trigger suitable for the
   *  vertical left tool spine. Profile panel is unchanged. */
  compact?: boolean;
}

/**
 * Â§2 cross-section profile tool. On activate, switches MapboxDraw into
 * `draw_line_string` mode. On completion, POSTs the LineString to
 * `/api/v1/elevation/profile` and renders the returned samples as an inline
 * SVG line chart in a floating panel.
 */
export default function CrossSectionTool({ projectId, map, draw, compact = false }: CrossSectionToolProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ElevationProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Endpoints of the most recently drawn line, kept so "Save as transect"
   *  can persist them to siteAnnotationsStore without re-drawing. */
  const drawnLineRef = useRef<{ start: [number, number]; end: [number, number] } | null>(null);

  useEffect(() => {
    if (!active || !map || !draw) return;

    const handleCreate = (e: { features: Array<{ geometry: GeoJSON.Geometry }> }) => {
      const feature = e.features[0];
      if (!feature || feature.geometry.type !== 'LineString') return;
      const line = feature.geometry as GeoJSON.LineString;
      const coords = line.coordinates as [number, number][];
      if (coords.length >= 2) {
        drawnLineRef.current = {
          start: coords[0]!,
          end: coords[coords.length - 1]!,
        };
      }

      setLoading(true);
      setError(null);
      api.elevation
        .profile({
          projectId,
          geometry: { type: 'LineString', coordinates: coords },
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
    background: active ? semantic.primary : 'var(--color-chrome-bg-translucent)',
    color: active ? '#fff' : '#c4b49a',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  };

  const onTrigger = () => {
    if (active) {
      draw?.changeMode('simple_select');
      draw?.deleteAll();
      setActive(false);
    } else {
      setProfile(null);
      setError(null);
      setActive(true);
    }
  };

  return (
    <>
      {compact ? (
        <DelayedTooltip
          label={active ? 'Cancel cross-section' : 'Cross-section'}
          position="right"
        >
          <button
            onClick={onTrigger}
            aria-pressed={active}
            className={`spine-btn${active ? ' signifier-shimmer' : ''}`}
            data-active={active}
            aria-label="Cross-section tool"
          >
            {/* Lucide ActivitySquare-style line chart */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 17l6-6 4 4 8-10"/>
              <path d="M3 21h18"/>
            </svg>
          </button>
        </DelayedTooltip>
      ) : (
        <DelayedTooltip label="Draw a line on the map to sample its elevation profile" position="right">
          <button
            onClick={onTrigger}
            style={btnStyle}
            aria-pressed={active}
          >
            {active ? 'Cancel' : 'Cross-section'}
          </button>
        </DelayedTooltip>
      )}

      {(loading || profile || error) && (
        <ProfilePanel
          projectId={projectId}
          loading={loading}
          profile={profile}
          error={error}
          drawnLine={drawnLineRef.current}
          onClose={() => {
            setProfile(null);
            setError(null);
            drawnLineRef.current = null;
          }}
        />
      )}
    </>
  );
}

interface ProfilePanelProps {
  projectId: string;
  loading: boolean;
  profile: ElevationProfileResponse | null;
  error: string | null;
  drawnLine: { start: [number, number]; end: [number, number] } | null;
  onClose: () => void;
}

function ProfilePanel({ projectId, loading, profile, error, drawnLine, onClose }: ProfilePanelProps) {
  const addTransect = useSiteAnnotationsStore((s) => s.addTransect);
  const [name, setName] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  const canSave = !!profile && !!drawnLine && savedId === null;

  function saveAsTransect() {
    if (!profile || !drawnLine) return;
    const elevations = profile.samples
      .map((s) => s.elevationM)
      .filter((v): v is number => v !== null && isFinite(v));
    const t: Transect = {
      id: newAnnotationId('tr'),
      projectId,
      name: name.trim() || `Transect ${new Date().toISOString().slice(0, 10)}`,
      pointA: drawnLine.start,
      pointB: drawnLine.end,
      sampledAt: new Date().toISOString(),
      elevationProfileM: elevations,
      sourceApi: profile.sourceApi,
      confidence: profile.confidence,
      totalDistanceM: profile.totalDistanceM,
    };
    addTransect(t);
    setSavedId(t.id);
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 12,
        right: 12,
        maxWidth: 720,
        margin: '0 auto',
        background: 'var(--color-chrome-bg-translucent)',
        border: '1px solid rgba(196,180,154,0.25)',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
        zIndex: mapZIndex.top,
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
          Ã—
        </button>
      </div>
      {loading && <div style={{ color: '#c4b49a', fontSize: 12 }}>Sampling DEMâ€¦</div>}
      {error && <div style={{ color: '#d07b7b', fontSize: 12 }}>{error}</div>}
      {profile && <ProfileChart profile={profile} />}
      {profile && drawnLine ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(196,180,154,0.18)' }}>
          <input
            type="text"
            placeholder="Transect name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={savedId !== null}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(196,180,154,0.25)',
              borderRadius: 4,
              color: '#e9decb',
              padding: '4px 8px',
              fontSize: 12,
            }}
          />
          <button
            type="button"
            onClick={saveAsTransect}
            disabled={!canSave}
            style={{
              padding: '5px 10px',
              borderRadius: 4,
              border: 'none',
              cursor: canSave ? 'pointer' : 'default',
              fontSize: 12,
              fontWeight: 500,
              background: savedId !== null ? 'rgba(120, 200, 130, 0.85)' : semantic.primary,
              color: '#1a1a1a',
              opacity: canSave ? 1 : 0.6,
            }}
          >
            {savedId !== null ? 'Saved âœ“' : 'Save as transect'}
          </button>
        </div>
      ) : null}
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
        <span>min {minM?.toFixed(1) ?? 'â€”'} m</span>
        <span>max {maxM?.toFixed(1) ?? 'â€”'} m</span>
        <span>relief {reliefM?.toFixed(1) ?? 'â€”'} m</span>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{sourceApi}</span>
      </div>
    </div>
  );
}
