/**
 * PortfolioMapPage — the four-zone Portfolio Home map surface
 * (OLOS_Portfolio_Home_Spec_v1.0 §2): left project list · centre multi-boundary
 * map · right at-a-glance rail · bottom stage-navigation rail. The map is the
 * primary `/v3/portfolio` view; the card grid (PortfolioDashboardView) is the
 * alternate accessed via the top-bar toggle.
 *
 * Selection state is owned here and shared with the list, map, and both rails.
 * The right rail (§2.4) and bottom stage rail (§2.5) read a single composing
 * briefing hook for the selected project — strictly read-only.
 *
 * Mobile (§2.1, ≤760px): the left list collapses to a slide-up sheet behind a
 * "Projects" button; the right rail slides up as a bottom sheet whenever a
 * project is selected; the bottom stage rail stays fixed. All driven by the
 * same selection state — no separate mobile component tree.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { List, X } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import type { CrossRelationship, CreatePoiFlowInput, PoiKind } from '@ogden/shared';
import PortfolioMap, { type PoiFlowDraft } from './PortfolioMap.js';
import PortfolioProjectList from './PortfolioProjectList.js';
import PortfolioAtAGlanceRail from './PortfolioAtAGlanceRail.js';
import PortfolioStageRail from './PortfolioStageRail.js';
import PortfolioToast, { emitPortfolioToast } from './PortfolioToast.js';
import { usePortfolioBriefing } from './usePortfolioBriefing.js';
import { usePortfolioStages } from './usePortfolioStages.js';
import { useCrossRelationshipStore } from '../../store/crossRelationshipStore.js';
import { usePoiStore } from '../../store/poiStore.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import { usePortfolioContractorRedirect } from './usePortfolioContractorRedirect.js';
import { portfolioAccess } from './portfolioModel.js';
import { DEMO_OFFLINE_ENABLED } from '../../app/demoSession.js';
import { ApiError } from '../../lib/apiClient.js';
import { syncProjectNow, hydrateProjectBoundaries } from '../../lib/syncService.js';
import css from './PortfolioMapPage.module.css';

export interface PortfolioMapPageProps {
  projects: LocalProject[];
  /** Multi-select (2026-06-02): threaded from the host into the left list. In
   *  select mode the list rows toggle batch selection instead of driving the
   *  map briefing; the map itself is unaffected. Optional so the map renders
   *  standalone without the host's select state. */
  selectMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}

