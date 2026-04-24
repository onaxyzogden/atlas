/**
 * ProjectPage — thin orchestrator with tabbed Dashboard / Map View.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useStructureStore } from '../store/structureStore.js';
import { useSiteDataStore, abortFetchForProject } from '../store/siteDataStore.js';
import { debounce } from '../lib/debounce.js';
import { useUIStore } from '../store/uiStore.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import { useProjectRole } from '../hooks/useProjectRole.js';
import { useProjectWebSocket } from '../hooks/useProjectWebSocket.js';
import * as turf from '@turf/turf';
import ProjectEditor from '../features/project/ProjectEditor.js';
import ProjectSummaryExport from '../features/export/ProjectSummaryExport.js';
import ProjectTabBar from '../components/ProjectTabBar.js';
import MapView from '../features/map/MapView.js';
import DashboardView from '../features/dashboard/DashboardView.js';
import DashboardSidebar from '../features/dashboard/DashboardSidebar.js';
import IconSidebar from '../components/IconSidebar.js';
import { resolveDashboardSectionFromRail } from '../features/navigation/taxonomy.js';
import css from './ProjectPage.module.css';

export default function ProjectPage() {
  const { projectId } = useParams({ from: '/app/project/$projectId' });
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const project = projects.find((p) => p.id === projectId);

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === projectId), [allStructures, projectId]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'map'>('dashboard');
  const isMobile = useIsMobile();
  const activeDashboardSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);
  const activeMapView = useUIStore((s) => s.activeMapView);
  const setActiveMapView = useUIStore((s) => s.setActiveMapView);
  const activeMapSubItem = useUIStore((s) => s.activeMapSubItem);
  const setActiveMapSubItem = useUIStore((s) => s.setActiveMapSubItem);
  const [isEditing, setIsEditing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { role: projectRole } = useProjectRole(project?.serverId ?? projectId);

  // Real-time WebSocket collaboration
  useProjectWebSocket(project?.serverId);

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

  // Auto-fetch environmental data when project has a boundary.
  // Sprint BJ: debounced so rapid boundary edits coalesce into a single fetch
  // (400 ms window). Unmount aborts any in-flight fetch for the project.
  const fetchSiteData = useSiteDataStore((s) => s.fetchForProject);
  const debouncedFetchSiteData = useMemo(
    () => debounce(fetchSiteData, 400),
    [fetchSiteData],
  );
  useEffect(() => {
    if (!project?.parcelBoundaryGeojson) return;
    try {
      const centroid = turf.centroid(project.parcelBoundaryGeojson);
      const coords = centroid.geometry.coordinates;
      const lng = coords[0] ?? 0;
      const lat = coords[1] ?? 0;
      const turfBbox = turf.bbox(project.parcelBoundaryGeojson);
      const bbox: [number, number, number, number] = [turfBbox[0], turfBbox[1], turfBbox[2], turfBbox[3]];
      debouncedFetchSiteData(project.id, [lng, lat], project.country, bbox);
    } catch { /* boundary may be invalid */ }
    return () => debouncedFetchSiteData.cancel();
  }, [project?.id, project?.parcelBoundaryGeojson, project?.country, debouncedFetchSiteData]);

  // Sprint BJ: abort any in-flight fetch when the user navigates away from
  // the project (prevents wasted network work on project switches).
  useEffect(() => {
    if (!project?.id) return;
    const id = project.id;
    return () => { abortFetchForProject(id); };
  }, [project?.id]);

  // a11y: Escape key dismisses whichever modal is currently open
  useEffect(() => {
    if (!isEditing && !showDeleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) setIsEditing(false);
        else if (showDeleteConfirm) setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isEditing, showDeleteConfirm]);

  if (!ready) return null;

  if (!project) {
    return (
      <div className={css.notFound}>
        <h2 className={css.notFoundTitle}>Project not found</h2>
        <Link to="/" className={css.notFoundLink}>Back to projects</Link>
      </div>
    );
  }

  const handleDelete = () => {
    deleteProject(project.id);
    navigate({ to: '/' });
  };

  return (
    <div className={css.layout}>
      <ProjectTabBar
        projectName={project.name}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projectRole={projectRole}
      />

      <div className={css.mainRow}>
        {/* Left sidebar — swap based on active tab.
            Dashboard tab: domain-grouped dashboard rail (clickable sections).
            Map tab: icon rail (phase/domain grouped, drives map panels).
            Both read the same `sidebarGrouping` preference, so toggling
            Phase ⇄ Domain in one view applies everywhere. */}
        {!isMobile && activeTab === 'dashboard' && (
          <DashboardSidebar
            activeSection={activeDashboardSection}
            onSectionChange={setActiveDashboardSection}
          />
        )}
        {!isMobile && activeTab === 'map' && (
          <IconSidebar
            activeView={activeMapView}
            onViewChange={setActiveMapView}
            activeSubItem={activeMapSubItem}
            onSubItemChange={(id, panel) => {
              setActiveMapSubItem(id);
              setActiveMapView(panel);
              // Keep the dashboard-section context in sync so downstream
              // consumers (DomainFloatingToolbar domain tint, mirror metrics)
              // reflect what the rail is showing.
              if (panel) {
                const section = resolveDashboardSectionFromRail(id, panel);
                if (section) setActiveDashboardSection(section);
              }
            }}
          />
        )}

        <div className={css.contentArea}>
          {/* Dashboard view */}
          <div className={activeTab === 'dashboard' ? css.tabPanel : css.tabPanelHidden}>
            <DashboardView project={project} onSwitchToMap={() => setActiveTab('map')} />
          </div>

          {/* Map view */}
          <div className={activeTab === 'map' ? css.tabPanel : css.tabPanelHidden}>
            <MapView
              project={project}
              zones={zones}
              structures={structures}
              onEdit={() => setIsEditing(true)}
              onExport={() => setShowExport(true)}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>
        </div>
      </div>

      {/* Editor modal */}
      {isEditing && (
        /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
        <div className={css.modalOverlay} onClick={() => setIsEditing(false)} role="presentation">
          <div onClick={(e) => e.stopPropagation()} className={css.editorModal} role="dialog" aria-modal="true">
            <ProjectEditor project={project} onClose={() => setIsEditing(false)} />
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && <ProjectSummaryExport project={project} onClose={() => setShowExport(false)} />}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
        <div className={css.modalOverlay} onClick={() => setShowDeleteConfirm(false)} role="presentation">
          <div onClick={(e) => e.stopPropagation()} className={css.deleteDialog} role="dialog" aria-modal="true">
            <h3 className={css.deleteTitle}>Delete &ldquo;{project.name}&rdquo;?</h3>
            <p className={css.deleteDesc}>This will permanently remove the project, all zones, and attachments.</p>
            <div className={css.deleteActions}>
              <button onClick={handleDelete} className={css.btnDeleteConfirm}>Delete Project</button>
              <button onClick={() => setShowDeleteConfirm(false)} className={css.btnDeleteCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
