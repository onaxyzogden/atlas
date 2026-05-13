/**
 * NeedsYieldsAuditCard — Plan Module 8 (Principle Verification), card 4/4.
 *
 * v3 Plan-stage surface for the existing Needs & Yields dependency-graph
 * infrastructure shipped 2026-04-28 (see
 * `wiki/decisions/2026-04-28-needs-yields-dependency-graph.md`, Rec #1
 * of the permaculture-alignment review). The math, catalog, edge store,
 * and integration-score weight (0.10 of overall score) have been live
 * behind `FEATURE_RELATIONSHIPS` since that ADR; the only surface was a
 * floating bottom-right `RelationshipsRail` on the legacy MapView. This
 * card lifts the same audit into the Plan slide-up idiom used by Recs
 * #3/#4/#5/#6 so the steward sees orphan-outputs, unmet-inputs, closed
 * loops, and the integration score alongside the other principle-
 * verification readouts — *unconditionally*, since the underlying data
 * has been stable for two weeks of branch work without regressions.
 *
 * **Scholar framing (2026-04-28):** "A permaculture system's strength
 * is defined by the web of connections between its elements, where
 * waste must become food and nutrients must be cycled rather than
 * mined." Holmgren P6 — Produce no waste; P8 — Integrate rather than
 * segregate.
 *
 * Reads `useAllPlacedEntities` (structures + utilities + crop areas +
 * paddocks expanded per species) and `useRelationshipsStore.edgesFor`,
 * then calls the shared algorithms in `@ogden/shared/relationships`:
 *   - `integrationScoreFromEdges` → routed-fraction of declared outputs
 *   - `orphanOutputs` → declared outputs no edge consumes
 *   - `unmetInputs`   → declared inputs no edge supplies
 *   - `closedLoops`   → simple directed cycles (Johnson-style DFS)
 *
 * v1 scope: textual readout only. Edge editing UX is the legacy canvas
 * socket flow on MapView; v2 brings inline "connect this output" into
 * the Plan slide-up.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useAllPlacedEntities,
  type PlacedEntityView,
} from '../../../../lib/relationships/useAllPlacedEntities.js';
import { useRelationshipsStore } from '../../../../store/relationshipsStore.js';
import {
  OUTPUTS_BY_TYPE,
  INPUTS_BY_TYPE,
  orphanOutputs,
  unmetInputs,
  closedLoops,
  integrationScoreFromEdges,
  type EntityType,
  type PlacedEntity,
  type ResourceType,
} from '@ogden/shared/relationships';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const RESOURCE_LABEL: Record<ResourceType, string> = {
  manure: 'Manure',
  greywater: 'Greywater',
  compost: 'Compost',
  biomass: 'Biomass',
  seed: 'Seed',
  forage: 'Forage',
  mulch: 'Mulch',
  heat: 'Heat',
  shade: 'Shade',
  pollination: 'Pollination',
  pest_predation: 'Pest predation',
  nutrient_uptake: 'Nutrient uptake',
  surface_water: 'Surface water',
};

// Resource swatches — small coloured dots that flank a resource name in
// the orphan / unmet hints. Hues picked to read on the Atlas dark panel:
// browns/ambers for animal+fire flows, greens for soil+plant flows,
// blues for water flows, violet for pollination.
const RESOURCE_COLOR: Record<ResourceType, string> = {
  manure:         '#a16a3c',
  greywater:      '#7fb5d6',
  compost:        '#6b5234',
  biomass:        '#8a9a4a',
  seed:           '#d4b663',
  forage:         '#7fa05a',
  mulch:          '#b58a5a',
  heat:           '#d97455',
  shade:          '#5a7390',
  pollination:    '#a87bc6',
  pest_predation: '#c4422a',
  nutrient_uptake:'#4a8f5a',
  surface_water:  '#5fb0c4',
};

function ResourceSwatch({ kind }: { kind: ResourceType }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: RESOURCE_COLOR[kind],
        marginRight: 4,
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
      }}
    />
  );
}

function ResourceChip({ kind }: { kind: ResourceType }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px 1px 6px',
        marginRight: 6,
        marginBottom: 4,
        border: '1px solid rgba(232,220,200,0.18)',
        borderRadius: 999,
        background: 'rgba(232,220,200,0.04)',
        fontSize: 11,
        color: 'rgba(232,220,200,0.85)',
        whiteSpace: 'nowrap',
      }}
    >
      <ResourceSwatch kind={kind} />
      {RESOURCE_LABEL[kind]}
    </span>
  );
}

function tierForScore(score: number): 'met' | 'partial' | 'unmet' {
  if (score >= 0.66) return 'met';
  if (score >= 0.33) return 'partial';
  return 'unmet';
}

const TIER_LABEL: Record<'met' | 'partial' | 'unmet', string> = {
  met: 'WEB INTEGRATED',
  partial: 'PARTIAL',
  unmet: 'LINEAR',
};

export default function NeedsYieldsAuditCard({ project, onSwitchToMap }: Props) {
  const placed = useAllPlacedEntities();
  const edgesByProject = useRelationshipsStore((s) => s.edgesByProject);

  const entities = useMemo<PlacedEntity[]>(
    () => placed.map((p) => ({ id: p.id, type: p.type })),
    [placed],
  );

  const edges = useMemo(
    () => edgesByProject[project.id] ?? [],
    [edgesByProject, project.id],
  );

  const placedById = useMemo(() => {
    const m = new Map<string, PlacedEntityView>();
    for (const p of placed) m.set(p.id, p);
    return m;
  }, [placed]);

  const orphans = useMemo(() => orphanOutputs(entities, edges), [entities, edges]);
  const unmet = useMemo(() => unmetInputs(entities, edges), [entities, edges]);
  const loops = useMemo(() => closedLoops(entities, edges), [entities, edges]);
  const score = useMemo(
    () => integrationScoreFromEdges(entities, edges),
    [entities, edges],
  );

  const totalOutputs = useMemo(() => {
    let n = 0;
    for (const e of entities) {
      const outs = OUTPUTS_BY_TYPE[e.type as EntityType] ?? [];
      n += outs.length;
    }
    return n;
  }, [entities]);

  const totalInputs = useMemo(() => {
    let n = 0;
    for (const e of entities) {
      const ins = INPUTS_BY_TYPE[e.type as EntityType] ?? [];
      n += ins.length;
    }
    return n;
  }, [entities]);

  // Per-entity rollups for the audit list. Skip entities that declare
  // neither output nor input (passive infrastructure — yurts as shelter,
  // tool storage, lookouts) since they have nothing the audit can flag.
  interface RowAudit {
    id: string;
    name: string;
    source: PlacedEntityView['source'];
    type: string;
    orphans: ResourceType[];
    unmet: ResourceType[];
    declaredOut: number;
    declaredIn: number;
  }

  const rows = useMemo<RowAudit[]>(() => {
    const orphanByEntity = new Map<string, ResourceType[]>();
    for (const o of orphans) {
      const arr = orphanByEntity.get(o.fromId) ?? [];
      arr.push(o.fromOutput);
      orphanByEntity.set(o.fromId, arr);
    }
    const unmetByEntity = new Map<string, ResourceType[]>();
    for (const u of unmet) {
      const arr = unmetByEntity.get(u.toId) ?? [];
      arr.push(u.toInput);
      unmetByEntity.set(u.toId, arr);
    }

    const out: RowAudit[] = [];
    for (const ent of entities) {
      const declared =
        (OUTPUTS_BY_TYPE[ent.type as EntityType]?.length ?? 0) +
        (INPUTS_BY_TYPE[ent.type as EntityType]?.length ?? 0);
      if (declared === 0) continue;
      const view = placedById.get(ent.id);
      out.push({
        id: ent.id,
        name: view?.name ?? ent.id,
        source: view?.source ?? 'structure',
        type: ent.type,
        orphans: orphanByEntity.get(ent.id) ?? [],
        unmet: unmetByEntity.get(ent.id) ?? [],
        declaredOut: OUTPUTS_BY_TYPE[ent.type as EntityType]?.length ?? 0,
        declaredIn: INPUTS_BY_TYPE[ent.type as EntityType]?.length ?? 0,
      });
    }
    // Sort: anything with orphans-or-unmet first, then by name.
    out.sort((a, b) => {
      const aFlag = a.orphans.length + a.unmet.length > 0 ? 0 : 1;
      const bFlag = b.orphans.length + b.unmet.length > 0 ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [entities, orphans, unmet, placedById]);

  const flaggedCount = rows.filter(
    (r) => r.orphans.length + r.unmet.length > 0,
  ).length;
  const integratedCount = rows.length - flaggedCount;
  const tier = tierForScore(score);
  const hasInputs = entities.length > 0;

  const tierClass =
    tier === 'met'
      ? (styles.pillMet ?? '')
      : tier === 'partial'
      ? (styles.pillIncon ?? '')
      : (styles.pillUnmet ?? '');

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>
          Plan · Module 8 · Principle Verification
        </span>
        <h1 className={styles.title}>Needs &amp; Yields audit</h1>
        <p className={styles.lede}>
          Every placed element declares typical biological / structural
          flows it produces (yields) and consumes (needs). Orphan outputs
          are resources going to waste; unmet inputs are resources the
          element has to import. Routing outputs to inputs closes the
          loop — the Scholar&apos;s test of permaculture integration.
          Holmgren P6 — Produce no waste; P8 — Integrate rather than
          segregate. Edges are authored on the map canvas; this card
          summarises what the project already declares.
        </p>
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={onSwitchToMap}
            style={{
              padding: '7px 14px',
              border: '1px solid rgba(212,182,99,0.5)',
              borderRadius: 999,
              background: 'rgba(212,182,99,0.12)',
              color: 'rgba(232,220,200,0.95)',
              font: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Open map editor →
          </button>
          <span
            style={{
              marginLeft: 10,
              fontSize: 11,
              color: 'rgba(232,220,200,0.55)',
            }}
          >
            Close this panel and use the canvas socket flow to route
            outputs into inputs.
          </span>
        </div>
      </header>

      {!hasInputs && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Inputs needed</h2>
          <p className={styles.empty}>
            No placed entities for this project yet. Add structures,
            utilities, crop areas, or paddocks and their needs / yields
            will populate this audit.
          </p>
        </div>
      )}

      {hasInputs && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Site rollup</h2>
            <div className={styles.statRow}>
              <span>Placed entities</span>
              <span>{entities.length}</span>
            </div>
            <div className={styles.statRow}>
              <span>Declared outputs / inputs</span>
              <span>
                {totalOutputs} / {totalInputs}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Edges routed</span>
              <span>{edges.length}</span>
            </div>
            <div className={styles.statRow}>
              <span>Integration score</span>
              <span>
                {(score * 100).toFixed(0)}%{' '}
                <span className={`${styles.pill} ${tierClass}`}>
                  {TIER_LABEL[tier]}
                </span>
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Orphan outputs · Unmet inputs</span>
              <span>
                {orphans.length} · {unmet.length}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Closed loops</span>
              <span>
                {loops.length}{' '}
                {loops.length > 0 && (
                  <span className={`${styles.pill} ${styles.pillMet ?? ''}`}>
                    CYCLING
                  </span>
                )}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Integrated · Flagged</span>
              <span>
                {integratedCount} · {flaggedCount}
              </span>
            </div>
          </div>

          {loops.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Closed loops</h2>
              <ul className={styles.list}>
                {loops.map((cycle, i) => (
                  <li key={`loop-${i}`} className={styles.listRow}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong>Cycle of {cycle.length}</strong>
                      <div className={styles.listMeta}>
                        {cycle
                          .map((id) => placedById.get(id)?.name ?? id)
                          .join(' → ')}{' '}
                        →{' '}
                        {placedById.get(cycle[0] as string)?.name ??
                          cycle[0]}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows.length === 0 && (
            <div className={styles.section}>
              <p className={styles.empty}>
                None of the placed entities declare a tracked output or
                input yet (passive shelter / storage). Add a barn,
                compost station, crop area, paddock, or greywater system
                to start populating the audit.
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Per-entity audit</h2>
              <ul className={styles.list}>
                {rows.map((r) => {
                  const flagged = r.orphans.length + r.unmet.length > 0;
                  return (
                    <li key={r.id} className={styles.listRow}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong>{r.name}</strong>
                          <span className={styles.listMeta}>
                            {r.source} · {r.type}
                          </span>
                          <span
                            className={`${styles.pill} ${
                              flagged
                                ? (styles.pillUnmet ?? '')
                                : (styles.pillMet ?? '')
                            }`}
                          >
                            {flagged ? 'FLAGGED' : 'INTEGRATED'}
                          </span>
                        </div>
                        <div className={styles.listMeta}>
                          declares {r.declaredOut} output
                          {r.declaredOut === 1 ? '' : 's'} ·{' '}
                          {r.declaredIn} input
                          {r.declaredIn === 1 ? '' : 's'}
                        </div>
                        {r.orphans.length > 0 && (
                          <div className={styles.hint}>
                            <strong>Orphan outputs:</strong>{' '}
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
                              {r.orphans.map((r2) => (
                                <ResourceChip key={`o-${r2}`} kind={r2} />
                              ))}
                            </span>
                            <span>
                              — route to a downstream input on the map
                              canvas to close the loop.
                            </span>
                          </div>
                        )}
                        {r.unmet.length > 0 && (
                          <div className={styles.hint}>
                            <strong>Unmet inputs:</strong>{' '}
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
                              {r.unmet.map((r2) => (
                                <ResourceChip key={`u-${r2}`} kind={r2} />
                              ))}
                            </span>
                            <span>
                              — supply from an upstream output rather than
                              importing.
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