export default function PortfolioMapPage({
  projects,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: PortfolioMapPageProps) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mobile-only: whether the slide-up project list sheet is open.
  const [listOpen, setListOpen] = useState(false);
  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const briefing = usePortfolioBriefing(selected);
  const stageById = usePortfolioStages(projects);

  // §8 access control. Roles are async (useMyProjectRoles fetches) — gates here
  // tolerate the empty-map first render (owner-tier defaults open for local
  // projects, contractor redirect waits until roles resolve).
  const roleMap = useMyProjectRoles();
  const canCompare = projects.some((p) => portfolioAccess(p, roleMap).isOwnerTier);
  usePortfolioContractorRedirect(projects, roleMap);

  // Cross-project relationships (§5) for the selected project — fetched on
  // selection, drawn as centroid-to-centroid lines on the map.
  //
  // CRITICAL (root-cause of the "Link does nothing / Connections stays
  // disabled" bug, confirmed live 2026-05-31): the relationship API resolves
  // projects by their SERVER id (`projects.id`), but the Portfolio Map renders
  // LOCAL projects whose `id` is a client-minted UUID. Only `serverId` matches
  // a backend row. Passing the local id 404s on every fetch AND create — and
  // the old empty `.catch` swallowed it silently. So every API call here is
  // keyed by `serverId`, and projects lacking one (never synced) are gated with
  // an explanatory toast instead of a silent no-op.
  const fetchRelationships = useCrossRelationshipStore((s) => s.fetchForProject);
  const createRelationship = useCrossRelationshipStore((s) => s.createRelationship);
  const relationshipsByProject = useCrossRelationshipStore((s) => s.byProject);

  // local project id → server id (only synced projects appear).
  const serverIdByLocal = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) if (p.serverId) m.set(p.id, p.serverId);
    return m;
  }, [projects]);

  const selectedServerId = selected?.serverId ?? null;
  // Relationships are stored keyed by the id we fetched with (the server id);
  // their endpoints (projectAId/projectBId) are also server ids. The map maps
  // those back to centroids via a serverId-aware lookup.
  const relationships: CrossRelationship[] = selectedServerId
    ? (relationshipsByProject[selectedServerId] ?? [])
    : [];

  useEffect(() => {
    if (selectedServerId) void fetchRelationships(selectedServerId);
  }, [selectedServerId, fetchRelationships]);

  const handleAddRelationship = async (
    projectALocalId: string,
    projectBLocalId: string,
    type: CrossRelationship['relationshipType'],
    notes: string | null,
  ) => {
    const aServer = serverIdByLocal.get(projectALocalId);
    const bServer = serverIdByLocal.get(projectBLocalId);
    if (!aServer || !bServer) {
      const unsyncedId = !aServer ? projectALocalId : projectBLocalId;
      const name = projects.find((p) => p.id === unsyncedId)?.name ?? 'That project';
      emitPortfolioToast(
        `"${name}" isn't synced to the server yet, so it can't be linked.`,
        'error',
      );
      return;
    }
    try {
      await createRelationship(aServer, {
        projectBId: bServer,
        relationshipType: type,
        notes,
      });
      emitPortfolioToast('Connection created.', 'success');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const message =
        status === 409
          ? 'These projects are already linked.'
          : status === 403
            ? "You don't have permission to link one of these projects."
            : status === 404
              ? "One of these projects isn't synced to the server yet, so it can't be linked."
              : "Couldn't create the link. Please try again.";
      emitPortfolioToast(message, 'error');
    }
  };

  // ── Resource POIs (§ "one man's trash is another's treasure") ──────────────
  // POIs are portfolio-wide (owner-scoped, not per-selection), so fetch once on
  // mount. Flows carry a SERVER projectId, so creating one translates the local
  // project id → server id exactly like relationships; un-synced projects are
  // gated with an explanatory toast.
  const pois = usePoiStore((s) => s.pois);
  const poiFlows = usePoiStore((s) => s.flows);
  const fetchPois = usePoiStore((s) => s.fetchAll);
  const createPoi = usePoiStore((s) => s.createPoi);
  const createPoiFlow = usePoiStore((s) => s.createFlow);

  useEffect(() => {
    void fetchPois();
  }, [fetchPois]);

  // Lazily hydrate parcel geometry for server-synced projects that arrived with
  // `hasParcelBoundary: true` but no geojson (the list/sync path omits
  // geometry). Without this their centroid can't be computed, so they render no
  // pin/boundary and any relationship / POI-flow line targeting them can't draw
  // (confirmed live 2026-05-31, "Halton Hills"). The store write triggers a
  // re-render and the lines/pins then draw. The helper is idempotent — projects
  // already carrying geometry are skipped.
  //
  // Re-runs whenever the set of *pending* candidates changes, so projects that
  // sync down AFTER the map mounts get hydrated too (not just the mount-time
  // set). The key is built from the un-hydrated candidates' server ids: as each
  // hydrates its geojson becomes non-null and it drops out, so the key shrinks
  // monotonically to '' and the effect settles — unrelated project mutations
  // recompute the same string and don't re-fire it.
  const pendingBoundaryKey = useMemo(
    () =>
      projects
        .filter((p) => p.serverId && p.hasParcelBoundary && !p.parcelBoundaryGeojson)
        .map((p) => p.serverId)
        .join(','),
    [projects],
  );

  useEffect(() => {
    void hydrateProjectBoundaries();
  }, [pendingBoundaryKey]);

  const handleAddPoi = async (input: {
    name: string;
    poiKind: PoiKind;
    lng: number;
    lat: number;
  }) => {
    try {
      await createPoi(input);
      emitPortfolioToast('Resource POI placed.', 'success');
    } catch {
      emitPortfolioToast("Couldn't place the POI. Please try again.", 'error');
    }
  };

  const handleAddPoiFlow = async (
    poiId: string,
    projectLocalId: string,
    draft: PoiFlowDraft,
  ) => {
    const projectServerId = serverIdByLocal.get(projectLocalId);
    if (!projectServerId) {
      const name = projects.find((p) => p.id === projectLocalId)?.name ?? 'That project';
      emitPortfolioToast(
        `"${name}" isn't synced to the server yet, so it can't receive a flow.`,
        'error',
      );
      return;
    }
    const input: CreatePoiFlowInput = {
      projectId: projectServerId,
      materialKind: draft.materialKind,
      direction: draft.direction,
      label: draft.label,
      notes: draft.notes,
      [draft.quantityField]: draft.quantity,
    };
    try {
      await createPoiFlow(poiId, input);
      emitPortfolioToast('Resource flow created.', 'success');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const message =
        status === 409
          ? 'This POI is already connected to that project for the same material and direction.'
          : status === 403
            ? "You don't have permission to connect to that project."
            : status === 404
              ? "That project isn't synced to the server yet, so it can't receive a flow."
              : "Couldn't create the flow. Please try again.";
      emitPortfolioToast(message, 'error');
    }
  };

  // Portfolio POIs are server-backed with no local persistence, so creation
  // can't work offline. Withholding the handlers hides the Add-POI / Add-flow
  // controls (PortfolioMap renders them only when the handler is present)
  // rather than leaving buttons that can only toast a failure.
  const addPoiHandler = DEMO_OFFLINE_ENABLED ? undefined : handleAddPoi;
  const addPoiFlowHandler = DEMO_OFFLINE_ENABLED ? undefined : handleAddPoiFlow;

  // Manual "Sync now" for an un-synced project (the row's Sync button). Routes
  // through the canonical idempotent path; on success the project's serverId is
  // stamped and the row flips to "Synced". A builtin can't be synced (system-
  // owned) — surface that honestly rather than silently no-op.
  const handleSyncProject = async (id: string) => {
    const result = await syncProjectNow(id);
    if (result.ok) {
      emitPortfolioToast('Project synced.', 'success');
    } else if (result.error === 'builtin') {
      emitPortfolioToast("Sample projects can't be synced.", 'error');
    } else {
      emitPortfolioToast("Couldn't sync — it'll retry automatically.", 'error');
    }
  };

  // Selecting a project closes the mobile list sheet (and, by populating
  // `selected`, opens the right-rail bottom sheet on mobile).
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setListOpen(false);
  };

  return (
    <div className={css.shell}>
      {/* Mobile-only "Projects" trigger for the slide-up list (§2.1). */}
      <button
        type="button"
        className={css.mobileListToggle}
        onClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
      >
        <List size={16} aria-hidden />
        Projects
      </button>

      <div className={css.zones}>
        <aside className={`${css.listZone} ${listOpen ? css.listZoneOpen : ''}`}>
          <PortfolioProjectList
            projects={projects}
            selectedId={selectedId}
            onSelect={handleSelect}
            onNewProject={() => navigate({ to: '/v3/project/wizard' })}
            stageById={stageById}
            canCompare={canCompare}
            onSyncProject={handleSyncProject}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        </aside>

        <div className={css.mapZone}>
          <PortfolioMap
            projects={projects}
            selectedId={selectedId}
            onSelect={handleSelect}
            stageById={stageById}
            relationships={relationships}
            onAddRelationship={handleAddRelationship}
            pois={pois}
            poiFlows={poiFlows}
            onAddPoi={addPoiHandler}
            onAddPoiFlow={addPoiFlowHandler}
          />
          <PortfolioToast />
        </div>

        {/* Right at-a-glance rail (§2.4) — read-only briefing for the selected
            project; renders its own empty state when none. On mobile this aside
            becomes a bottom sheet that slides up only while a project is
            selected (`railZoneOpen`). */}
        <aside className={`${css.railZone} ${selected ? css.railZoneOpen : ''}`}>
          <button
            type="button"
            className={css.sheetClose}
            onClick={() => setSelectedId(null)}
            aria-label="Close project details"
          >
            <X size={16} aria-hidden />
          </button>
          <PortfolioAtAGlanceRail briefing={briefing} />
        </aside>

        {/* Stage rail (§2.5) — Plan/Act/Observe navigation for the selected
            project. Occupies the bottom-centre grid cell between the side
            columns on desktop; collapses to a full-width bottom bar at narrow
            widths where the side zones become slide-up sheets. */}
        <div className={css.stageZone}>
          <PortfolioStageRail briefing={briefing} />
        </div>
      </div>
    </div>
  );
}
