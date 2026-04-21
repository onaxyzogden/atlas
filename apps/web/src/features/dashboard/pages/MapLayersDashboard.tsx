/**
 * MapLayersDashboard — summary page for map data layers.
 *
 * The authoritative layer controls (visibility toggles, styling, boundary
 * drawing) live in the MapView right rail's `MapLayersPanel`, which is
 * map-coupled. This dashboard page gives the user a high-level view of
 * currently-active layers and a CTA to switch to the map to manage them.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import { useMapStore } from '../../../store/mapStore.js';
import type { LayerType } from '@ogden/shared';
import css from './MapLayersDashboard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LAYER_CATALOG: { group: string; layers: { id: LayerType; label: string; desc: string }[] }[] = [
  {
    group: 'Terrain',
    layers: [
      { id: 'elevation', label: 'Elevation', desc: 'Digital elevation model, contour lines, hillshade' },
    ],
  },
  {
    group: 'Hydrology',
    layers: [
      { id: 'watershed', label: 'Watersheds', desc: 'Sub-basin boundaries, flow direction' },
      { id: 'wetlands_flood', label: 'Wetlands & Flood', desc: 'NWI wetlands, FEMA floodplains' },
    ],
  },
  {
    group: 'Ecology',
    layers: [
      { id: 'soils', label: 'Soils', desc: 'SSURGO soil series, drainage, organic matter' },
      { id: 'land_cover', label: 'Land Cover', desc: 'NLCD classification, tree canopy' },
    ],
  },
  {
    group: 'Regulatory',
    layers: [
      { id: 'zoning', label: 'Zoning', desc: 'Municipal zoning, setbacks, overlays' },
    ],
  },
];

export default function MapLayersDashboard({ project, onSwitchToMap }: Props) {
  const visibleLayers = useMapStore((s) => s.visibleLayers);
  const activeCount = visibleLayers.size;
  const totalCount = LAYER_CATALOG.reduce((sum, g) => sum + g.layers.length, 0);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Map Layers</h1>
      <p className={css.desc}>
        Geospatial data layers available for <strong>{project.name}</strong>. Toggle
        visibility, styling, and boundary tools from the Map View right rail.
      </p>

      <div className={css.summaryRow}>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>Active</span>
          <span className={css.summaryValue}>{activeCount}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>Catalog</span>
          <span className={css.summaryValue}>{totalCount}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>Groups</span>
          <span className={css.summaryValue}>{LAYER_CATALOG.length}</span>
        </div>
      </div>

      {LAYER_CATALOG.map((g) => (
        <section key={g.group} className={css.section}>
          <h2 className={css.sectionLabel}>{g.group}</h2>
          <div className={css.layerGrid}>
            {g.layers.map((l) => {
              const isActive = visibleLayers.has(l.id);
              return (
                <div key={l.id} className={css.layerCard}>
                  <div className={css.layerHeader}>
                    <span className={css.layerName}>{l.label}</span>
                    <span className={`${css.layerStatus} ${isActive ? css.layerStatusActive : ''}`}>
                      {isActive ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className={css.layerDesc}>{l.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        Manage Layers in Map View →
      </button>
    </div>
  );
}
