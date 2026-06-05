/**
 * @vitest-environment happy-dom
 *
 * ProtocolThresholdEditor — the Plan-stage per-protocol threshold editor.
 * Rendered through a harness that mirrors PlanStratumShell's real wiring:
 * useProtocolLibrary (subscribing to the planStratumStore override slice) feeds
 * `outputsFor` into ProtocolDetailColumn, which stacks the shared card + the
 * editor under it. Proves:
 *   1. extractConditionTokens splits a condition into its distinct `[token]`s
 *      (deduped, first-seen order) and ignores bracket-free prose.
 *   2. The editor renders one input per distinct token of the selected protocol's
 *      condition (single-token + two-token cases).
 *   3. Typing a value writes setProtocolTokenOverride AND the card's IF/THEN
 *      condition re-renders with the substituted value (live).
 *   4. A protocol whose condition carries no `[token]` mounts no editor.
 *   5. Reset clears the overrides — the condition returns to its verbatim bracket.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import {
  usePlanStratumProgressStore,
  selectProjectProtocolOverrides,
} from '../../../../store/planStratumStore.js';
import { useProtocolLibrary } from '../useProtocolLibrary.js';
import ProtocolDetailColumn from '../ProtocolDetailColumn.js';
import { extractConditionTokens } from '../ProtocolThresholdEditor.js';

const PROJECT_ID = 'proj-threshold';
const PRIMARY = 'market_garden' as const;

const RESOLVED = resolveProjectProtocols({ primaryTypeId: PRIMARY }).protocols;
// Universal templates resolve for any project type.
const SINGLE = RESOLVED.find((t) => t.id === 'u-s5-water-store-low')!; // [reserve threshold]
const DOUBLE = RESOLVED.find((t) => t.id === 'u-s6-yield-shortfall')!; // [expected yield] + [review window]
// Any resolved protocol whose condition carries no bracket token.
const NO_TOKEN = RESOLVED.find((t) => !/\[[^\]]+\]/.test(t.condition))!;

/**
 * Mirrors PlanStratumShell's protocol-detail wiring: the library hook subscribes
 * to the override slice, so a setProtocolTokenOverride write re-renders this and
 * passes a fresh `outputsFor` into the column (the card substitutes live).
 */
function Harness({ templateId }: { templateId: string }) {
  const lib = useProtocolLibrary(PROJECT_ID, PRIMARY, []);
  const template = lib.templates.find((t) => t.id === templateId);
  if (!template) return null;
  return (
    <ProtocolDetailColumn
      projectId={PROJECT_ID}
      selectedTemplates={[template]}
      statusByTemplate={lib.statusByTemplate}
      outputsFor={lib.outputsFor}
    />
  );
}

function renderColumn(templateId: string) {
  return render(<Harness templateId={templateId} />);
}

function card() {
  return within(screen.getByTestId('protocol-detail-column')).getByTestId(
    'protocol-template-card',
  );
}

function resetStores(): void {
  useProtocolStore.setState({ records: [] });
  usePlanStratumProgressStore.setState({ protocolTokenOverridesByProject: {} });
}

beforeEach(() => resetStores());
afterEach(() => cleanup());

describe('extractConditionTokens', () => {
  it('returns the distinct tokens in first-seen order', () => {
    expect(
      extractConditionTokens('IF a system yield falls below [expected yield] for [review window]'),
    ).toEqual(['expected yield', 'review window']);
  });

  it('dedupes a repeated token', () => {
    expect(extractConditionTokens('IF [x] and later [x] again')).toEqual(['x']);
  });

  it('returns an empty array for bracket-free prose', () => {
    expect(extractConditionTokens('IF a phase reaches completion')).toEqual([]);
  });
});

describe('ProtocolThresholdEditor (via ProtocolDetailColumn)', () => {
  it('renders one input per distinct condition token', () => {
    renderColumn(DOUBLE.id);
    const editor = screen.getByTestId('protocol-threshold-editor');
    expect(within(editor).getByTestId('protocol-threshold-input-expected yield')).toBeTruthy();
    expect(within(editor).getByTestId('protocol-threshold-input-review window')).toBeTruthy();
  });

  it('mounts no editor for a protocol whose condition has no token', () => {
    expect(NO_TOKEN).toBeTruthy();
    renderColumn(NO_TOKEN.id);
    expect(screen.queryByTestId('protocol-threshold-editor')).toBeNull();
  });

  it('typing a value writes the override and substitutes into the card condition live', () => {
    renderColumn(SINGLE.id);

    // Before: the card shows the verbatim bracket; no override stored.
    expect(card().textContent).toContain('[reserve threshold]');

    fireEvent.change(screen.getByTestId('protocol-threshold-input-reserve threshold'), {
      target: { value: '20% of capacity' },
    });

    // Store mutated for this (project, template, token).
    expect(
      selectProjectProtocolOverrides(usePlanStratumProgressStore.getState(), PROJECT_ID)[
        SINGLE.id
      ],
    ).toEqual({ 'reserve threshold': '20% of capacity' });

    // Card condition re-rendered with the substituted value.
    expect(card().textContent).toContain('20% of capacity');
    expect(card().textContent).not.toContain('[reserve threshold]');
  });

  it('Reset clears the overrides and the condition returns to its bracket', () => {
    renderColumn(SINGLE.id);

    fireEvent.change(screen.getByTestId('protocol-threshold-input-reserve threshold'), {
      target: { value: '20% of capacity' },
    });
    expect(card().textContent).toContain('20% of capacity');

    fireEvent.click(screen.getByTestId('protocol-threshold-reset'));

    expect(
      selectProjectProtocolOverrides(usePlanStratumProgressStore.getState(), PROJECT_ID)[
        SINGLE.id
      ],
    ).toBeUndefined();
    expect(card().textContent).toContain('[reserve threshold]');
    expect(card().textContent).not.toContain('20% of capacity');
    // Reset control hides once there are no values.
    expect(screen.queryByTestId('protocol-threshold-reset')).toBeNull();
  });
});
