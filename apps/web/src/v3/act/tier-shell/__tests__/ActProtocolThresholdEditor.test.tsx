/**
 * @vitest-environment happy-dom
 *
 * ActProtocolThresholdEditor — the Act-stage per-protocol threshold editor.
 * Rendered through the FULL ActProtocolDetailPane so the editor + shared card are
 * wired through the real planStratumStore override slice and useProtocolLibrary's
 * `outputsFor` merge. Proves:
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
import ActProtocolDetailPane from '../ActProtocolDetailPane.js';
import { extractConditionTokens } from '../ActProtocolThresholdEditor.js';

const PROJECT_ID = 'proj-threshold';
const PRIMARY = 'market_garden' as const;

const RESOLVED = resolveProjectProtocols({ primaryTypeId: PRIMARY }).protocols;
// Universal templates resolve for any project type.
const SINGLE = RESOLVED.find((t) => t.id === 'u-s5-water-store-low')!; // [reserve threshold]
const DOUBLE = RESOLVED.find((t) => t.id === 'u-s6-yield-shortfall')!; // [expected yield] + [review window]
// Any resolved protocol whose condition carries no bracket token.
const NO_TOKEN = RESOLVED.find((t) => !/\[[^\]]+\]/.test(t.condition))!;

function renderPane(templateId: string) {
  return render(
    <ActProtocolDetailPane
      projectId={PROJECT_ID}
      primaryTypeId={PRIMARY}
      secondaryTypeIds={[]}
      templateId={templateId}
    />,
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
    expect(
      extractConditionTokens('IF [x] and later [x] again'),
    ).toEqual(['x']);
  });

  it('returns an empty array for bracket-free prose', () => {
    expect(extractConditionTokens('IF a phase reaches completion')).toEqual([]);
  });
});

describe('ActProtocolThresholdEditor (via ActProtocolDetailPane)', () => {
  it('renders one input per distinct condition token', () => {
    renderPane(DOUBLE.id);
    const editor = screen.getByTestId('act-threshold-editor');
    expect(within(editor).getByTestId('act-threshold-input-expected yield')).toBeTruthy();
    expect(within(editor).getByTestId('act-threshold-input-review window')).toBeTruthy();
  });

  it('mounts no editor for a protocol whose condition has no token', () => {
    expect(NO_TOKEN).toBeTruthy();
    renderPane(NO_TOKEN.id);
    expect(screen.queryByTestId('act-threshold-editor')).toBeNull();
  });

  it('typing a value writes the override and substitutes into the card condition live', () => {
    renderPane(SINGLE.id);
    // Scope assertions to the shared card (the editor label legitimately shows
    // the verbatim `[reserve threshold]` token, so assert against the card only).
    const card = within(screen.getByTestId('act-protocol-detail')).getByTestId(
      'protocol-template-card',
    );

    // Before: the card shows the verbatim bracket; no override stored.
    expect(card.textContent).toContain('[reserve threshold]');

    fireEvent.change(screen.getByTestId('act-threshold-input-reserve threshold'), {
      target: { value: '20% of capacity' },
    });

    // Store mutated for this (project, template, token).
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        PROJECT_ID,
      )[SINGLE.id],
    ).toEqual({ 'reserve threshold': '20% of capacity' });

    // Card condition re-rendered with the substituted value.
    const liveCard = within(screen.getByTestId('act-protocol-detail')).getByTestId(
      'protocol-template-card',
    );
    expect(liveCard.textContent).toContain('20% of capacity');
    expect(liveCard.textContent).not.toContain('[reserve threshold]');
  });

  it('Reset clears the overrides and the condition returns to its bracket', () => {
    renderPane(SINGLE.id);

    fireEvent.change(screen.getByTestId('act-threshold-input-reserve threshold'), {
      target: { value: '20% of capacity' },
    });
    expect(
      within(screen.getByTestId('act-protocol-detail')).getByTestId(
        'protocol-template-card',
      ).textContent,
    ).toContain('20% of capacity');

    fireEvent.click(screen.getByTestId('act-threshold-reset'));

    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        PROJECT_ID,
      )[SINGLE.id],
    ).toBeUndefined();
    const liveCard = within(screen.getByTestId('act-protocol-detail')).getByTestId(
      'protocol-template-card',
    );
    expect(liveCard.textContent).toContain('[reserve threshold]');
    expect(liveCard.textContent).not.toContain('20% of capacity');
    // Reset control hides once there are no values.
    expect(screen.queryByTestId('act-threshold-reset')).toBeNull();
  });
});
