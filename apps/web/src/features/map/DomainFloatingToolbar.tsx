/**
 * DomainFloatingToolbar — bottom-center floating toolbar in map view.
 * Shows domain-relevant tools based on the active dashboard section context.
 * Desktop only; returns null on mobile or when domain is 'default' / 'forestry'
 * (forestry domain has no wired tools yet — see plan file).
 *
 * Design rules:
 *   - Every tool either toggles a real map layer or fires a concrete
 *     downstream intent. No ornamental buttons.
 *   - Action tools (draw starts, intent fires) are disabled when the map
 *     isn't ready or the user lacks edit permissions.
 *   - Icons come from lucide-react for consistency with the rest of the app.
 */

import type maplibregl from 'maplibre-gl';
import type React from 'react';
import { useState } from 'react';
import {
  Waves,
  Droplets,
  Mountain,
  Spline,
  Sun,
  Box,
  Trees,
  Sprout,
  Layers,
  Hexagon,
  LeafyGreen,
  RotateCw,
  Download,
  Ruler,
  Zap,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { DomainKey } from './domainMapping.js';
import { useMapStore } from '../../store/mapStore.js';
import type { LayerType } from '@ogden/shared';
import css from './DomainFloatingToolbar.module.css';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface ToolDef {
  id: string;
  label: string;
  icon: LucideIcon;
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

// Tint color per domain. Gives the floating toolbar a visible anchor that
// matches the sidebar selection, so users reading the map never lose track
// of which domain lens they are in (UX scholar critique #3: "the toolbar
// feels generic — nothing about it changes when the user switches domains").
const DOMAIN_TINTS: Record<DomainKey, string> = {
  hydrology:          '#4A90D9', // water blue
  terrain:            '#c4a265', // amber (earth)
  ecology:            '#5A7A3A', // deep green
  paddockDesign:      '#8A7B4A', // livestock tan
  herdRotation:       '#8A7B4A',
  grazingAnalysis:    '#8A7B4A',
  livestockInventory: '#8A7B4A',
  plantingTool:       '#4A7C3F', // forest green
  forestHub:          '#4A7C3F',
  carbonDiagnostic:   '#4A7C3F',
  nurseryLedger:      '#4A7C3F',
  cartographic:       '#7a8a9a', // neutral slate
  energy:             '#E8A94A', // solar gold
  infrastructure:     '#6B6B6B', // utility gray
  default:            '#c4a265',
};

const DOMAIN_LABELS: Record<DomainKey, string> = {
  hydrology:          'Hydrology Tools',
  terrain:            'Terrain Tools',
  ecology:            'Ecology Tools',
  paddockDesign:      'Paddock Design Tools',
  herdRotation:       'Herd Rotation Tools',
  grazingAnalysis:    'Grazing Analysis Tools',
  livestockInventory: 'Livestock Inventory Tools',
  plantingTool:       'Planting Tools',
  forestHub:          'Forest Hub Tools',
  carbonDiagnostic:   'Carbon Tools',
  nurseryLedger:      'Nursery Tools',
  cartographic:       'Map Tools',
  energy:             'Energy Tools',
  infrastructure:     'Infrastructure Tools',
  default:            '',
};

// Domains with no wired tools render nothing (cleaner than an all-dead panel).
const HIDDEN_DOMAINS: ReadonlySet<DomainKey> = new Set<DomainKey>(['default']);

// Paddock tool — shared across Paddock Design / Herd Rotation / Livestock
// Inventory because they all benefit from drawing new paddocks in-context.
const PADDOCK_TOOL: ToolDef = {
  id: 'draw-paddock',
  label: 'Paddock',
  icon: Hexagon,
  type: 'action',
  onAction: ({ draw, map }) => {
    if (!draw || !map) return;
    draw.changeMode('draw_polygon');
    map.fire('ogden:paddock:start' as unknown as keyof maplibregl.MapEventType);
  },
};

const PASTURE_TOOL: ToolDef = {
  id: 'pasture',
  label: 'Pasture',
  icon: LeafyGreen,
  type: 'toggle',
  layerKey: 'land_cover',
};

const SOILS_TOOL: ToolDef = {
  id: 'soils',
  label: 'Soils',
  icon: Layers,
  type: 'toggle',
  layerKey: 'soils',
};

const LAND_COVER_TOOL: ToolDef = {
  id: 'land-cover',
  label: 'Land Cover',
  icon: Trees,
  type: 'toggle',
  layerKey: 'land_cover',
};

const ELEVATION_TOOL: ToolDef = {
  id: 'elevation-context',
  label: 'Elevation',
  icon: Mountain,
  type: 'toggle',
  layerKey: 'elevation',
};

const MEASURE_TOOL: ToolDef = {
  id: 'measure',
  label: 'Measure',
  icon: Ruler,
  type: 'action',
  onAction: ({ draw }) => {
    draw?.changeMode('draw_line_string');
  },
};

const DOMAIN_TOOLS: Record<Exclude<DomainKey, 'default'>, ToolDef[]> = {
  hydrology: [
    { id: 'flood-risk', label: 'Flood Risk', icon: Waves,    type: 'toggle', layerKey: 'wetlands_flood' },
    { id: 'watershed',  label: 'Watershed',  icon: Droplets, type: 'toggle', layerKey: 'watershed' },
  ],

  terrain: [
    { id: 'elevation', label: 'Elevation', icon: Mountain, type: 'toggle', layerKey: 'elevation' },
    {
      id: 'contours',
      label: 'Contours',
      icon: Spline,
      type: 'action',
      onAction: ({ map }) => {
        if (!map) return;
        if (!map.getLayer('ogden-contours')) return;
        const vis = map.getLayoutProperty('ogden-contours', 'visibility');
        const next = vis === 'visible' ? 'none' : 'visible';
        map.setLayoutProperty('ogden-contours', 'visibility', next);
        if (map.getLayer('ogden-contour-labels')) {
          map.setLayoutProperty('ogden-contour-labels', 'visibility', next);
        }
      },
    },
    {
      id: 'hillshade',
      label: 'Hillshade',
      icon: Sun,
      type: 'action',
      onAction: ({ map }) => {
        if (!map) return;
        if (!map.getLayer('ogden-hillshade')) return;
        const vis = map.getLayoutProperty('ogden-hillshade', 'visibility');
        map.setLayoutProperty('ogden-hillshade', 'visibility', vis === 'visible' ? 'none' : 'visible');
      },
    },
    {
      id: '3d-terrain',
      label: '3D Terrain',
      icon: Box,
      type: 'action',
      onAction: () => {
        const { is3DTerrain, set3DTerrain } = useMapStore.getState();
        set3DTerrain(!is3DTerrain);
      },
    },
  ],

  ecology: [
    { id: 'land-cover', label: 'Land Cover', icon: Trees,  type: 'toggle', layerKey: 'land_cover' },
    { id: 'wetlands',   label: 'Wetlands',   icon: Sprout, type: 'toggle', layerKey: 'wetlands_flood' },
    { id: 'soils',      label: 'Soils',      icon: Layers, type: 'toggle', layerKey: 'soils' },
  ],

  // Paddock Design — drawing & layout. Paddock draw plus context layers
  // (Pasture + Soils) that inform where to place fence lines.
  paddockDesign: [
    PADDOCK_TOOL,
    PASTURE_TOOL,
    SOILS_TOOL,
    MEASURE_TOOL,
  ],

  // Herd Rotation — movement & schedule. Focus on rotating stock through
  // existing paddocks rather than drawing new ones.
  herdRotation: [
    PASTURE_TOOL,
    {
      id: 'initiate-rotation',
      label: 'Rotate Herd',
      icon: RotateCw,
      type: 'action',
      onAction: ({ map }) => {
        // Consumed by PaddockListFloating's ogden:herd:rotate listener.
        map?.fire('ogden:herd:rotate' as unknown as keyof maplibregl.MapEventType);
      },
    },
  ],

  // Grazing Analysis — observational overlays. Read-only layers that surface
  // pasture condition, soil context, and moisture. No drawing tools.
  grazingAnalysis: [
    PASTURE_TOOL,
    SOILS_TOOL,
    {
      id: 'wetlands',
      label: 'Moisture',
      icon: Droplets,
      type: 'toggle',
      layerKey: 'wetlands_flood',
    },
  ],

  // Livestock Inventory — headcount & records. Paddock draw for adding a
  // holding area inline while logging, plus Pasture context. Kept tight —
  // inventory work is mostly tabular, not spatial.
  livestockInventory: [
    PADDOCK_TOOL,
    PASTURE_TOOL,
  ],

  // Planting Tool — site planning for new plantings. Slope, soils, and land
  // cover inform placement; Measure sketches row lengths and spacings.
  plantingTool: [
    SOILS_TOOL,
    LAND_COVER_TOOL,
    ELEVATION_TOOL,
    MEASURE_TOOL,
  ],

  // Forest Hub — existing canopy management. Elevation + watershed context
  // frames forest hydrology alongside the land-cover read.
  forestHub: [
    LAND_COVER_TOOL,
    ELEVATION_TOOL,
    {
      id: 'forest-watershed',
      label: 'Watershed',
      icon: Droplets,
      type: 'toggle',
      layerKey: 'watershed',
    },
  ],

  // Carbon Diagnostic — soil-carbon and biomass lens. Adds wetlands because
  // peat/wetland soils dominate above-ground carbon in many site carbon pools.
  carbonDiagnostic: [
    SOILS_TOOL,
    LAND_COVER_TOOL,
    {
      id: 'carbon-wetlands',
      label: 'Wetlands',
      icon: Waves,
      type: 'toggle',
      layerKey: 'wetlands_flood',
    },
  ],

  // Nursery Ledger — propagation inventory. Mostly tabular; keeps only the
  // two context layers that actually inform where a nursery can sit.
  nurseryLedger: [
    LAND_COVER_TOOL,
    SOILS_TOOL,
  ],

  cartographic: [
    {
      id: 'export-map',
      label: 'Export',
      icon: Download,
      type: 'action',
      onAction: ({ onExport }) => {
        onExport();
      },
    },
  ],

  // Energy — solar / battery / generator siting. Elevation + Hillshade frame
  // sun exposure and panel-orientation decisions; Land Cover flags canopy
  // shading; Measure sketches cable/conduit runs.
  energy: [
    ELEVATION_TOOL,
    {
      id: 'energy-hillshade',
      label: 'Sun Exposure',
      icon: Sun,
      type: 'action',
      onAction: ({ map }) => {
        if (!map) return;
        if (!map.getLayer('ogden-hillshade')) return;
        const vis = map.getLayoutProperty('ogden-hillshade', 'visibility');
        map.setLayoutProperty('ogden-hillshade', 'visibility', vis === 'visible' ? 'none' : 'visible');
      },
    },
    { id: 'energy-land-cover', label: 'Canopy', icon: Trees, type: 'toggle', layerKey: 'land_cover' },
    MEASURE_TOOL,
    {
      id: 'energy-legend',
      label: 'Energy',
      icon: Zap,
      type: 'action',
      onAction: ({ map }) => {
        // Breadcrumb — no wired panel to open yet; signal to any future listener.
        map?.fire('ogden:energy:focus' as unknown as keyof maplibregl.MapEventType);
      },
    },
  ],

  // Infrastructure — water / septic / tank siting. Soils drives septic
  // suitability; Watershed + Flood/Wetlands enforce separation distances;
  // Measure checks well-septic and boundary setbacks.
  infrastructure: [
    SOILS_TOOL,
    { id: 'infra-watershed', label: 'Watershed', icon: Droplets, type: 'toggle', layerKey: 'watershed' },
    { id: 'infra-flood',     label: 'Flood/Wetlands', icon: Waves, type: 'toggle', layerKey: 'wetlands_flood' },
    MEASURE_TOOL,
    {
      id: 'infra-legend',
      label: 'Utilities',
      icon: Wrench,
      type: 'action',
      onAction: ({ map }) => {
        map?.fire('ogden:infrastructure:focus' as unknown as keyof maplibregl.MapEventType);
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

  if (HIDDEN_DOMAINS.has(domain)) return null;

  const tools = DOMAIN_TOOLS[domain as Exclude<DomainKey, 'default'>] ?? [];
  const ctx: ToolContext = { map, draw, onExport };
  const tint = DOMAIN_TINTS[domain];

  return (
    <div
      className={css.toolbar}
      style={{ '--domain-tint': tint } as React.CSSProperties}
    >
      <button
        className={css.header}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
      >
        <span className={css.domainLabel}>{DOMAIN_LABELS[domain]}</span>
        <span className={css.chevron}>{collapsed ? '\u25B2' : '\u25BC'}</span>
      </button>

      {!collapsed && (
        <div className={css.toolRow}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = tool.id === '3d-terrain'
              ? is3DTerrain
              : tool.type === 'toggle' && tool.layerKey
                ? visibleLayers.has(tool.layerKey)
                : false;

            const isActionTool = tool.type === 'action';
            const isDisabledByRole = isActionTool && !canEdit;
            const isDisabledByMap  = isActionTool && !isMapReady;
            const isDisabled       = isDisabledByRole || isDisabledByMap;

            const titleText = isDisabledByRole
              ? 'Editing requires Designer or Owner role'
              : isDisabledByMap
                ? 'Map is still loading'
                : tool.label;

            return (
              <DelayedTooltip key={tool.id} label={titleText}>
              <button
                className={isActive ? css.toolBtnActive : css.toolBtn}
                disabled={isDisabled}
                style={isDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                onClick={() => {
                  if (isDisabled) return;
                  if (tool.type === 'toggle' && tool.layerKey) {
                    setLayerVisible(tool.layerKey, !visibleLayers.has(tool.layerKey));
                  } else {
                    tool.onAction?.(ctx);
                  }
                }}
              >
                <span className={css.toolIcon} aria-hidden="true">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className={css.toolLabel}>{tool.label}</span>
              </button>
              </DelayedTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
