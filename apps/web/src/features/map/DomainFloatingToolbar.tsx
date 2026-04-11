/**
 * DomainFloatingToolbar — bottom-center floating toolbar in map view.
 * Shows domain-relevant tools based on the active dashboard section context.
 * Desktop only; returns null on mobile or when domain is 'default'.
 */

import type maplibregl from 'maplibre-gl';
import { useState } from 'react';
import type { DomainKey } from './domainMapping.js';
import { useMapStore } from '../../store/mapStore.js';
import type { LayerType } from '@ogden/shared';
import css from './DomainFloatingToolbar.module.css';

interface ToolDef {
  id: string;
  label: string;
  icon: string;
  type: 'toggle' | 'action';
  layerKey?: LayerType;
  onAction?: (ctx: ToolContext) => void;
}

interface ToolContext {
  map: maplibregl.Map | null;
  draw: MapboxDraw | null;
  onExport: () => void;
}

interface DomainFloatingToolbarProps {
  domain: DomainKey;
  map: maplibregl.Map | null;
  draw: MapboxDraw | null;
  isMapReady: boolean;
  canEdit?: boolean;
  onExport: () => void;
}

const DOMAIN_LABELS: Record<DomainKey, string> = {
  hydrology:    'Hydrology Tools',
  terrain:      'Terrain Tools',
  ecology:      'Ecology Tools',
  livestock:    'Livestock Tools',
  forestry:     'Forestry Tools',
  cartographic: 'Cartographic Tools',
  default:      '',
};

const DOMAIN_TOOLS: Record<Exclude<DomainKey, 'default'>, ToolDef[]> = {
  hydrology: [
    {
      id: 'flood-risk',
      label: 'Flood Risk',
      icon: '🌊',
      type: 'toggle',
      layerKey: 'wetlands_flood',
    },
    {
      id: 'watershed',
      label: 'Watershed',
      icon: '💧',
      type: 'toggle',
      layerKey: 'watershed',
    },
    {
      id: 'draw-swale',
      label: 'Draw Swale',
      icon: '〰',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_line_string');
      },
    },
    {
      id: 'draw-pond',
      label: 'Draw Pond',
      icon: '◎',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
  ],

  terrain: [
    {
      id: 'elevation',
      label: 'Elevation',
      icon: '⛰',
      type: 'toggle',
      layerKey: 'elevation',
    },
    {
      id: 'contours',
      label: 'Contours',
      icon: '〰',
      type: 'action',
      onAction: ({ map }) => {
        if (!map) return;
        const vis = map.getLayoutProperty('ogden-contours', 'visibility');
        const next = vis === 'visible' ? 'none' : 'visible';
        if (map.getLayer('ogden-contours')) {
          map.setLayoutProperty('ogden-contours', 'visibility', next);
          map.setLayoutProperty('ogden-contour-labels', 'visibility', next);
        }
      },
    },
    {
      id: 'hillshade',
      label: 'Hillshade',
      icon: '🌄',
      type: 'action',
      onAction: ({ map }) => {
        if (!map) return;
        const vis = map.getLayoutProperty('ogden-hillshade', 'visibility');
        const next = vis === 'visible' ? 'none' : 'visible';
        if (map.getLayer('ogden-hillshade')) {
          map.setLayoutProperty('ogden-hillshade', 'visibility', next);
        }
      },
    },
    {
      id: '3d-terrain',
      label: '3D Terrain',
      icon: '🏔',
      type: 'action',
      onAction: () => {
        const { is3DTerrain, set3DTerrain } = useMapStore.getState();
        set3DTerrain(!is3DTerrain);
      },
    },
    {
      id: 'grade-area',
      label: 'Grade Area',
      icon: '▱',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
    {
      id: 'mark-feature',
      label: 'Mark Feature',
      icon: '📍',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_point');
      },
    },
  ],

  ecology: [
    {
      id: 'habitat',
      label: 'Habitat',
      icon: '🌿',
      type: 'toggle',
      layerKey: 'land_cover',
    },
    {
      id: 'wetlands',
      label: 'Wetlands',
      icon: '🌾',
      type: 'toggle',
      layerKey: 'wetlands_flood',
    },
    {
      id: 'soils',
      label: 'Soils',
      icon: '🟤',
      type: 'toggle',
      layerKey: 'soils',
    },
    {
      id: 'draw-zone',
      label: 'Draw Zone',
      icon: '⬡',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
    {
      id: 'corridor',
      label: 'Corridor',
      icon: '⇢',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_line_string');
      },
    },
  ],

  livestock: [
    {
      id: 'draw-paddock',
      label: 'Paddock',
      icon: '⬡',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
    {
      id: 'fence-line',
      label: 'Fence Line',
      icon: '⸻',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_line_string');
      },
    },
    {
      id: 'grazing-pressure',
      label: 'Grazing',
      icon: '🐄',
      type: 'toggle',
      layerKey: 'land_cover',
    },
    {
      id: 'water-point',
      label: 'Water Point',
      icon: '💧',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_point');
      },
    },
  ],

  forestry: [
    {
      id: 'tree-planting',
      label: 'Plant Tree',
      icon: '🌱',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_point');
      },
    },
    {
      id: 'carbon-overlay',
      label: 'Carbon',
      icon: '♻',
      type: 'toggle',
      layerKey: 'soils',
    },
    {
      id: 'crown-spread',
      label: 'Crown Area',
      icon: '🌳',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
    {
      id: 'forest-zone',
      label: 'Forest Zone',
      icon: '🌲',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
  ],

  cartographic: [
    {
      id: 'draw-zone',
      label: 'Draw Zone',
      icon: '⬡',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_polygon');
      },
    },
    {
      id: 'add-pin',
      label: 'Add Pin',
      icon: '📍',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_point');
      },
    },
    {
      id: 'measure',
      label: 'Measure',
      icon: '📏',
      type: 'action',
      onAction: ({ draw }) => {
        draw?.changeMode('draw_line_string');
      },
    },
    {
      id: 'all-layers',
      label: 'All Layers',
      icon: '🗺',
      type: 'toggle',
      layerKey: 'land_cover',
    },
    {
      id: 'export-map',
      label: 'Export',
      icon: '⬇',
      type: 'action',
      onAction: ({ onExport }) => {
        onExport();
      },
    },
  ],
};

