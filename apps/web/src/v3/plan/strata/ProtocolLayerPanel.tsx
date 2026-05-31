// ProtocolLayerPanel — the live, store-backed Protocol Layer right pane for the
// Plan stratum shell (Plan Spine re-skin Phase 2). It is the production analogue
// of the gallery prototype's spine/ProtocolModePanel.tsx, but every byte of data
// is REAL:
//
//   - Templates come from the shared catalogue via
//     `templatesForEnterprises(enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds))`
//     — NOT the prototype's `mockProtocols.ts` / fabricated `APPROVED_TIER_OUTPUTS`.
//   - Grouping is by each template's real `tierAuthored` string (today every
//     standard template is authored at "Stratum 6 — Integration", so there is one
//     group; the panel renders however many tiers the catalogue actually carries
//     without inventing per-stratum protocols).
//   - Lifecycle status is overlaid from `protocolStore.records` for THIS project.
//
// Read-only in v1: there is no production §10.1 "approve objective → instantiate"
// trigger yet, so the panel reflects whatever `protocolStore` state exists
// (active / triggered / suspended) and otherwise shows templates as
// not-yet-activated standard templates. The §4.1 confirmation flow and Edit-First
// token authoring are deferred — bracket tokens render VERBATIM (`outputs={{}}`).
//
// Zustand v5 hazard: we select the reference-stable `records` array and derive the
// per-project status map in `useMemo`. We never pass an inline `.filter()`-returning
// selector to `useProtocolStore` (that would mint a fresh array each render and
// drive an infinite update loop — see protocolStore's useTriggeredProtocols note).

import { useMemo } from 'react';
import {
  enterprisesForProjectTypes,
  templatesForEnterprises,
  type ProjectTypeId,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import {
  useProtocolStore,
  type ActivatedProtocolRecord,
} from '../../../store/protocolStore.js';
import { C, F, CA } from '../spine/tokens.js';
import { TypeBadge } from '../spine/protocolTypeStyle.js';
import AutoFilledCondition from '../spine/AutoFilledCondition.js';

type RecordStatus = ActivatedProtocolRecord['status'];

interface Props {
  projectId: string;
  /** Persisted project-type record primary (null for MTC / null-type projects). */
  primaryTypeId: ProjectTypeId | null;
  /** Persisted secondary type layers (drives enterprise derivation alongside primary). */
  secondaryTypeIds: readonly ProjectTypeId[];
}

/** Lifecycle label + accent for a template, from its protocolStore record (if any). */
function statusMeta(status: RecordStatus | undefined): {
  label: string;
  color: string;
  dot: boolean;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: C.green, dot: true };
    case 'triggered':
      return { label: 'Triggered', color: C.amber, dot: true };
    case 'suspended':
      return { label: 'Suspended', color: C.textTertiary, dot: false };
    default:
      return { label: 'Standard template', color: C.textTertiary, dot: false };
  }
}

