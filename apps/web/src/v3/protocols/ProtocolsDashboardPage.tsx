// ProtocolsDashboardPage - the Protocol Dashboard route, Active view (OLOS
// Protocol System slice, Plan Phase D1). A peer of Plan / Act / Observe.
//
// Active view = every standard template this project has put into the `active`
// lifecycle (derived by useProtocolLibrary, the same source the Plan protocol
// surface and the Act rail consume), each rendered with the shared
// ProtocolLibraryCard plus its severity-tier badge. Below, a "Recent
// activations" strip lists the immutable ProtocolActivation history
// (useProtocolActivations) newest-first.
//
// Only the Active view ships in this slice; Overview / History / Authoring are
// deferred. Project type is read exactly as ProtocolApprovalOverlay does:
// useProjectStore -> project metadata.projectTypeRecord.

import { useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { resolveSeverityTier, TIER_VISUAL } from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useProtocolActivations } from '../../store/protocolStore.js';
import { useProtocolLibrary } from '../plan/strata/useProtocolLibrary.js';
import ProtocolLibraryCard from '../plan/strata/ProtocolLibraryCard.js';
import TierBadge from './TierBadge.js';
import { C, F } from '../plan/spine/tokens.js';

export default function ProtocolsDashboardPage() {
  // strict:false so the page can read the shared $projectId param without being
  // bound to one route id (mirrors ActTierShell).
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? '';

  // Project type -> enterprise filter, exactly as ProtocolApprovalOverlay reads it.
  const typeRecord = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];

  const { templates, statusByTemplate, outputs } = useProtocolLibrary(
    projectId,
    primaryTypeId,
    secondaryTypeIds,
  );
  const activations = useProtocolActivations(projectId);

  const activeTemplates = useMemo(
    () => templates.filter((t) => statusByTemplate[t.id] === 'active'),
    [templates, statusByTemplate],
  );

  return (
    <div
      className="olos-spine-root"
      data-testid="protocols-dashboard"
      style={{
        height: '100%',
        overflowY: 'auto',
        background: C.bg,
        color: C.textPrimary,
        fontFamily: F.sans,
        padding: '24px 28px 40px',
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: F.serif,
            fontSize: 24,
            fontWeight: 600,
            color: C.textPrimary,
            margin: 0,
          }}
        >
          Protocols
        </h1>
        <p
          style={{
            fontSize: 13,
            color: C.textSecondary,
            margin: '4px 0 0',
          }}
        >
          Active standing protocols for this project, and the most recent
          recognised activations.
        </p>
      </header>

      {/* Active view */}
      <section aria-label="Active protocols" style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.textTertiary,
            margin: '0 0 12px',
          }}
        >
          Active ({activeTemplates.length})
        </h2>

        {activeTemplates.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textTertiary, margin: 0 }}>
            No active protocols yet. Approve protocols on the Plan Integration
            objective to populate this view.
          </p>
        ) : (
          activeTemplates.map((t) => (
            <div key={t.id} style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 6 }}>
                <TierBadge tier={resolveSeverityTier(t)} />
              </div>
              <ProtocolLibraryCard
                template={t}
                status={statusByTemplate[t.id]}
                outputs={outputs}
              />
            </div>
          ))
        )}
      </section>

      {/* Recent activations strip */}
      <section aria-label="Recent activations">
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.textTertiary,
            margin: '0 0 12px',
          }}
        >
          Recent activations
        </h2>

        {activations.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textTertiary, margin: 0 }}>
            No activations recorded yet. Recognising a protocol trigger in the
            field will record one here.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {activations.map((a) => {
              const v = TIER_VISUAL[a.severityTier];
              return (
                <li
                  key={a.id}
                  data-testid="protocol-activation-row"
                  data-activation-status={a.confirmationStatus}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg2,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: v.fg,
                    }}
                  >
                    {v.icon}
                  </span>
                  <span
                    style={{
                      flex: '1 1 auto',
                      minWidth: 0,
                      fontSize: 13,
                      color: C.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.recipeSnapshot.name}
                  </span>
                  <span
                    style={{
                      flex: '0 0 auto',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textSecondary,
                    }}
                  >
                    {a.confirmationStatus}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
