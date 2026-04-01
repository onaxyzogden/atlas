/**
 * ProjectPage — main project view with icon sidebar + map + right panel.
 * Matches the polished target design.
 */

import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import MapCanvas from '../features/map/MapCanvas.js';
import ProjectEditor from '../features/project/ProjectEditor.js';
import ProjectSummaryExport from '../features/export/ProjectSummaryExport.js';
import IconSidebar, { type SidebarView } from '../components/IconSidebar.js';
import { useCommentStore } from '../store/commentStore.js';
import SlideUpPanel from '../components/SlideUpPanel.js';
import ErrorBoundary from '../components/ErrorBoundary.js';
import GPSTracker from '../features/mobile/GPSTracker.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import css from './ProjectPage.module.css';

// Lazy-loaded panels — split into separate chunks
const MapLayersPanel = lazy(() => import('../components/panels/MapLayersPanel.js'));
const SiteIntelligencePanel = lazy(() => import('../components/panels/SiteIntelligencePanel.js'));
const DesignToolsPanel = lazy(() => import('../components/panels/DesignToolsPanel.js'));
const HydrologyRightPanel = lazy(() => import('../components/panels/HydrologyRightPanel.js'));
const AtlasAIPanel = lazy(() => import('../components/panels/AtlasAIPanel.js'));
const TimelinePanel = lazy(() => import('../components/panels/TimelinePanel.js'));
const EducationalAtlasPanel = lazy(() => import('../components/panels/EducationalAtlasPanel.js'));
const PortalConfigPanel = lazy(() => import('../features/portal/PortalConfigPanel.js'));
const VisionPanel = lazy(() => import('../features/vision/VisionPanel.js'));
const DecisionSupportPanel = lazy(() => import('../features/decision/DecisionSupportPanel.js'));
const MoontrancePanel = lazy(() => import('../features/moontrance/MoontrancePanel.js'));
const VersionHistory = lazy(() => import('../features/project/VersionHistory.js'));
const CollaborationPanel = lazy(() => import('../features/collaboration/CollaborationPanel.js'));
const EconomicsPanel = lazy(() => import('../features/economics/EconomicsPanel.js'));
const ScenarioPanel = lazy(() => import('../features/scenarios/ScenarioPanel.js'));
const TemplatePanel = lazy(() => import('../features/templates/TemplatePanel.js'));
const ReportingPanel = lazy(() => import('../features/reporting/ReportingPanel.js'));
const FieldworkPanel = lazy(() => import('../features/fieldwork/FieldworkPanel.js'));