function ProtocolLibraryCard({
  template,
  status,
}: {
  template: StandardProtocolTemplate;
  status: RecordStatus | undefined;
}) {
  const meta = statusMeta(status);
  return (
    <div
      data-testid="protocol-template-card"
      data-template-id={template.id}
      data-protocol-status={status ?? 'none'}
      style={{
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bg2,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header: name + type badge */}
      <div style={{ padding: '13px 16px 11px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: F.sans,
              fontWeight: 500,
              color: C.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {template.name}
          </span>
          <TypeBadge type={template.type} />
        </div>

        {/* IF → THEN. Bracket tokens render verbatim (no steward outputs in v1). */}
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.amber,
                fontFamily: F.mono,
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              IF
            </span>
            <AutoFilledCondition condition={template.condition} outputs={{}} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.green,
                fontFamily: F.mono,
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              THEN
            </span>
            <span
              style={{
                fontSize: 11,
                color: C.textSecondary,
                fontFamily: F.sans,
                lineHeight: 1.5,
              }}
            >
              {template.response}
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div
          style={{
            fontSize: 11,
            color: C.textSecondary,
            fontFamily: F.sans,
            fontStyle: 'italic',
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          {template.rationale}
        </div>
      </div>

      {/* Feeds + lifecycle-status footer */}
      <div
        style={{
          background: C.bg3,
          borderTop: `1px solid ${C.border}`,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {template.feeds.map((f) => (
            <span
              key={f}
              style={{
                background: C.tealDim,
                border: `1px solid ${CA('teal', 0.33)}`,
                borderRadius: 10,
                padding: '2px 9px',
                fontSize: 10,
                color: C.teal,
                fontFamily: F.sans,
                fontWeight: 500,
              }}
            >
              {f}
            </span>
          ))}
        </div>
        <span
          style={{
            fontSize: 9,
            color: meta.color,
            fontFamily: F.sans,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {meta.dot && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: meta.color,
                display: 'inline-block',
              }}
            />
          )}
          {meta.label}
        </span>
      </div>
    </div>
  );
}

export default function ProtocolLayerPanel({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
}: Props) {
  // Enterprise-filtered standard templates (spec 4.3). Memoised on the
  // project-type identity so the pure filter only re-runs when the project's
  // types actually change. `secondaryKey` collapses the array to a stable
  // primitive so a fresh `secondaryTypeIds` array reference per render does not
  // recompute or, worse, churn downstream memos.
  const secondaryKey = secondaryTypeIds.join(',');
  const templates = useMemo<readonly StandardProtocolTemplate[]>(() => {
    if (!primaryTypeId) return [];
    return templatesForEnterprises(
      enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds),
    );
    // secondaryTypeIds is captured via secondaryKey (stable primitive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTypeId, secondaryKey]);

  // Reference-stable selector + useMemo (NEVER an inline `.filter()` selector —
  // Zustand v5 infinite-loop hazard). Build a templateId → status map for THIS
  // project so each card reflects its real lifecycle state.
  const records = useProtocolStore((s) => s.records);
  const statusByTemplate = useMemo<Record<string, RecordStatus>>(() => {
    const map: Record<string, RecordStatus> = {};
    for (const r of records) {
      if (r.projectId === projectId) map[r.templateId] = r.status;
    }
    return map;
  }, [records, projectId]);

  // Group by the template's real `tierAuthored` string, preserving first-seen
  // (catalogue) order. No per-stratum invention: one group per distinct tier the
  // catalogue actually authors.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byTier = new Map<string, StandardProtocolTemplate[]>();
    for (const t of templates) {
      // `tierAuthored` is optional in the schema; a template that omits it still
      // groups under a sensible default rather than dropping out of the list.
      const tier = t.tierAuthored ?? 'Standard protocols';
      const bucket = byTier.get(tier);
      if (bucket) {
        bucket.push(t);
      } else {
        byTier.set(tier, [t]);
        order.push(tier);
      }
    }
    return order.map((tier) => ({ tier, items: byTier.get(tier)! }));
  }, [templates]);

  const activeCount = useMemo(
    () =>
      templates.filter((t) => statusByTemplate[t.id] === 'active').length,
    [templates, statusByTemplate],
  );

  return (
    <div
      data-testid="protocol-layer-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Protocol Layer
          </span>
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {activeCount > 0 ? ` · ${activeCount} active` : ''}
          </span>
        </div>
        <div
          style={{
            fontSize: 19,
            fontFamily: F.sans,
            fontWeight: 400,
            color: C.textPrimary,
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          Standing operational logic
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.textSecondary,
            fontFamily: F.sans,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          Conditional rules the land responds to — derived from design decisions,
          executed as Act tasks. Read-only preview.
        </div>
      </div>

      {/* Enterprise-scope note */}
      <div
        style={{
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.amber,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans }}>
          {templates.length > 0
            ? 'Enterprise-filtered for livestock (no poultry — Pest Diversion hidden)'
            : 'No livestock enterprise — no animal protocols apply'}
        </span>
      </div>

      {/* Scrollable library */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 80px' }}>
        {templates.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontStyle: 'italic',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            No animal protocol templates — this project has no livestock enterprise.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.tier} style={{ marginBottom: 18 }}>
              {/* Tier section header — protocols grouped by real `tierAuthored`. */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  data-testid="protocol-tier-heading"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textSecondary,
                    fontFamily: F.sans,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.tier}
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span
                  style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}
                >
                  {g.items.length}
                </span>
              </div>
              {g.items.map((t) => (
                <ProtocolLibraryCard
                  key={t.id}
                  template={t}
                  status={statusByTemplate[t.id]}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
