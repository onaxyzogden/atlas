/**
 * CompareCandidatesPage — §1 "Compare candidate properties side by side".
 *
 * Renders 2+ projects side-by-side as a metric matrix. URL shape:
 *   /projects/compare?ids=a,b,c
 *
 * Source priority is **local store first**, then API:
 *   - For ids that resolve to a `LocalProject` (matched by `id` or
 *     `serverId`), we read metadata + entity counts straight from the
 *     zustand stores. This is the common case in dev / offline use.
 *   - For ids that don't resolve locally, we fall back to the API
 *     `projects.get` + `projects.assessment` endpoints. If both fail,
 *     the column shows "—" with an inline error note.
 *
 * Comparable axes (heuristic, no new shared math):
 *   1. Identity     — name, status, project type, location
 *   2. Land basis   — acreage, boundary set?
 *   3. Design load  — counts of structures, zones, paths, utilities,
 *                     crops, paddocks, phases (rolled up from each
 *                     project-scoped store)
 *   4. Server scores — overall / suitability / buildability / water
 *                     resilience / ag potential (when API responds)
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearch, Link } from '@tanstack/react-router';
import { api } from '../../../lib/apiClient.js';
import { useProjectStore, type LocalProject } from '../../../store/projectStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import css from './CompareCandidatesPage.module.css';

interface AssessmentRow {
  suitabilityScore: number | null;
  buildabilityScore: number | null;
  waterResilienceScore: number | null;
  agPotentialScore: number | null;
  overallScore: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error: string | null;
}

interface ResolvedProject {
  /** Source id (the value passed in the URL ?ids= list). */
  sourceId: string;
  /** Local project object if we matched one in the store. */
  local: LocalProject | null;
  /** API summary if local lookup failed and the API responded. */
  remoteName: string | null;
  /** Per-project entity counts derived from local stores. */
  counts: {
    structures: number;
    zones: number;
    paths: number;
    utilities: number;
    crops: number;
    paddocks: number;
    phases: number;
  };
  assessment: AssessmentRow | null;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-Enterprise',
  moontrance: 'OGDEN Template',
};

function fmtScore(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(1);
}

function fmtAcreage(ac: number | null | undefined): string {
  if (ac === null || ac === undefined || Number.isNaN(ac)) return '—';
  return `${ac.toFixed(1)} ac`;
}

function fmtCount(n: number): string {
  return n === 0 ? '—' : n.toLocaleString();
}

