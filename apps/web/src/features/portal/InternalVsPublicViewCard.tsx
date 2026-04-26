/**
 * §20 InternalVsPublicViewCard — side-by-side preview of how the same
 * project surfaces to two audiences:
 *
 *   - **Internal** (steward / designer / reviewer): full state including
 *     internal notes, parcel id, address, owner/zoning/access/water-rights
 *     notes, per-entity rows by type, AI-DRAFT badge mentions, and
 *     completeness score.
 *   - **Public** (stakeholder / visitor / community member): scrubbed —
 *     vision + description only, approximate acreage, entity rollup as
 *     aggregate counts, address replaced with "general region", no
 *     internal notes, no AI-DRAFT badges (they look unfinished), no
 *     completeness score.
 *
 * The card itself is the "before-publish preview" — the steward sees
 * exactly what the public-portal share link will and won't carry. A
 * redaction-rules list at the bottom names every filter applied so the
 * decision is auditable rather than implicit.
 *
 * Closes manifest §20 `internal-vs-public-views` (P3) planned -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import css from './InternalVsPublicViewCard.module.css';

interface Props {
  project: LocalProject;
}

type Audience = 'internal' | 'public';

interface RedactionRule {
  field: string;
  rule: string;
}

const REDACTION_RULES: RedactionRule[] = [
  { field: 'Address & parcel id', rule: 'collapsed to country / state only' },
  { field: 'Owner / zoning / access / water-rights notes', rule: 'hidden entirely' },
  { field: 'Per-entity rows', rule: 'aggregated to family-level counts' },
  { field: 'Acreage', rule: 'rounded to nearest 5 ac' },
  { field: 'Data completeness score', rule: 'hidden (operational telemetry)' },
  { field: 'AI-DRAFT badges', rule: 'hidden (look unfinished to outside eyes)' },
  { field: 'Vision & description', rule: 'shown — these are stakeholder-facing by design' },
];

function humanizeType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function approxAcres(n: number | null): string {
  if (n == null) return '—';
  const rounded = Math.round(n / 5) * 5;
  return rounded === 0 ? '< 5 ac' : `~${rounded} ac`;
}

function regionLabel(p: LocalProject): string {
  const parts: string[] = [];
  if (p.provinceState) parts.push(p.provinceState);
  if (p.country) parts.push(p.country);
  return parts.length > 0 ? parts.join(', ') : 'Region undisclosed';
}

export default function InternalVsPublicViewCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const utilities = useUtilityStore((s) =>
    s.utilities.filter((u) => u.projectId === project.id),
  );
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const zones = useZoneStore((s) =>
    s.zones.filter((z) => z.projectId === project.id),
  );

  const [livePane, setLivePane] = useState<Audience>('public');

  const counts = useMemo(() => {
    const structureTypes = new Map<string, number>();
    structures.forEach((s) => {
      const t = humanizeType(String(s.type ?? 'other'));
      structureTypes.set(t, (structureTypes.get(t) ?? 0) + 1);
    });
    const utilityTypes = new Map<string, number>();
    utilities.forEach((u) => {
      const t = humanizeType(String(u.type ?? 'other'));
      utilityTypes.set(t, (utilityTypes.get(t) ?? 0) + 1);
    });
    return {
      structures: structures.length,
      utilities: utilities.length,
      crops: cropAreas.length,
      paddocks: paddocks.length,
      zones: zones.length,
      structureTypes,
      utilityTypes,
    };
  }, [structures, utilities, cropAreas, paddocks, zones]);

  const internalNotes = useMemo(() => {
    const notes: Array<{ label: string; text: string }> = [];
    if (project.ownerNotes) notes.push({ label: 'Owner notes', text: project.ownerNotes });
    if (project.zoningNotes) notes.push({ label: 'Zoning notes', text: project.zoningNotes });
    if (project.accessNotes) notes.push({ label: 'Access notes', text: project.accessNotes });
    if (project.waterRightsNotes)
      notes.push({ label: 'Water rights', text: project.waterRightsNotes });
    return notes;
  }, [project]);

  const totalEntities =
    counts.structures + counts.utilities + counts.crops + counts.paddocks + counts.zones;

  return (
    <section className={css.card} aria-label="Internal vs public view preview">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Internal vs public view preview</h3>
          <p className={css.cardHint}>
            Side-by-side preview of how this project will surface to a
            steward inside the workspace versus a stakeholder following a
            public portal link. Use this <em>before</em> publishing a share
            link so you know exactly what leaves the workspace.
          </p>
        </div>
        <div className={css.toggleGroup}>
          <button
            type="button"
            className={`${css.toggleBtn} ${livePane === 'internal' ? css.toggleActive : ''}`}
            onClick={() => setLivePane('internal')}
          >
            Live preview: internal
          </button>
          <button
            type="button"
            className={`${css.toggleBtn} ${livePane === 'public' ? css.toggleActive : ''}`}
            onClick={() => setLivePane('public')}
          >
            Live preview: public
          </button>
        </div>
      </header>

      <div className={css.grid}>
        {/* INTERNAL PANE */}
        <div
          className={`${css.pane} ${css.pane_internal} ${
            livePane === 'internal' ? css.paneLive : ''
          }`}
        >
          <div className={css.paneHead}>
            <span className={css.paneLabel}>Internal</span>
            <span className={css.paneAudience}>steward / designer / reviewer</span>
          </div>

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>Project</span>
            <span className={css.fieldValue}>{project.name || 'Untitled project'}</span>
          </div>

          {(project.address || project.parcelId) && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Location</span>
              <span className={css.fieldValue}>
                {project.address ?? '—'}
                {project.parcelId && (
                  <span className={css.fieldDim}>
                    {' '}
                    &middot; parcel {project.parcelId}
                  </span>
                )}
              </span>
            </div>
          )}

          {project.acreage != null && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Acreage</span>
              <span className={css.fieldValue}>{project.acreage.toFixed(2)} ac</span>
            </div>
          )}

          {project.projectType && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Project type</span>
              <span className={css.fieldValue}>{humanizeType(project.projectType)}</span>
            </div>
          )}

          {project.visionStatement && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Vision</span>
              <span className={css.fieldText}>{project.visionStatement}</span>
            </div>
          )}

          {project.description && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Description</span>
              <span className={css.fieldText}>{project.description}</span>
            </div>
          )}

          {internalNotes.length > 0 && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Internal notes</span>
              <ul className={css.notesList}>
                {internalNotes.map((n) => (
                  <li key={n.label} className={css.noteItem}>
                    <span className={css.noteLabel}>{n.label}:</span>{' '}
                    <span className={css.noteText}>{n.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>Placed entities ({totalEntities})</span>
            <ul className={css.entityList}>
              {counts.structures > 0 && (
                <li className={css.entityItem}>
                  <span className={css.entityCount}>{counts.structures}</span>
                  <span className={css.entityLabel}>
                    Structure{counts.structures === 1 ? '' : 's'}{' '}
                    <span className={css.entityBreakdown}>
                      ({Array.from(counts.structureTypes.entries())
                        .map(([t, n]) => `${n} ${t}`)
                        .join(', ')})
                    </span>
                  </span>
                </li>
              )}
              {counts.utilities > 0 && (
                <li className={css.entityItem}>
                  <span className={css.entityCount}>{counts.utilities}</span>
                  <span className={css.entityLabel}>
                    {counts.utilities === 1 ? 'Utility' : 'Utilities'}{' '}
                    <span className={css.entityBreakdown}>
                      ({Array.from(counts.utilityTypes.entries())
                        .map(([t, n]) => `${n} ${t}`)
                        .join(', ')})
                    </span>
                  </span>
                </li>
              )}
              {counts.paddocks > 0 && (
                <li className={css.entityItem}>
                  <span className={css.entityCount}>{counts.paddocks}</span>
                  <span className={css.entityLabel}>
                    Paddock{counts.paddocks === 1 ? '' : 's'}
                  </span>
                </li>
              )}
              {counts.crops > 0 && (
                <li className={css.entityItem}>
                  <span className={css.entityCount}>{counts.crops}</span>
                  <span className={css.entityLabel}>
                    Crop area{counts.crops === 1 ? '' : 's'}
                  </span>
                </li>
              )}
              {counts.zones > 0 && (
                <li className={css.entityItem}>
                  <span className={css.entityCount}>{counts.zones}</span>
                  <span className={css.entityLabel}>
                    Land zone{counts.zones === 1 ? '' : 's'}
                  </span>
                </li>
              )}
              {totalEntities === 0 && (
                <li className={`${css.entityItem} ${css.entityEmpty}`}>
                  No entities placed yet.
                </li>
              )}
            </ul>
          </div>

          {project.dataCompletenessScore != null && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Data completeness</span>
              <span className={css.fieldValue}>{project.dataCompletenessScore}/100</span>
            </div>
          )}

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>AI-DRAFT outputs</span>
            <span className={css.tagAi}>Visible</span>
          </div>
        </div>

        {/* PUBLIC PANE */}
        <div
          className={`${css.pane} ${css.pane_public} ${
            livePane === 'public' ? css.paneLive : ''
          }`}
        >
          <div className={css.paneHead}>
            <span className={css.paneLabel}>Public</span>
            <span className={css.paneAudience}>stakeholder / visitor / community</span>
          </div>

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>Project</span>
            <span className={css.fieldValue}>{project.name || 'Untitled project'}</span>
          </div>

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>Region</span>
            <span className={css.fieldValue}>{regionLabel(project)}</span>
          </div>

          {project.acreage != null && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Approx. size</span>
              <span className={css.fieldValue}>{approxAcres(project.acreage)}</span>
            </div>
          )}

          {project.visionStatement ? (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Vision</span>
              <span className={css.fieldText}>{project.visionStatement}</span>
            </div>
          ) : (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Vision</span>
              <span className={css.fieldDim}>
                Add a vision statement on the project intake page to give the
                public view a narrative anchor.
              </span>
            </div>
          )}

          {project.description && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Description</span>
              <span className={css.fieldText}>{project.description}</span>
            </div>
          )}

          {internalNotes.length > 0 && (
            <div className={css.fieldBlock}>
              <span className={css.fieldLabel}>Internal notes</span>
              <span className={css.fieldDim}>
                {internalNotes.length} internal note{internalNotes.length === 1 ? '' : 's'}{' '}
                redacted (owner / zoning / access / water rights).
              </span>
            </div>
          )}

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>Project elements</span>
            {totalEntities === 0 ? (
              <span className={css.fieldDim}>No design elements published yet.</span>
            ) : (
              <span className={css.fieldText}>
                {totalEntities} element{totalEntities === 1 ? '' : 's'} planned across{' '}
                {[
                  counts.structures > 0 && 'buildings',
                  counts.utilities > 0 && 'water & energy systems',
                  counts.paddocks > 0 && 'grazing paddocks',
                  counts.crops > 0 && 'crop & agroforestry blocks',
                  counts.zones > 0 && 'land-use zones',
                ]
                  .filter(Boolean)
                  .join(', ')}
                .
              </span>
            )}
          </div>

          <div className={css.fieldBlock}>
            <span className={css.fieldLabel}>AI-DRAFT outputs</span>
            <span className={css.tagPublic}>Hidden</span>
          </div>
        </div>
      </div>

      <div className={css.rulesBlock}>
        <h4 className={css.rulesTitle}>Redaction rules applied to public view</h4>
        <ul className={css.rulesList}>
          {REDACTION_RULES.map((r) => (
            <li key={r.field} className={css.ruleItem}>
              <span className={css.ruleField}>{r.field}:</span>{' '}
              <span className={css.ruleText}>{r.rule}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={css.footnote}>
        <em>What this is and isn&apos;t:</em> a deterministic preview of
        the redaction filter applied at the public-portal boundary. The
        actual share-link content rendering lives in the portal route; this
        card mirrors its filter rules so the steward can audit them in one
        glance before publishing.
      </p>
    </section>
  );
}
