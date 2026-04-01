/**
 * SpiritualPanel — Qibla bearing display and spiritual zone management.
 *
 * From the Atlas spec: "Prayer spaces, quiet zones, dawn/dusk viewpoints,
 * and contemplative circulation are first-class design elements, not optional add-ons."
 */

import { useMemo, useState } from 'react';
import { computeQibla, bearingToCardinal, type QiblaResult } from '../../lib/qibla.js';
import type { SpiritualZoneType } from '@ogden/shared';
import s from './SpiritualPanel.module.css';

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
    <div className={`${s.root} ${collapsed ? s.rootCollapsed : s.rootExpanded}`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={s.toggleBtn}
      >
        <span>Spiritual Zones</span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className={s.body}>
          {/* Qibla bearing */}
          {qibla && (
            <div className={s.qiblaCard}>
              <div className={s.qiblaTitle}>
                Qibla Direction
              </div>
              <div className={s.qiblaRow}>
                {/* Compass arrow */}
                <div className={s.compassOuter}>
                  <div
                    className={s.compassNeedle}
                    style={{ transform: `rotate(${qibla.bearing}deg)` }}
                  />
                  <div className={s.compassNorth}>N</div>
                </div>
                <div>
                  <div className={s.qiblaBearing}>
                    {qibla.bearing.toFixed(1)}°
                  </div>
                  <div className={s.qiblaDetail}>
                    {bearingToCardinal(qibla.bearing)} — {qibla.distanceKm.toFixed(0)} km to Mecca
                  </div>
                </div>
              </div>
            </div>
          )}

          {!qibla && (
            <div className={s.qiblaPlaceholder}>
              Set a property boundary to calculate Qibla direction.
            </div>
          )}

          {/* Zone type palette */}
          <div className={s.zoneTypesTitle}>
            Zone Types
          </div>
          <div className={s.zoneTypeList}>
            {(Object.entries(ZONE_TYPE_LABELS) as [SpiritualZoneType, { label: string; icon: string; description: string }][]).map(
              ([type, config]) => (
                <div
                  key={type}
                  className={s.zoneTypeItem}
                  title={config.description}
                >
                  <span className={s.zoneTypeIcon}>{config.icon}</span>
                  <div>
                    <div className={s.zoneTypeLabel}>{config.label}</div>
                    <div className={s.zoneTypeDesc}>{config.description}</div>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className={s.phaseNotice}>
            Zone placement tools will be available in Phase 2. For now, reference the Qibla bearing
            when planning prayer spaces and contemplative areas.
          </div>
        </div>
      )}
    </div>
  );
}
