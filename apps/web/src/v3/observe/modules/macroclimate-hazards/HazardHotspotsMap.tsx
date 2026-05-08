import { Droplet, Flame, Snowflake, TriangleAlert, Wind, type LucideIcon } from 'lucide-react';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import type { Hazard, HazardKind } from '../../../../store/hazardsStore.js';

const KIND_ICON: Record<HazardKind, LucideIcon> = {
  frost: Snowflake,
  storm: Wind,
  drought: Flame,
  flood: Droplet,
  fire: Flame,
  wind: Wind,
  erosion: TriangleAlert,
  other: TriangleAlert,
};

interface Props {
  boundary?: GeoJSON.Polygon;
  caption?: string;
  hazards: Hazard[];
  width?: number;
  height?: number;
  className?: string;
}

export default function HazardHotspotsMap({
  boundary,
  caption,
  hazards,
  width = 320,
  height = 240,
  className,
}: Props) {
  const located = hazards.filter((h) => h.lat != null && h.lng != null);

  return (
    <div className={`hazard-hotspots-map ${className ?? ''}`} style={{ width, height }}>
      <ParcelSatelliteSnapshot
        boundary={boundary}
        caption={caption}
        width={width}
        height={height}
      />
      {located.length > 0 ? (
        <div className="hotspot-overlay">
          {located.map((h) => {
            const Icon = KIND_ICON[h.kind];
            return (
              <span className={`hotspot-marker ${h.risk}`} key={h.id} title={h.label}>
                <Icon aria-hidden="true" />
              </span>
            );
          })}
        </div>
      ) : (
        <span className="hotspot-empty">No geolocated hazards.</span>
      )}
    </div>
  );
}
