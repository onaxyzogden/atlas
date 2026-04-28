/**
 * LifecycleProjectPage — parallel project workspace built on LandOsShell.
 *
 * Mirrors ProjectPage.tsx data orchestration (project lookup, hydration guard,
 * site-data fetch, role, WebSocket boot, modals) so the new shell exercises
 * real stores. The legacy /project/$projectId route is **unchanged** — this
 * page is reachable only at /project/$projectId/lifecycle.
 *
 * Reuses (no fork): DashboardView, MapView, ProjectTabBar, MobileProjectShell,
 * every store, every hook.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import * as turf from '@turf/turf';
import { useProjectStore } from '../store/projectStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useStructureStore } from '../store/structureStore.js';
import { useSiteDataStore, abortFetchForProject } from '../store/siteDataStore.js';
import { debounce } from '../lib/debounce.js';
import { useUIStore } from '../store/uiStore.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import { useProjectRole } from '../hooks/useProjectRole.js';
import { useProjectWebSocket } from '../hooks/useProjectWebSocket.js';
import ProjectEditor from '../features/project/ProjectEditor.js';
import ProjectSummaryExport from '../features/export/ProjectSummaryExport.js';
import ProjectTabBar, { type ProjectTab } from '../components/ProjectTabBar.js';
import MapView from '../features/map/MapView.js';
import DashboardView from '../features/dashboard/DashboardView.js';
import MobileProjectShell from './MobileProjectShell.js';
import LandOsShell from '../features/land-os/LandOsShell.js';
import LifecycleSidebar from '../features/land-os/LifecycleSidebar.js';
import AdaptiveDecisionRail from '../features/land-os/AdaptiveDecisionRail.js';
import css from './LifecycleProjectPage.module.css';

export default function LifecycleProjectPage() {
  const { projectId } = useParams({ from: '/app/project/$projectId' });
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const project = projects.find((p) => p.id === projectId);

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === projectId), [allStructures, projectId]);

  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const isMobile = useIsMobile();
  const activeDashboardSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);
  const [isEditing, setIsEditing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { role: projectRole } = useProjectRole(project?.serverId ?? projectId);

  useProjectWebSocket(project?.serverId);

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

  const fetchSiteData = useSiteDataStore((s) => s.fetchForProject);
  const debouncedFetchSiteData = useMemo(() => debounce(fetchSiteData, 400), [fetchSiteData]);
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

  useEffect(() => {
    if (!project?.id) return;
    const id = project.id;
    return () => { abortFetchForProject(id); };
  }, [project?.id]);

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
        <Link to="/home" className={css.notFoundLink}>Back to projects</Link>
      </div>
    );
  }

  const handleDelete = () => {
    deleteProject(project.id);
    navigate({ to: '/home' });
  };

  const handleDuplicate = () => {
    const clone = duplicateProject(project.id);
    if (clone) {
      setActiveProject(clone.id);
      navigate({ to: '/project/$projectId', params: { projectId: clone.id } });
    }
  };

  const handleTabChange = (tab: ProjectTab) => {
    setActiveTab(tab);
    if (tab === 'intelligence' && activeDashboardSection !== 'data-catalog') {
      setActiveDashboardSection('data-catalog');
    } else if (tab === 'report' && activeDashboardSection !== 'reporting') {
      setActiveDashboardSection('reporting');
    }
  };

  const isMapTab = activeTab === 'design-map';
  const isDashboardTab = !isMapTab;

  if (isMobile) {
    return (
      <>
        <MobileProjectShell
          project={project}
          zones={zones}
          structures={structures}
          onEdit={() => setIsEditing(true)}
          onExport={() => setShowExport(true)}
          onDelete={() => setShowDeleteConfirm(true)}
          onDuplicate={handleDuplicate}
          onGenerateBrief={() => setShowExport(true)}
        />

        {isEditing && (
          <div className={css.modalOverlay} onClick={() => setIsEditing(false)} role="presentation">
            <div onClick={(e) => e.stopPropagation()} className={css.editorModal} role="dialog" aria-modal="true">
              <ProjectEditor project={project} onClose={() => setIsEditing(false)} />
            </div>
          </div>
        )}
        {showExport && <ProjectSummaryExport project={project} onClose={() => setShowExport(false)} />}
        {showDeleteConfirm && (
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
      </>
    );
  }

  return (
    <div className={css.layout}>
      <ProjectTabBar
        projectName={project.name}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        projectRole={projectRole}
        onGenerateBrief={() => setShowExport(true)}
      />

      <LandOsShell
        sidebar={<LifecycleSidebar activeTab={activeTab} />}
        rail={<AdaptiveDecisionRail project={project} />}
      >
        <div className={isDashboardTab ? css.tabPanel : css.tabPanelHidden}>
          <DashboardView
            project={project}
            onSwitchToMap={() => handleTabChange('design-map')}
            onGenerateBrief={() => setShowExport(true)}
          />
        </div>
        <div className={isMapTab ? css.tabPanel : css.tabPanelHidden}>
          <MapView
            project={project}
            zones={zones}
            structures={structures}
            onEdit={() => setIsEditing(true)}
            onExport={() => setShowExport(true)}
            onDelete={() => setShowDeleteConfirm(true)}
            onDuplicate={handleDuplicate}
          />
        </div>
      </LandOsShell>

      {/* Editor modal */}
      {isEditing && (
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
