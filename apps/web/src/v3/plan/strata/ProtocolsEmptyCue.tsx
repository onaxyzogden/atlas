// ProtocolsEmptyCue — the Protocols-mode placeholder for the Plan center canvas
// and right rail. It replaces the objectives-flavoured PlanReadyCue (which talks
// about water nodes / guilds / zones) in Protocols mode, where that copy is
// out of context.
//
// Two states:
//   • hasProtocols === false — the project has no type set, so the protocol
//     library resolved zero templates (e.g. the type-less Moontrance Creek demo).
//     This is the persistent state for such projects.
//   • hasProtocols === true — transient: the library has entries but none is
//     selected yet. PlanTierShell auto-selects the first protocol on entering
//     Protocols mode, so this copy flashes for at most one render.
//
// Styling mirrors PlanProtocolDetailPane's `plan-protocol-detail-empty` cue
// (italic, tertiary, sans) so the surfaces read consistently. `compact` trims the
// padding for the narrow right rail.

import { C, F } from '../spine/tokens.js';

interface Props {
  /** Whether the resolved protocol library has any templates. */
  hasProtocols: boolean;
  /** Tighter padding for the narrow right rail. */
  compact?: boolean;
}

export default function ProtocolsEmptyCue({ hasProtocols, compact = false }: Props) {
  const message = hasProtocols
    ? 'Select a protocol from the list to design its thresholds.'
    : 'This project has no project type set yet, so it has no standing protocols. Set a project type to populate the protocol library.';

  return (
    <div
      data-testid="protocols-empty-cue"
      data-has-protocols={hasProtocols}
      style={{
        padding: compact ? '16px 18px' : '24px 22px',
        fontSize: 12,
        color: C.textTertiary,
        fontFamily: F.sans,
        fontStyle: 'italic',
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}
