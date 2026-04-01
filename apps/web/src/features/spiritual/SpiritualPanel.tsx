/**
 * SpiritualPanel — Qibla bearing display and spiritual zone management.
 *
 * From the Atlas spec: "Prayer spaces, quiet zones, dawn/dusk viewpoints,
 * and contemplative circulation are first-class design elements, not optional add-ons."
 */

import { useMemo, useState } from 'react';
import { computeQibla, bearingToCardinal, type QiblaResult } from '../../lib/qibla.js';
import type { SpiritualZoneType } from '@ogden/shared';

const ZONE_TYPE_LABELS: Record<SpiritualZoneType, { label: string; icon: string; description: string }> = {
  prayer_space: { label: 'Prayer Space', icon: '🕌', description: 'Designated area for salah' },
  quiet_zone: { label: 'Quiet Zone', icon: '🤫', description: 'Contemplative silence area' },
  qibla_axis: { label: 'Qibla Axis', icon: '🧭', description: 'Directional alignment to Mecca' },
  dawn_viewpoint: { label: 'Dawn Viewpoint', icon: '🌅', description: 'Fajr observation point' },
  dusk_viewpoint: { label: 'Dusk Viewpoint', icon: '🌇', description: 'Maghrib observation point' },
  contemplative_path: { label: 'Contemplative Path', icon: '🚶', description: 'Walking meditation route' },
  water_worship_integration: { label: 'Water Integration', icon: '💧', description: 'Wudu / water feature' },
  scenic_overlook: { label: 'Scenic Overlook', icon: '👁', description: 'Landscape contemplation' },
  gathering_circle: { label: 'Gathering Circle', icon: '⭕', description: 'Halaqah / circle seating' },
};

interface SpiritualPanelProps {
  center: [number, number] | null; // [lng, lat] — project centroid
}

export default function SpiritualPanel({ center }: SpiritualPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  const qibla: QiblaResult | null = useMemo(() => {
    if (!center) return null;
    return computeQibla(center[1], center[0]); // lat, lng
  }, [center]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        insetInlineEnd: 16,
        background: 'rgba(26, 22, 17, 0.92)',
        borderRadius: 10,
        padding: 12,
        backdropFilter: 'blur(10px)',
        color: '#f2ede3',
        width: collapsed ? 'auto' : 260,
        zIndex: 5,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#9a8a74',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Spiritual Zones</span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={{ marginTop: 12 }}>
          {/* Qibla bearing */}
          {qibla && (
            <div
              style={{
                background: 'rgba(125, 97, 64, 0.2)',
                border: '1px solid rgba(125, 97, 64, 0.4)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, color: '#9a8a74', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Qibla Direction
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Compass arrow */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '2px solid #7d6140',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: 18,
                      background: '#7d6140',
                      borderRadius: 1,
                      transformOrigin: 'center bottom',
                      transform: `rotate(${qibla.bearing}deg)`,
                      position: 'absolute',
                      top: 4,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: -1,
                      fontSize: 7,
                      color: '#9a8a74',
                      fontWeight: 700,
                    }}
                  >
                    N
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {qibla.bearing.toFixed(1)}°
                  </div>
                  <div style={{ fontSize: 11, color: '#9a8a74' }}>
                    {bearingToCardinal(qibla.bearing)} — {qibla.distanceKm.toFixed(0)} km to Mecca
                  </div>
                </div>
              </div>
            </div>
          )}

          {!qibla && (
            <div style={{ fontSize: 12, color: '#9a8a74', marginBottom: 12 }}>
              Set a property boundary to calculate Qibla direction.
            </div>
          )}

          {/* Zone type palette */}
          <div style={{ fontSize: 11, color: '#9a8a74', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Zone Types
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(Object.entries(ZONE_TYPE_LABELS) as [SpiritualZoneType, { label: string; icon: string; description: string }][]).map(
              ([type, config]) => (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'default',
                    border: '1px solid transparent',
                  }}
                  title={config.description}
                >
                  <span style={{ fontSize: 14 }}>{config.icon}</span>
                  <div>
                    <div style={{ fontWeight: 400 }}>{config.label}</div>
                    <div style={{ fontSize: 10, color: '#9a8a74' }}>{config.description}</div>
                  </div>
                </div>
              ),
            )}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: 'rgba(45, 122, 79, 0.15)',
              borderRadius: 6,
              border: '1px solid rgba(45, 122, 79, 0.3)',
              fontSize: 11,
              color: '#9a8a74',
              lineHeight: 1.5,
            }}
          >
            Zone placement tools will be available in Phase 2. For now, reference the Qibla bearing
            when planning prayer spaces and contemplative areas.
          </div>
        </div>
      )}
    </div>
  );
}