export default function ProjectPage() {
  const { projectId } = useParams({ from: '/app/project/$projectId' });
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const project = projects.find((p) => p.id === projectId);

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);

  const [activeView, setActiveView] = useState<SidebarView>('layers');
  const [isEditing, setIsEditing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);

  // Store map/draw/marker refs
  const [mapRef, setMapRef] = useState<mapboxgl.Map | null>(null);
  const [drawRef, setDrawRef] = useState<MapboxDraw | null>(null);
  const [markerRef, setMarkerRef] = useState<mapboxgl.Marker | null>(null);
  const [boundaryColor, setBoundaryColor] = useState('#7d6140');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const addComment = useCommentStore((s) => s.addComment);
  const authorName = useCommentStore((s) => s.authorName);
  const isMobile = useIsMobile();
  const updateProject = useProjectStore((s) => s.updateProject);

  const handleCenterProperty = () => {
    if (!mapRef) return;
    const c = computeCenterFromBoundary(project?.parcelBoundaryGeojson);
    if (c) {
      mapRef.flyTo({ center: c, zoom: 15, duration: 1200 });
    } else if (project?.address) {
      // Geocode and fly
      const token = (mapRef as unknown as { _requestManager?: { _skuToken?: string } })?.constructor?.prototype?.accessToken ?? '';
      // Simpler: just use the marker position if available
      if (markerRef) {
        const lngLat = markerRef.getLngLat();
        mapRef.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 15, duration: 1200 });
      }
    }
  };

  // Start drawing boundary
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

        // Compute acreage
        import('@turf/turf').then((turf) => {
          const areaM2 = turf.area(lastFeature as GeoJSON.Feature<GeoJSON.Polygon>);
          const hectares = Math.round((areaM2 / 10000) * 100) / 100;
          updateProject(projectId, {
            parcelBoundaryGeojson: geojson,
            hasParcelBoundary: true,
            acreage: hectares,
          });
        }).catch(() => {
          updateProject(projectId, {
            parcelBoundaryGeojson: geojson,
            hasParcelBoundary: true,
          });
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

  // Hydration
  const [ready, setReady] = useState(() => useProjectStore.persist.hasHydrated?.() ?? true);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), 150);
    try {
      const unsub = useProjectStore.persist.onFinishHydration?.(() => {
        setReady(true);
        clearTimeout(timer);
      });
      return () => { clearTimeout(timer); unsub?.(); };
    } catch {
      clearTimeout(timer);
      setReady(true);
    }
  }, [ready]);

  useEffect(() => {
    setActiveProject(projectId);
    return () => setActiveProject(null);
  }, [projectId, setActiveProject]);

  if (!ready) return null;

  if (!project) {
    return (
      <div className={css.notFound}>
        <h2 className={css.notFoundTitle}>Project not found</h2>
        <Link to="/" className={css.notFoundLink}>
          Back to projects
        </Link>
      </div>
    );
  }

  const center = computeCenterFromBoundary(project.parcelBoundaryGeojson);

  const handleDelete = () => {
    deleteProject(project.id);
    navigate({ to: '/' });
  };

  return (
    <div className={css.layout}>
      {/* Icon sidebar — hidden on mobile */}
      {!isMobile && (
        <IconSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          zoneCount={zones.length}
          structureCount={0}
        />
      )}

      {/* Map fills remaining space */}
      <div className={isMobile ? css.mapAreaMobile : css.mapArea}>
        {/* Header bar over map */}
        <div className={css.mapHeader}>
          <Link to="/" className={css.backLink}>
            &larr;
          </Link>

          <div>
            <div className={css.projectName}>{project.name}</div>
            <div className={css.projectAddress}>
              {project.address ?? 'No address set'}
              {project.address ? ' \u00b7 ' : ''}
            </div>
          </div>

          <div className={css.headerSpacer} />

          {/* Boundary draw button */}
          {isDrawingBoundary ? (
            <button onClick={cancelBoundaryDraw} className={css.btnCancelDraw}>
              Cancel Drawing
            </button>
          ) : (
            <button
              onClick={startBoundaryDraw}
              disabled={!drawRef}
              className={css.btnDrawBoundary}
            >
              {project.hasParcelBoundary ? 'Redraw Boundary' : 'Draw Boundary'}
            </button>
          )}

          <span className={css.headerStats}>
            {zones.length} zones &middot; 0 structures
          </span>

          <button
            onClick={() => setActiveView(activeView === 'settings' ? null : 'settings')}
            className={css.btnSettings}
          >
            &#9881;
          </button>
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
      </div>

      {/* Right panel content */}
      {(() => {
        if (!activeView) return null;
        const panelContent = (
          <ErrorBoundary name="panel">
          <Suspense fallback={<div className={css.panelLoading}>Loading panel...</div>}>
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
                    // Enter comment placement mode
                    mapRef.getCanvas().style.cursor = 'crosshair';
                    const handler = (e: mapboxgl.MapMouseEvent) => {
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
            {activeView === 'reporting' && <ReportingPanel project={project} onOpenExport={() => setShowExport(true)} />}
            {activeView === 'settings' && (
              <SettingsPanel project={project} onEdit={() => setIsEditing(true)} onExport={() => setShowExport(true)} onDelete={() => setShowDeleteConfirm(true)} />
            )}
            {activeView === 'fieldnotes' && <FieldworkPanel project={project} map={mapRef} />}
          </Suspense>
          </ErrorBoundary>
        );

        // On mobile, use slide-up panel
        if (isMobile) {
          return (
            <SlideUpPanel isOpen onClose={() => setActiveView(null)} title={activeView}>
              {panelContent}
            </SlideUpPanel>
          );
        }

        // Desktop: fixed right panel
        return (
          <div className={css.rightPanel}>
            {panelContent}
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
              <span className={css.mobileBarIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* GPS tracker on mobile */}
          <GPSTracker map={mapRef} isMapReady={!!mapRef} />
        </div>
      )}

      {/* Editor modal */}
      {isEditing && (
        <div className={css.modalOverlay} onClick={() => setIsEditing(false)}>
          <div onClick={(e) => e.stopPropagation()} className={css.editorModal}>
            <ProjectEditor project={project} onClose={() => setIsEditing(false)} />
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && <ProjectSummaryExport project={project} onClose={() => setShowExport(false)} />}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className={css.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className={css.deleteDialog}>
            <h3 className={css.deleteTitle}>
              Delete &ldquo;{project.name}&rdquo;?
            </h3>
            <p className={css.deleteDesc}>
              This will permanently remove the project, all zones, and attachments.
            </p>
            <div className={css.deleteActions}>
              <button onClick={handleDelete} className={css.btnDeleteConfirm}>
                Delete Project
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className={css.btnDeleteCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderPanel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={css.placeholder}>
      <h2 className={css.placeholderTitle}>{title}</h2>
      <p className={css.placeholderDesc}>{desc}</p>
      <div className={css.placeholderBadge}>Coming in Phase 2</div>
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
        <SettingsButton onClick={onEdit}>Edit Project Details</SettingsButton>
        <SettingsButton onClick={onExport}>Export / Print Summary</SettingsButton>
        <SettingsButton onClick={onDelete} danger>Delete Project</SettingsButton>
      </div>
    </div>
  );
}

function SettingsButton({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={danger ? css.settingsBtnDanger : css.settingsBtn}
    >
      {children}
    </button>
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
