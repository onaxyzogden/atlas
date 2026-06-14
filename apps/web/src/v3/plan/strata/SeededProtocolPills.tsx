// SeededProtocolPills — pill strip rendered under the objective title in
// ObjectiveDetailPanel. Each pill represents a standard protocol seeded for
// this objective by the catalogue mapping layer (relationships/seededProtocols/).
// Clicking a pill navigates to Protocol mode with that protocol pre-selected
// and the objective's seeded group pinned at the top of the library.
// Renders nothing when the objective has no seedings (graceful degradation).

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { resolveSeededProtocols, type PlanStratumObjective } from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';
import { C } from '../spine/tokens.js';

interface Props {
  objective: PlanStratumObjective;
  projectId: string;
}

const TYPE_COLOR = {
  judgment: { bg: C.blueDim, text: C.blue },
  cyclical: { bg: C.tealDim, text: C.teal },
  threshold: { bg: C.amberDim, text: C.amber },
  freeform: { bg: C.bg3, text: C.textSecondary },
} as const;

const FALLBACK_COLOR = { bg: C.bg3, text: C.textSecondary };

export default function SeededProtocolPills({ objective, projectId }: Props) {
  const navigate = useNavigate();
  const typeRecord = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];

  const lib = useProtocolLibrary(projectId, primaryTypeId, secondaryTypeIds);

  const seededIds = useMemo(
    () =>
      primaryTypeId
        ? resolveSeededProtocols(objective.id, primaryTypeId, secondaryTypeIds)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objective.id, primaryTypeId, secondaryTypeIds.join(',')],
  );

  const seededTemplates = useMemo(() => {
    const byId = new Map(lib.templates.map((t) => [t.id, t]));
    return seededIds.flatMap((id) => {
      const t = byId.get(id);
      return t ? [t] : [];
    });
  }, [lib.templates, seededIds]);

  if (seededTemplates.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '8px 16px 0',
      }}
      aria-label="Seeded protocols for this objective"
    >
      {seededTemplates.map((protocol) => {
        const colors =
          (TYPE_COLOR as Record<string, { bg: string; text: string }>)[protocol.type] ??
          FALLBACK_COLOR;
        return (
          <button
            key={protocol.id}
            onClick={() =>
              navigate({
                to: '.',
                search: (prev: Record<string, unknown>) => ({
                  ...prev,
                  planMode: 'protocol',
                  fromObjective: objective.id,
                  selectProtocol: protocol.id,
                }),
              } as never)
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 12,
              border: `1px solid ${colors.text}30`,
              background: colors.bg,
              color: colors.text,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
            title={`View protocol: ${protocol.name}`}
          >
            <span
              style={{
                fontSize: 9,
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {protocol.type}
            </span>
            {protocol.name}
          </button>
        );
      })}
    </div>
  );
}
