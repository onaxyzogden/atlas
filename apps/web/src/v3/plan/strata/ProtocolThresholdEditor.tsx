// ProtocolThresholdEditor — the Plan-stage affordance for adjusting the threshold
// parameters embedded in ONE standing protocol's trigger condition.
//
// A protocol condition is free-text prose carrying bracketed `[token]`
// placeholders (e.g. "IF stored water falls below [reserve threshold]"). Those
// tokens are the adjustable thresholds, but the legacy `buildProtocolOutputs`
// path only fills the 5 S6 parameterGroup tokens, which never appear in the
// resolved per-type catalogues the protocol surfaces render — so every condition
// shows a verbatim bracket with no way to set the steward's bound.
//
// Plan is where a steward DESIGNS standing protocols, so this editor lives on the
// Plan protocol detail surface (under each selected protocol's card in
// ProtocolDetailColumn). It closes the gap with a per-(project, template, token)
// override: it extracts every distinct `[token]` from the protocol's condition
// (via the same pure `renderConditionSegments` split the card uses) and renders
// one input per token, persisting each keystroke to `planStratumStore` so the
// displayed IF/THEN (rendered through `useProtocolLibrary.outputsFor`) updates
// live. Reset drops the template's overrides, returning every token to its
// verbatim bracket. The values the steward sets here also render (read-only) in
// the Act detail pane during execution, since the override slice is per-project
// and shared across stages.
//
// NO FABRICATION: the stored value is exactly what the steward typed; a blank
// field is omitted downstream by `buildProtocolOutputs`, so the bracket renders
// verbatim. Editing a numeric/interval threshold is the steward setting their
// own approved operating bound — no Amanah/fiqh surface is touched here (the
// verbatim scopeNotes block is rendered by ProtocolLibraryCard, outside this
// editor).

import { useMemo } from 'react';
import type { StandardProtocolTemplate } from '@ogden/shared';
import { renderConditionSegments } from '../spine/autoFill.js';
import { usePlanStratumProgressStore } from '../../../store/planStratumStore.js';
import { C, F, CA } from '../spine/tokens.js';

interface Props {
  projectId: string;
  template: StandardProtocolTemplate;
}

/**
 * Extract the ordered, de-duplicated set of `[token]` names from a protocol
 * condition. Pure (no store reads) — `renderConditionSegments(condition, {})`
 * flags every bracket segment with its `token`; we keep first-seen order so the
 * inputs line up with how the steward reads the condition.
 */
export function extractConditionTokens(condition: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const seg of renderConditionSegments(condition, {})) {
    if (seg.token && !seen.has(seg.token)) {
      seen.add(seg.token);
      tokens.push(seg.token);
    }
  }
  return tokens;
}

export default function ProtocolThresholdEditor({ projectId, template }: Props) {
  const tokens = useMemo(
    () => extractConditionTokens(template.condition),
    [template.condition],
  );

  // Subscribe to THIS template's override map (token -> value). Stable selector:
  // reads the nested project/template slice or returns undefined; never derives a
  // fresh object inline (Zustand v5 loop hazard).
  const overrides = usePlanStratumProgressStore(
    (s) => s.protocolTokenOverridesByProject[projectId]?.[template.id],
  );
  const setProtocolTokenOverride = usePlanStratumProgressStore(
    (s) => s.setProtocolTokenOverride,
  );
  const clearProtocolTokenOverrides = usePlanStratumProgressStore(
    (s) => s.clearProtocolTokenOverrides,
  );

  // No bracketed tokens in this protocol's condition → nothing to adjust.
  if (tokens.length === 0) return null;

  const hasAnyValue = tokens.some((t) => (overrides?.[t] ?? '') !== '');

  return (
    <section
      data-testid="protocol-threshold-editor"
      aria-label={`Adjust thresholds for ${template.name}`}
      style={{
        margin: '12px 0 4px',
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '14px 16px 16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: F.mono,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          Adjust thresholds
        </span>
        {hasAnyValue && (
          <button
            type="button"
            data-testid="protocol-threshold-reset"
            onClick={() => clearProtocolTokenOverrides(projectId, template.id)}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: F.sans,
              padding: '3px 9px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* One input per distinct condition token */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tokens.map((token) => {
          const currentValue = overrides?.[token] ?? '';
          const inputId = `protocol-threshold-${template.id}-${token}`;
          return (
            <div
              key={token}
              style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <label
                htmlFor={inputId}
                style={{
                  fontSize: 12,
                  fontFamily: F.sans,
                  color: C.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {`[${token}]`}
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                placeholder={`[${token}]`}
                value={currentValue}
                onChange={(e) =>
                  setProtocolTokenOverride(
                    projectId,
                    template.id,
                    token,
                    e.target.value,
                  )
                }
                aria-label={`[${token}]`}
                data-testid={`protocol-threshold-input-${token}`}
                style={{
                  minWidth: 0,
                  height: 34,
                  padding: '0 10px',
                  fontSize: 13,
                  fontFamily: F.mono,
                  color: currentValue ? C.textPrimary : C.textTertiary,
                  background: C.bg3,
                  border: `1px solid ${currentValue ? CA('gold', 0.45) : C.border}`,
                  borderRadius: 5,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer hint — per-protocol scope disclosure */}
      <p
        style={{
          marginTop: 12,
          fontSize: 12,
          fontFamily: F.sans,
          color: C.textTertiary,
          lineHeight: 1.5,
        }}
      >
        Values are saved for this protocol only and substitute into its condition
        above. Leave a field blank to keep its bracketed placeholder.
      </p>
    </section>
  );
}
