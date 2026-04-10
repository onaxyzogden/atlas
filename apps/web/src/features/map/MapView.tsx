/**
 * MapView — the map workspace extracted from ProjectPage.
 * Contains IconSidebar + MapCanvas + right panel + mobile bar.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { Structure } from '../../store/structureStore.js';
import type { SidebarView } from '../../components/IconSidebar.js';
import MapCanvas from './MapCanvas.js';
import { useCommentStore } from '../../store/commentStore.js';
import SlideUpPanel from '../../components/SlideUpPanel.js';
import ErrorBoundary from '../../components/ErrorBoundary.js';
import GPSTracker from '../mobile/GPSTracker.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { getDomainContext, type DomainKey } from './domainMapping.js';
import css from './MapView.module.css';

const DomainFloatingToolbar = lazy(() => import('./DomainFloatingToolbar.js'));
const CesiumTerrainViewer = lazy(() => import('./CesiumTerrainViewer.js'));

// Lazy-loaded panels
const MapLayersPanel = lazy(() => import('../../components/panels/MapLayersPanel.js'));
const SiteIntelligencePanel = lazy(() => import('../../components/panels/SiteIntelligencePanel.js'));
const DesignToolsPanel = lazy(() => import('../../components/panels/DesignToolsPanel.js'));
const HydrologyRightPanel = lazy(() => import('../../components/panels/HydrologyRightPanel.js'));
const AtlasAIPanel = lazy(() => import('../../components/panels/AtlasAIPanel.js'));
const TimelinePanel = lazy(() => import('../../components/panels/TimelinePanel.js'));
const PortalConfigPanel = lazy(() => import('../portal/PortalConfigPanel.js'));
const VisionPanel = lazy(() => import('../vision/VisionPanel.js'));
const DecisionSupportPanel = lazy(() => import('../decision/DecisionSupportPanel.js'));
const MoontrancePanel = lazy(() => import('../moontrance/MoontrancePanel.js'));
const VersionHistory = lazy(() => import('../project/VersionHistory.js'));
const CollaborationPanel = lazy(() => import('../collaboration/CollaborationPanel.js'));
const EconomicsPanel = lazy(() => import('../economics/EconomicsPanel.js'));
const ScenarioPanel = lazy(() => import('../scenarios/ScenarioPanel.js'));
const TemplatePanel = lazy(() => import('../templates/TemplatePanel.js'));
const ReportingPanel = lazy(() => import('../reporting/ReportingPanel.js'));
const FieldworkPanel = lazy(() => import('../fieldwork/FieldworkPanel.js'));
const LivestockPanel = lazy(() => import('../livestock/LivestockPanel.js'));


interface MapViewProps {
  project: LocalProject;
  zones: LandZone[];
  structures: Structure[];
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function MapView({ project, zones, structures, onEdit, onExport, onDelete }: MapViewProps) {
  const isMobile = useIsMobile();
  const updateProject = useProjectStore((s) => s.updateProject);

  const activeDashboardSection = useUIStore((s) => s.activeDashboardSection);
  const setLayerVisible = useMapStore((s) => s.setLayerVisible);
  const is3DTerrain = useMapStore((s) => s.is3DTerrain);

  const [activeView, setActiveView] = useState<SidebarView>(
    () => getDomainContext(useUIStore.getState().activeDashboardSection).panel,
  );
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);

  const [mapRef, setMapRef] = useState<maplibregl.Map | null>(null);
  const [drawRef, setDrawRef] = useState<MapboxDraw | null>(null);
  const [markerRef, setMarkerRef] = useState<maplibregl.Marker | null>(null);
  const [boundaryColor, setBoundaryColor] = useState('#7d6140');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const addComment = useCommentStore((s) => s.addComment);
  const authorName = useCommentStore((s) => s.authorName);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Resize map when container becomes visible (after tab switch from display:none)
  useEffect(() => {
    if (!mapRef || !layoutRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.resize();
    });
    observer.observe(layoutRef.current);
    return () => observer.disconnect();
  }, [mapRef]);

  // Sync panel + activate layers whenever the active dashboard section changes
  useEffect(() => {
    const ctx = getDomainContext(activeDashboardSection);
    setActiveView(ctx.panel);
    ctx.layers.forEach((layer) => setLayerVisible(layer, true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboardSection]);

  // Derive active domain for the floating toolbar
  const activeDomain = useMemo((): DomainKey => {
    return getDomainContext(activeDashboardSection).domain;
  }, [activeDashboardSection]);

  const handleCenterProperty = () => {
    if (!mapRef) return;
    const c = computeCenterFromBoundary(project?.parcelBoundaryGeojson);
    if (c) {
      mapRef.flyTo({ center: c, zoom: 15, duration: 1200 });
    } else if (markerRef) {
      const lngLat = markerRef.getLngLat();
      mapRef.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 15, duration: 1200 });
    }
  };

  const startBoundaryDraw = () => {
    if (!drawRef) return;
    setIsDrawingBoundary(true);
    drawRef.deleteAll();
    drawRef.changeMode('draw_polygon');

    const handleCreate = () => {
      const all = drawRef.getAll();
      const lastFeature = all.features[all.features.length - 1];
      if (lastFeature?.geometry.type === 'Polygon') {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: lastFeature.geometry }],
        };
        import('@turf/turf').then((turf) => {
          const areaM2 = turf.area(lastFeature as GeoJSON.Feature<GeoJSON.Polygon>);
          const hectares = Math.round((areaM2 / 10000) * 100) / 100;
          updateProject(project.id, { parcelBoundaryGeojson: geojson, hasParcelBoundary: true, acreage: hectares });
        }).catch(() => {
          updateProject(project.id, { parcelBoundaryGeojson: geojson, hasParcelBoundary: true });
        });
        drawRef.deleteAll();
      }
      setIsDrawingBoundary(false);
      mapRef?.off('draw.create', handleCreate);
    };
    mapRef?.on('draw.create', handleCreate);
  };

  const cancelBoundaryDraw = () => {
    drawRef?.deleteAll();
    drawRef?.changeMode('simple_select');
    setIsDrawingBoundary(false);
  };


  const center = computeCenterFromBoundary(project.parcelBoundaryGeojson);

  return (
    <div ref={layoutRef} className={css.layout}>
      {/* Map fills remaining space */}
      <div className={isMobile ? css.mapAreaMobile : css.mapArea}>
        {/* Floating project name card */}
        <div className={css.floatingProjectCard}>
          <div className={css.floatingProjectName}>{project.name}</div>
          <div className={css.floatingProjectSub}>OGDEN LAND DESIGN ATLAS</div>
        </div>

        {/* Boundary draw button */}
        <div className={css.floatingControls}>
          {isDrawingBoundary ? (
            <button onClick={cancelBoundaryDraw} className={css.btnCancelDraw}>Cancel Drawing</button>
          ) : (
            <button onClick={startBoundaryDraw} disabled={!drawRef} className={css.btnDrawBoundary}>
              {project.hasParcelBoundary ? 'Redraw Boundary' : 'Draw Boundary'}
            </button>
          )}
          <span className={css.headerStats}>
            {zones.length} zones &middot; {structures.length} structures
          </span>
        </div>

        <ErrorBoundary>
          <MapCanvas
            projectId={project.id}
            initialCenter={center ?? [-79.8, 43.5]}
            initialZoom={center ? 14 : 12}
            boundaryGeojson={project.parcelBoundaryGeojson}
            boundaryColor={boundaryColor}
            address={project.address}
            onMapReady={(map, draw) => { setMapRef(map); setDrawRef(draw); }}
            onMarkerCreated={(m) => setMarkerRef(m)}
          />
        </ErrorBoundary>

        {/* Cesium 3D terrain overlay — renders on top of MapLibre when active */}
        {is3DTerrain && (
          <div className={css.cesiumOverlay}>
            <Suspense fallback={<div className={css.cesiumLoading}>Loading 3D terrain...</div>}>
              <CesiumTerrainViewer
                initialCenter={mapRef ? [mapRef.getCenter().lng, mapRef.getCenter().lat] as [number, number] : (center ?? [-79.8, 43.5]) as [number, number]}
                initialZoom={mapRef?.getZoom() ?? 14}
                onCameraSync={(syncCenter, syncZoom) => {
                  mapRef?.jumpTo({ center: syncCenter, zoom: syncZoom });
                }}
              />
            </Suspense>
          </div>
        )}

        {!isMobile && (
          <Suspense fallback={null}>
            <DomainFloatingToolbar
              domain={activeDomain}
              map={mapRef}
              draw={drawRef}
              isMapReady={!!mapRef}
              onExport={onExport}
            />
          </Suspense>
        )}
      </div>

      {/* Right panel content */}
      {(() => {
        if (!activeView) return null;

        const panelContent = (
          <ErrorBoundary name="panel">
            <Suspense fallback={<PanelLoader />}>
              {activeView === 'layers' && (
                <MapLayersPanel project={project} map={mapRef} marker={markerRef} onCenterProperty={handleCenterProperty} boundaryColor={boundaryColor} onBoundaryColorChange={setBoundaryColor} />
              )}
              {activeView === 'intelligence' && <SiteIntelligencePanel project={project} />}
              {activeView === 'design' && <DesignToolsPanel projectId={project.id} draw={drawRef} map={mapRef} />}
              {activeView === 'hydrology' && <HydrologyRightPanel project={project} />}
              {activeView === 'ai' && <AtlasAIPanel project={project} />}
              {activeView === 'economic' && <EconomicsPanel project={project} />}
              {activeView === 'regulatory' && <DecisionSupportPanel project={project} />}
              {activeView === 'timeline' && <TimelinePanel project={project} />}
              {activeView === 'history' && (
                <div className={css.historyWrapper}>
                  <h2 className={css.historyTitle}>Version History</h2>
                  <VersionHistory projectId={project.id} />
                </div>
              )}
              {activeView === 'collaboration' && (
                <CollaborationPanel
                  project={project}
                  map={mapRef}
                  isAddingComment={isAddingComment}
                  onAddCommentMode={() => {
                    setIsAddingComment((v) => {
                      if (!v && mapRef) {
                        mapRef.getCanvas().style.cursor = 'crosshair';
                        const handler = (e: maplibregl.MapMouseEvent) => {
                          const comment = {
                            id: crypto.randomUUID(),
                            projectId: project.id,
                            author: authorName,
                            text: prompt('Enter comment:') ?? '',
                            location: [e.lngLat.lng, e.lngLat.lat] as [number, number],
                            featureId: null,
                            featureType: null,
                            resolved: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          if (comment.text) addComment(comment);
                          mapRef.getCanvas().style.cursor = '';
                          mapRef.off('click', handler);
                          setIsAddingComment(false);
                        };
                        mapRef.once('click', handler);
                      }
                      return !v;
                    });
                  }}
                />
              )}
              {activeView === 'vision' && <VisionPanel project={project} />}
              {activeView === 'scenarios' && <ScenarioPanel project={project} />}
              {activeView === 'moontrance' && <MoontrancePanel project={project} />}
              {activeView === 'portal' && <PortalConfigPanel project={project} />}
              {activeView === 'templates' && <TemplatePanel project={project} />}
              {activeView === 'reporting' && <ReportingPanel project={project} onOpenExport={onExport} />}
              {activeView === 'settings' && (
                <SettingsPanel project={project} onEdit={onEdit} onExport={onExport} onDelete={onDelete} />
              )}
              {activeView === 'fieldnotes' && <FieldworkPanel project={project} map={mapRef} />}
              {activeView === 'livestock' && <LivestockPanel projectId={project.id} draw={drawRef} map={mapRef} />}
            </Suspense>
          </ErrorBoundary>
        );

        if (isMobile) {
          return (
            <SlideUpPanel isOpen onClose={() => setActiveView(null)} title={activeView}>
              {panelContent}
            </SlideUpPanel>
          );
        }

        return <div className={css.rightPanel}>{panelContent}</div>;
      })()}

      {/* Mobile bottom bar */}
      {isMobile && (
        <div className={css.mobileBar}>
          {([
            { id: 'layers' as SidebarView, label: 'Layers', icon: '\u{1F5FA}' },
            { id: 'intelligence' as SidebarView, label: 'Intel', icon: '\u{1F50D}' },
            { id: 'design' as SidebarView, label: 'Design', icon: '\u270F' },
            { id: 'fieldnotes' as SidebarView, label: 'Notes', icon: '\u{1F4DD}' },
            { id: 'settings' as SidebarView, label: 'More', icon: '\u2699' },
          ]).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(activeView === item.id ? null : item.id)}
              className={activeView === item.id ? css.mobileBarBtnActive : css.mobileBarBtn}
            >
              <span className={css.mobileBarIcon} aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <GPSTracker map={mapRef} isMapReady={!!mapRef} />
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  project,
  onEdit,
  onExport,
  onDelete,
}: {
  project: { name: string };
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={css.settingsPanel}>
      <h2 className={css.settingsTitle}>Project Settings</h2>
      <div className={css.settingsList}>
        <button onClick={onEdit} className={css.settingsBtn}>Edit Project Details</button>
        <button onClick={onExport} className={css.settingsBtn}>Export / Print Summary</button>
        <button onClick={onDelete} className={css.settingsBtnDanger}>Delete Project</button>
      </div>
    </div>
  );
}

function computeCenterFromBoundary(geojson: unknown): [number, number] | null {
  if (!geojson || typeof geojson !== 'object') return null;
  try {
    const fc = geojson as GeoJSON.FeatureCollection;
    if (!fc.features?.length) return null;
    let sumLng = 0, sumLat = 0, count = 0;
    function visitCoords(coords: unknown): void {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        sumLng += coords[0] as number;
        sumLat += coords[1] as number;
        count++;
        return;
      }
      for (const item of coords) visitCoords(item);
    }
    for (const f of fc.features) visitCoords((f.geometry as { coordinates: unknown }).coordinates);
    if (count === 0) return null;
    return [sumLng / count, sumLat / count];
  } catch { return null; }
}
