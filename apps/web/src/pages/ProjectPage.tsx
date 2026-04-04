/**
 * ProjectPage — thin orchestrator with tabbed Dashboard / Map View.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useStructureStore } from '../store/structureStore.js';
import { useSiteDataStore } from '../store/siteDataStore.js';
import * as turf from '@turf/turf';
import ProjectEditor from '../features/project/ProjectEditor.js';
import ProjectSummaryExport from '../features/export/ProjectSummaryExport.js';
import ProjectTabBar from '../components/ProjectTabBar.js';
import MapView from '../features/map/MapView.js';
import DashboardView from '../features/dashboard/DashboardView.js';
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
  const [isEditing, setIsEditing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Auto-fetch environmental data when project has a boundary
  const fetchSiteData = useSiteDataStore((s) => s.fetchForProject);
  useEffect(() => {
    if (!project?.parcelBoundaryGeojson) return;
    try {
      const centroid = turf.centroid(project.parcelBoundaryGeojson);
      const coords = centroid.geometry.coordinates;
      const lng = coords[0] ?? 0;
      const lat = coords[1] ?? 0;
      fetchSiteData(project.id, [lng, lat], project.country);
    } catch { /* boundary may be invalid */ }
  }, [project?.id, project?.parcelBoundaryGeojson, project?.country, fetchSiteData]);

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
      />

      <div className={css.contentArea}>
        {/* Dashboard view */}
        <div className={css.tabPanel} style={{ display: activeTab === 'dashboard' ? 'flex' : 'none' }}>
          <DashboardView project={project} onSwitchToMap={() => setActiveTab('map')} />
        </div>

        {/* Map view */}
        <div className={css.tabPanel} style={{ display: activeTab === 'map' ? 'flex' : 'none' }}>
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
