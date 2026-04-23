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
import { GaezOverlay, GaezMapControls } from './GaezOverlay.js';
import { SoilOverlay, SoilMapControls } from './SoilOverlay.js';
import { useCommentStore, type Comment } from '../../store/commentStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useProjectRole } from '../../hooks/useProjectRole.js';
import RoleBadge from '../../components/RoleBadge.js';
import SlideUpPanel from '../../components/SlideUpPanel.js';
import ErrorBoundary from '../../components/ErrorBoundary.js';
import TypingIndicator from '../../components/TypingIndicator.js';
import { wsService } from '../../lib/wsService.js';
import GPSTracker from '../mobile/GPSTracker.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { RailPanelShell } from '../../components/ui/RailPanelShell.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { getDomainContext, type DomainKey } from './domainMapping.js';
import { map as mapTokens, group } from '../../lib/tokens.js';
import css from './MapView.module.css';
import './mapRailDashboard.css';

const DomainFloatingToolbar = lazy(() => import('./DomainFloatingToolbar.js'));
const CesiumTerrainViewer = lazy(() => import('./CesiumTerrainViewer.js'));
const ViewModeSwitcher = lazy(() => import('./ViewModeSwitcher.js'));
const CrossSectionTool = lazy(() => import('./CrossSectionTool.js'));
const ViewshedOverlay = lazy(() => import('./ViewshedOverlay.js'));
const ViewshedToggle = lazy(() => import('./ViewshedOverlay.js').then((m) => ({ default: m.ViewshedToggle })));

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
const RegulatoryPanel = lazy(() => import('../regulatory/RegulatoryPanel.js'));
const MoontrancePanel = lazy(() => import('../moontrance/MoontrancePanel.js'));
const SpiritualPanel = lazy(() => import('../spiritual/SpiritualPanel.js'));
const VersionHistory = lazy(() => import('../project/VersionHistory.js'));
const CollaborationPanel = lazy(() => import('../collaboration/CollaborationPanel.js'));
const EconomicsPanel = lazy(() => import('../economics/EconomicsPanel.js'));
const ScenarioPanel = lazy(() => import('../scenarios/ScenarioPanel.js'));
const TemplatePanel = lazy(() => import('../templates/TemplatePanel.js'));
const ReportingPanel = lazy(() => import('../reporting/ReportingPanel.js'));
const FieldworkPanel = lazy(() => import('../fieldwork/FieldworkPanel.js'));
const PaddockDesignDashboard = lazy(() => import('../dashboard/pages/PaddockDesignDashboard.js'));
const HerdRotationDashboard = lazy(() => import('../dashboard/pages/HerdRotationDashboard.js'));
const GrazingDashboard = lazy(() => import('../dashboard/pages/GrazingDashboard.js'));
const LivestockDashboard = lazy(() => import('../dashboard/pages/LivestockDashboard.js'));
const PaddockListFloating = lazy(() => import('../livestock/PaddockListFloating.js'));
// Dashboard-page-backed rail panels (parity with dashboard view)
const TerrainDashboard = lazy(() => import('../dashboard/pages/TerrainDashboard.js'));
const CartographicDashboard = lazy(() => import('../dashboard/pages/CartographicDashboard.js'));
const EcologicalDashboard = lazy(() => import('../dashboard/pages/EcologicalDashboard.js'));
const StewardshipDashboard = lazy(() => import('../dashboard/pages/StewardshipDashboard.js'));
const SolarClimateDashboard = lazy(() => import('../climate/SolarClimateDashboard.js'));
const PlantingToolDashboard = lazy(() => import('../dashboard/pages/PlantingToolDashboard.js'));
const ForestHubDashboard = lazy(() => import('../dashboard/pages/ForestHubDashboard.js'));
const CarbonDiagnosticDashboard = lazy(() => import('../dashboard/pages/CarbonDiagnosticDashboard.js'));
const NurseryLedgerDashboard = lazy(() => import('../dashboard/pages/NurseryLedgerDashboard.js'));
const EnergyDashboard = lazy(() => import('../dashboard/pages/EnergyDashboard.js'));
const EducationalAtlasPanel = lazy(() => import('../../components/panels/EducationalAtlasPanel.js'));
const ZonePanel = lazy(() => import('../zones/ZonePanel.js'));
const SitingPanel = lazy(() => import('../rules/SitingPanel.js'));


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

  // Lifted into uiStore so the IconSidebar rendered in ProjectPage (when the
  // Map tab is active) can drive the same panel state. The store holds the
  // nullable value directly so "close panel" (setActiveView(null)) still
  // collapses the rail — we only seed from the domain context on first mount,
  // not on every render.
  const activeView = useUIStore((s) => s.activeMapView);
  const setActiveView = useUIStore((s) => s.setActiveMapView);
  const hasSeededViewRef = useRef(false);
  useEffect(() => {
    if (hasSeededViewRef.current) return;
    hasSeededViewRef.current = true;
    if (useUIStore.getState().activeMapView == null) {
      setActiveView(getDomainContext(useUIStore.getState().activeDashboardSection).panel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);

  const [mapRef, setMapRef] = useState<maplibregl.Map | null>(null);
  const [drawRef, setDrawRef] = useState<MapboxDraw | null>(null);
  const [markerRef, setMarkerRef] = useState<maplibregl.Marker | null>(null);
  const [boundaryColor, setBoundaryColor] = useState<string>(mapTokens.boundary);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [pendingCommentLngLat, setPendingCommentLngLat] = useState<[number, number] | null>(null);
  const [pendingCommentText, setPendingCommentText] = useState('');
  const addComment = useCommentStore((s) => s.addComment);
  const createCommentRemote = useCommentStore((s) => s.createComment);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const authorName = user?.displayName ?? user?.email?.split('@')[0] ?? useCommentStore.getState().authorName;

  // Role-based access control
  const { role, canEdit } = useProjectRole(project.serverId ?? project.id);
  // Unauthenticated users retain full local editing capability
  const effectiveCanEdit = !isAuthenticated || canEdit;
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
    wsService.sendTyping('drawing');
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
      wsService.stopTyping();
      mapRef?.off('draw.create', handleCreate);
    };
    mapRef?.on('draw.create', handleCreate);
  };

  const cancelBoundaryDraw = () => {
    drawRef?.deleteAll();
    drawRef?.changeMode('simple_select');
    setIsDrawingBoundary(false);
    wsService.stopTyping();
  };


  const center = computeCenterFromBoundary(project.parcelBoundaryGeojson);

  return (
    <div ref={layoutRef} className={css.layout}>
      {/* Map fills remaining space */}
      <div className={isMobile ? css.mapAreaMobile : css.mapArea}>
        {/* Floating project name card */}
        <div className={css.floatingProjectCard}>
          <div className={css.floatingProjectName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {project.name}
            {isAuthenticated && <RoleBadge role={role} size="sm" />}
          </div>
          <div className={css.floatingProjectSub}>OGDEN LAND DESIGN ATLAS</div>
        </div>

        {/* Boundary draw button */}
        <div className={css.floatingControls}>
          {isDrawingBoundary ? (
            <button onClick={cancelBoundaryDraw} className={css.btnCancelDraw}>Cancel Drawing</button>
          ) : (
            <button
              onClick={startBoundaryDraw}
              disabled={!drawRef || !effectiveCanEdit}
              title={!effectiveCanEdit ? 'Editing requires Designer or Owner role' : undefined}
              className={css.btnDrawBoundary}
              style={!effectiveCanEdit ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
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
            canEdit={effectiveCanEdit}
            onMapReady={(map, draw) => { setMapRef(map); setDrawRef(draw); }}
            onMarkerCreated={(m) => setMarkerRef(m)}
          />
        </ErrorBoundary>

        {/* §2 — view-mode (2D / 2.5D / 3D), cross-section, and viewshed tools
            stacked top-left beneath the project card. */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 12,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          <Suspense fallback={null}>
            <ViewModeSwitcher onPitch={(deg) => mapRef?.easeTo({ pitch: deg, duration: 400 })} />
          </Suspense>
          <Suspense fallback={null}>
            <CrossSectionTool projectId={project.id} map={mapRef} draw={drawRef} />
          </Suspense>
          <Suspense fallback={null}>
            <ViewshedToggle />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ViewshedOverlay projectId={project.id} map={mapRef} />
        </Suspense>

        {/* Sprint CB — map-side GAEZ v4 suitability overlay + picker. */}
        <ErrorBoundary>
          <GaezOverlay map={mapRef} />
          <GaezMapControls />
        </ErrorBoundary>

        {/* Sprint CD — map-side SoilGrids v2.0 property overlay + picker. */}
        <ErrorBoundary>
          <SoilOverlay map={mapRef} />
          <SoilMapControls />
        </ErrorBoundary>

        {/* Typing indicator for real-time collaboration */}
        <ErrorBoundary>
          <TypingIndicator />
        </ErrorBoundary>

        {/* Floating comment input — appears after user clicks map in comment mode */}
        {pendingCommentLngLat && (
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, display: 'flex', gap: 6, alignItems: 'center',
            background: 'var(--color-panel-bg, #1a1a1a)', border: '1px solid rgba(196,162,101,0.3)',
            borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            minWidth: 320, maxWidth: 420,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{'\u{1F4CD}'}</span>
            <input
              type="text"
              autoFocus
              value={pendingCommentText}
              onChange={(e) => setPendingCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingCommentText.trim()) {
                  const projectId = project.serverId ?? project.id;
                  if (isAuthenticated) {
                    createCommentRemote(projectId, { text: pendingCommentText.trim(), location: pendingCommentLngLat }, authorName);
                  } else {
                    const comment: Comment = {
                      id: crypto.randomUUID(),
                      projectId: project.id,
                      author: authorName,
                      text: pendingCommentText.trim(),
                      location: pendingCommentLngLat,
                      featureId: null,
                      featureType: null,
                      resolved: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    addComment(comment);
                  }
                  setPendingCommentLngLat(null);
                  setPendingCommentText('');
                  setIsAddingComment(false);
                } else if (e.key === 'Escape') {
                  setPendingCommentLngLat(null);
                  setPendingCommentText('');
                  setIsAddingComment(false);
                }
              }}
              placeholder="Type your comment and press Enter..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--color-panel-text, #e0e0e0)', fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => {
                if (!pendingCommentText.trim()) return;
                const projectId = project.serverId ?? project.id;
                if (isAuthenticated) {
                  createCommentRemote(projectId, { text: pendingCommentText.trim(), location: pendingCommentLngLat }, authorName);
                } else {
                  const comment: Comment = {
                    id: crypto.randomUUID(),
                    projectId: project.id,
                    author: authorName,
                    text: pendingCommentText.trim(),
                    location: pendingCommentLngLat,
                    featureId: null,
                    featureType: null,
                    resolved: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  addComment(comment);
                }
                setPendingCommentLngLat(null);
                setPendingCommentText('');
                setIsAddingComment(false);
              }}
              disabled={!pendingCommentText.trim()}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: pendingCommentText.trim() ? 'rgba(196,162,101,0.2)' : 'rgba(255,255,255,0.05)',
                color: pendingCommentText.trim() ? group.livestock : 'rgba(255,255,255,0.3)',
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setPendingCommentLngLat(null);
                setPendingCommentText('');
                setIsAddingComment(false);
              }}
              style={{
                padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
                fontSize: 11, flexShrink: 0,
              }}
            >
              Cancel
            </button>
          </div>
        )}

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
              canEdit={effectiveCanEdit}
              onExport={onExport}
            />
          </Suspense>
        )}

        {!isMobile && (
          activeView === 'paddockDesign' ||
          activeView === 'herdRotation' ||
          activeView === 'grazingAnalysis' ||
          activeView === 'livestockInventory'
        ) && (
          <Suspense fallback={null}>
            <PaddockListFloating projectId={project.id} draw={drawRef} map={mapRef} />
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
              {activeView === 'design' && <DesignToolsPanel projectId={project.id} draw={drawRef} map={mapRef} canEdit={effectiveCanEdit} />}
              {activeView === 'hydrology' && <HydrologyRightPanel project={project} />}
              {activeView === 'ai' && <AtlasAIPanel project={project} />}
              {activeView === 'economic' && <EconomicsPanel project={project} />}
              {activeView === 'regulatory' && <RegulatoryPanel project={project} />}
              {activeView === 'feasibility' && <DecisionSupportPanel project={project} />}
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
                          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                          setPendingCommentLngLat(lngLat);
                          setPendingCommentText('');
                          mapRef.getCanvas().style.cursor = '';
                          mapRef.off('click', handler);
                        };
                        mapRef.once('click', handler);
                      } else {
                        // Cancelling — clean up pending state
                        setPendingCommentLngLat(null);
                        setPendingCommentText('');
                      }
                      return !v;
                    });
                  }}
                />
              )}
              {activeView === 'vision' && <VisionPanel project={project} />}
              {activeView === 'scenarios' && <ScenarioPanel project={project} />}
              {activeView === 'moontrance' && <MoontrancePanel project={project} />}
              {activeView === 'spiritual' && <SpiritualPanel project={project} />}
              {activeView === 'portal' && <PortalConfigPanel project={project} />}
              {activeView === 'templates' && <TemplatePanel project={project} />}
              {activeView === 'reporting' && <ReportingPanel project={project} onOpenExport={onExport} />}
              {activeView === 'settings' && (
                <SettingsPanel project={project} onEdit={onEdit} onExport={onExport} onDelete={onDelete} />
              )}
              {activeView === 'fieldnotes' && <FieldworkPanel project={project} map={mapRef} />}
              {activeView === 'paddockDesign' && (
                <div className="map-rail-dashboard">
                  <PaddockDesignDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'herdRotation' && (
                <div className="map-rail-dashboard">
                  <HerdRotationDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'grazingAnalysis' && (
                <div className="map-rail-dashboard">
                  <GrazingDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'livestockInventory' && (
                <div className="map-rail-dashboard">
                  <LivestockDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'terrain' && (
                <div className="map-rail-dashboard">
                  <TerrainDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'cartographic' && (
                <div className="map-rail-dashboard">
                  <CartographicDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'ecological' && (
                <div className="map-rail-dashboard">
                  <EcologicalDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'stewardship' && (
                <div className="map-rail-dashboard">
                  <StewardshipDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'climate' && (
                <div className="map-rail-dashboard">
                  <SolarClimateDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'planting' && (
                <div className="map-rail-dashboard">
                  <PlantingToolDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'forest' && (
                <div className="map-rail-dashboard">
                  <ForestHubDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'carbon' && (
                <div className="map-rail-dashboard">
                  <CarbonDiagnosticDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'nursery' && (
                <div className="map-rail-dashboard">
                  <NurseryLedgerDashboard project={project} onSwitchToMap={() => setActiveView(null)} />
                </div>
              )}
              {activeView === 'energy' && (
                <div className="map-rail-dashboard">
                  <EnergyDashboard project={project} onSwitchToMap={() => setActiveView(null)} focus="energy" />
                </div>
              )}
              {activeView === 'infrastructure' && (
                <div className="map-rail-dashboard">
                  <EnergyDashboard project={project} onSwitchToMap={() => setActiveView(null)} focus="infrastructure" />
                </div>
              )}
              {activeView === 'educational' && <EducationalAtlasPanel project={project} />}
              {activeView === 'zoning' && <ZonePanel projectId={project.id} draw={drawRef} map={mapRef} canEdit={effectiveCanEdit} />}
              {activeView === 'siting' && <SitingPanel project={project} />}
              {activeView === 'unmapped' && (
                <EmptyState
                  icon={<span aria-hidden="true" style={{ fontSize: 28 }}>{'\u{1F6A7}'}</span>}
                  title="No panel wired for this view yet"
                  description={
                    activeDashboardSection
                      ? `"${activeDashboardSection}" does not map to a map-rail panel. Open the Dashboard for a full view, or pick a different domain from the rail.`
                      : 'This domain has no dedicated map-rail panel yet. Open the Dashboard for a full view, or pick a different domain from the rail.'
                  }
                />
              )}
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

        return (
          <div className={css.rightPanel}>
            <RailPanelShell view={activeView} onClose={() => setActiveView(null)}>
              {panelContent}
            </RailPanelShell>
          </div>
        );
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