export default function DomainFloatingToolbar({
  domain,
  map,
  draw,
  isMapReady,
  canEdit = true,
  onExport,
}: DomainFloatingToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { visibleLayers, setLayerVisible, is3DTerrain } = useMapStore();

  if (domain === 'default') return null;

  const tools = DOMAIN_TOOLS[domain as Exclude<DomainKey, 'default'>] ?? [];
  const ctx: ToolContext = { map, draw, onExport };

  return (
    <div className={css.toolbar}>
      <button
        className={css.header}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
      >
        <span className={css.domainLabel}>{DOMAIN_LABELS[domain]}</span>
        <span className={css.chevron}>{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className={css.toolRow}>
          {tools.map((tool) => {
            const isActive = tool.id === '3d-terrain'
              ? is3DTerrain
              : tool.type === 'toggle' && tool.layerKey
                ? visibleLayers.has(tool.layerKey)
                : false;

            const isActionTool = tool.type === 'action';
            const isDisabledByRole = isActionTool && !canEdit;

            return (
              <button
                key={tool.id}
                className={isActive ? css.toolBtnActive : css.toolBtn}
                title={isDisabledByRole ? 'Editing requires Designer or Owner role' : tool.label}
                disabled={isDisabledByRole}
                style={isDisabledByRole ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                onClick={() => {
                  if (isDisabledByRole) return;
                  if (tool.type === 'toggle' && tool.layerKey) {
                    setLayerVisible(tool.layerKey, !visibleLayers.has(tool.layerKey));
                  } else {
                    tool.onAction?.(ctx);
                  }
                }}
              >
                <span className={css.toolIcon} aria-hidden="true">{tool.icon}</span>
                <span className={css.toolLabel}>{tool.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
