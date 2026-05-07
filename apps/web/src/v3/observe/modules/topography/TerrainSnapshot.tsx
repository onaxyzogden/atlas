import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import type {
  Contour,
  DrainageLine,
  HighPoint,
} from '../../../../store/topographyStore.js';

export type TerrainOverlay =
  | 'slope'
  | 'contours'
  | 'aspect'
  | 'elevation'
  | 'hillshade';

interface Props {
  boundary?: GeoJSON.Polygon;
  caption?: string;
  width?: number;
  height?: number;
  /** Active overlay flags. Currently used to drive class names — when raster
   *  layers land they will read these too. */
  overlays?: TerrainOverlay[];
  contours?: Contour[];
  highPoints?: HighPoint[];
  drainageLines?: DrainageLine[];
  className?: string;
}

export default function TerrainSnapshot({
  boundary,
  caption,
  width = 320,
  height = 240,
  overlays = [],
  contours = [],
  highPoints = [],
  drainageLines = [],
  className,
}: Props) {
  const overlayClasses = overlays.map((o) => `overlay-${o}`).join(' ');
  const annotationCount =
    contours.length + highPoints.length + drainageLines.length;

  return (
    <div className={`terrain-snapshot ${overlayClasses} ${className ?? ''}`}>
      <ParcelSatelliteSnapshot
        boundary={boundary}
        caption={caption}
        width={width}
        height={height}
      />
      {annotationCount === 0 ? null : (
        <p className="terrain-snapshot-counts">
          {contours.length > 0 ? <span>{contours.length} contour</span> : null}
          {highPoints.length > 0 ? <span>{highPoints.length} high point</span> : null}
          {drainageLines.length > 0 ? <span>{drainageLines.length} drainage</span> : null}
        </p>
      )}
    </div>
  );
}