export default function CompareCandidatesPage() {
  const search = useSearch({ strict: false }) as { ids?: string };
  const ids = useMemo(
    () =>
      (search.ids ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [search.ids],
  );

  const projects = useProjectStore((s) => s.projects);
  const structures = useStructureStore((s) => s.structures);
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const utilities = useUtilityStore((s) => s.utilities);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const phases = usePhaseStore((s) => s.phases);

  const [remoteAssessments, setRemoteAssessments] = useState<Record<string, AssessmentRow>>({});
  const [remoteNames, setRemoteNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [usedRemoteFallback, setUsedRemoteFallback] = useState(false);

  // Resolve each id to a local project (by id or serverId). Build counts
  // synchronously from the stores so the table renders instantly even
  // before the API responds.
  const resolved: ResolvedProject[] = useMemo(() => {
    return ids.map((sourceId) => {
      const local =
        projects.find((p) => p.id === sourceId || p.serverId === sourceId) ?? null;
      const projectId = local?.id ?? sourceId;
      const counts = {
        structures: structures.filter((x) => x.projectId === projectId).length,
        zones: zones.filter((x) => x.projectId === projectId).length,
        paths: paths.filter((x) => x.projectId === projectId).length,
        utilities: utilities.filter((x) => x.projectId === projectId).length,
        crops: cropAreas.filter((x) => x.projectId === projectId).length,
        paddocks: paddocks.filter((x) => x.projectId === projectId).length,
        phases: phases.filter((x) => x.projectId === projectId).length,
      };
      return {
        sourceId,
        local,
        remoteName: remoteNames[sourceId] ?? null,
        counts,
        assessment: remoteAssessments[sourceId] ?? null,
      };
    });
  }, [
    ids,
    projects,
    structures,
    zones,
    paths,
    utilities,
    cropAreas,
    paddocks,
    phases,
    remoteAssessments,
    remoteNames,
  ]);

  // Best-effort remote enrichment. Only runs for ids that are not
  // resolvable locally (e.g. someone shared a /projects/compare?ids=...
  // link with server uuids the local store hasn't synced yet) OR for
  // any id, to fetch the server-side assessment scores when available.
  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const nextAssessments: Record<string, AssessmentRow> = {};
      const nextNames: Record<string, string> = {};
      let usedRemote = false;
      for (const id of ids) {
        const localMatch = projects.find((p) => p.id === id || p.serverId === id);
        // Only fetch summary from API when there's no local match, to
        // avoid round-trips for the common offline case.
        if (!localMatch) {
          try {
            const { data } = await api.projects.get(id);
            if (data?.name) {
              nextNames[id] = data.name;
              usedRemote = true;
            }
          } catch {
            // Inaccessible — leave name unresolved; column shows "—".
          }
        }
        // Try assessment for everyone — server-side scoring is opt-in and
        // independent of local design state.
        try {
          const { data: asmt, error } = await api.projects.assessment(id);
          if (error || !asmt) {
            nextAssessments[id] = {
              suitabilityScore: null,
              buildabilityScore: null,
              waterResilienceScore: null,
              agPotentialScore: null,
              overallScore: null,
              confidence: null,
              error: error?.message ?? null,
            };
          } else {
            const a = asmt as unknown as Record<string, number | string | null>;
            nextAssessments[id] = {
              suitabilityScore: (a.suitability_score ?? a.suitabilityScore) as number | null,
              buildabilityScore: (a.buildability_score ?? a.buildabilityScore) as number | null,
              waterResilienceScore: (a.water_resilience_score ?? a.waterResilienceScore) as number | null,
              agPotentialScore: (a.ag_potential_score ?? a.agPotentialScore) as number | null,
              overallScore: (a.overall_score ?? a.overallScore) as number | null,
              confidence: (a.confidence as AssessmentRow['confidence']) ?? null,
              error: null,
            };
            usedRemote = true;
          }
        } catch (err) {
          nextAssessments[id] = {
            suitabilityScore: null,
            buildabilityScore: null,
            waterResilienceScore: null,
            agPotentialScore: null,
            overallScore: null,
            confidence: null,
            error: err instanceof Error ? err.message : 'Fetch failed',
          };
        }
      }
      if (!cancelled) {
        setRemoteAssessments(nextAssessments);
        setRemoteNames(nextNames);
        setUsedRemoteFallback(usedRemote);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We re-run on the joined id string only — projects.length is enough
    // signal that the local store has hydrated; we don't want to re-fire
    // every time an unrelated project mutates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), projects.length]);

  if (ids.length === 0) {
    return (
      <div className={css.page}>
        <div className={css.container}>
          <Link to="/" className={css.backLink}>{'\u2190'} Back to projects</Link>
          <h1 className={css.title}>Compare Candidates</h1>
          <div className={css.empty}>
            No projects selected.
            <div className={css.emptyHint}>
              Use the project list to pick two or more candidates, or append
              <code> ?ids=a,b </code>to the URL.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={css.page}>
      <div className={css.container}>
        <Link to="/" className={css.backLink}>{'\u2190'} Back to projects</Link>
        <div className={css.header}>
          <h1 className={css.title}>Compare Candidates</h1>
          <p className={css.subtitle}>
            Side-by-side view of {resolved.length} {resolved.length === 1 ? 'project' : 'projects'}
            {loading ? ' (loading scores\u2026)' : ''}.
          </p>
        </div>

        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th className={css.thLabel}>Metric</th>
                {resolved.map((r) => {
                  const name = r.local?.name ?? r.remoteName ?? r.sourceId.slice(0, 8) + '\u2026';
                  return (
                    <th key={r.sourceId} className={css.thProject}>
                      <div className={css.projectName}>{name}</div>
                      <div className={css.projectMeta}>
                        {r.local
                          ? `${r.local.status === 'candidate' ? 'Candidate' : r.local.status}${r.local.acreage ? ` \u00b7 ${r.local.acreage.toFixed(1)} ac` : ''}`
                          : 'Server-side project'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* ─── Identity ───────────────────────────────────────── */}
              <tr className={css.sectionHeader}>
                <td colSpan={1 + resolved.length}>Identity</td>
              </tr>
              <tr>
                <td className={css.tdLabel}>Project type</td>
                {resolved.map((r) => (
                  <td key={r.sourceId} className={css.tdValue}>
                    {r.local?.projectType
                      ? (PROJECT_TYPE_LABELS[r.local.projectType] ?? r.local.projectType)
                      : <span className={css.dash}>{'\u2014'}</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={css.tdLabel}>Location</td>
                {resolved.map((r) => {
                  const loc = r.local
                    ? [r.local.provinceState, r.local.country].filter(Boolean).join(', ')
                    : '';
                  return (
                    <td key={r.sourceId} className={css.tdValue}>
                      {loc || <span className={css.dash}>{'\u2014'}</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className={css.tdLabel}>Address</td>
                {resolved.map((r) => (
                  <td key={r.sourceId} className={css.tdValue}>
                    {r.local?.address || <span className={css.dash}>{'\u2014'}</span>}
                  </td>
                ))}
              </tr>

              {/* ─── Land basis ─────────────────────────────────────── */}
              <tr className={css.sectionHeader}>
                <td colSpan={1 + resolved.length}>Land basis</td>
              </tr>
              <tr>
                <td className={css.tdLabel}>Acreage</td>
                {resolved.map((r) => (
                  <td key={r.sourceId} className={`${css.tdValue} ${css.numericalValue}`}>
                    {fmtAcreage(r.local?.acreage)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={css.tdLabel}>Boundary set</td>
                {resolved.map((r) => (
                  <td key={r.sourceId} className={css.tdValue}>
                    {r.local?.hasParcelBoundary
                      ? <span className={css.checkmark}>{'\u2713'}</span>
                      : <span className={css.dash}>{'\u2014'}</span>}
                  </td>
                ))}
              </tr>

              {/* ─── Design load (entity counts) ────────────────────── */}
              <tr className={css.sectionHeader}>
                <td colSpan={1 + resolved.length}>Design load</td>
              </tr>
              {(
                [
                  ['Structures', 'structures'],
                  ['Zones', 'zones'],
                  ['Paths', 'paths'],
                  ['Utilities', 'utilities'],
                  ['Crop areas', 'crops'],
                  ['Paddocks', 'paddocks'],
                  ['Phases', 'phases'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <td className={css.tdLabel}>{label}</td>
                  {resolved.map((r) => (
                    <td
                      key={r.sourceId}
                      className={`${css.tdValue} ${css.numericalValue}`}
                    >
                      {fmtCount(r.counts[key])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* ─── Server-side scores (when available) ───────────── */}
              <tr className={css.sectionHeader}>
                <td colSpan={1 + resolved.length}>Assessment scores (server)</td>
              </tr>
              {(
                [
                  ['Overall', 'overallScore'],
                  ['Suitability', 'suitabilityScore'],
                  ['Buildability', 'buildabilityScore'],
                  ['Water resilience', 'waterResilienceScore'],
                  ['Ag potential', 'agPotentialScore'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <td className={css.tdLabel}>{label}</td>
                  {resolved.map((r) => {
                    const v = r.assessment ? (r.assessment[key] as number | null) : null;
                    return (
                      <td
                        key={r.sourceId}
                        className={`${css.tdValue} ${css.numericalValue}`}
                      >
                        {fmtScore(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className={css.tdLabel}>Confidence</td>
                {resolved.map((r) => (
                  <td key={r.sourceId} className={css.tdValue}>
                    {r.assessment?.confidence ?? <span className={css.dash}>{'\u2014'}</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {!usedRemoteFallback && (
          <div className={css.notice}>
            Server-side assessment scores were not available for these
            projects. The comparison shown is built from local design data
            only. Sync a project (or run an assessment) to populate the
            scoring rows.
          </div>
        )}
      </div>
    </div>
  );
}
