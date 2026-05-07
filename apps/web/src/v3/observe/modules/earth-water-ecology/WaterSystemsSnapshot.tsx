import TerrainSnapshot from '../topography/TerrainSnapshot.js';
import type { TerrainOverlay } from '../topography/TerrainSnapshot.js';
import type { Earthwork, StorageInfra, Watercourse } from '../../../../store/waterSystemsStore.js';

interface Props {
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
  width?: number;
  height?: number;
  overlays?: TerrainOverlay[];
  className?: string;
  earthworks?: Earthwork[];
  storageInfra?: StorageInfra[];
  watercourses?: Watercourse[];
}

export default function WaterSystemsSnapshot({
  boundary,
  caption,
  width = 320,
  height = 200,
  overlays = ['contours'],
  className,
  earthworks = [],
  storageInfra = [],
  watercourses = [],
}: Props) {
  const hasWater = earthworks.length > 0 || storageInfra.length > 0 || watercourses.length > 0;
  const cls = [
    'water-systems-snapshot',
    hasWater ? 'has-water-features' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <TerrainSnapshot
        boundary={boundary}
        caption={caption}
        width={width}
        height={height}
        overlays={overlays}
      />
      {hasWater && (
        <div className="water-feature-counts">
          {earthworks.length > 0 && (
            <span className="wf-badge wf-earthwork">{earthworks.length} earthwork{earthworks.length !== 1 ? 's' : ''}</span>
          )}
          {watercourses.length > 0 && (
            <span className="wf-badge wf-watercourse">{watercourses.length} watercourse{watercourses.length !== 1 ? 's' : ''}</span>
          )}
          {storageInfra.length > 0 && (
            <span className="wf-badge wf-storage">{storageInfra.length} storage</span>
          )}
        </div>
      )}
    </div>
  );
}
