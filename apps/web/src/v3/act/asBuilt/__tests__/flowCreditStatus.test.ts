/**
 * flowCreditStatus - pure unit tests for the three-state closed-loop credit
 * derivation surfaced in ActFlowConnectorPopover. No store / no render.
 */

import { describe, it, expect } from 'vitest';
import {
  flowCreditState,
  FLOW_CREDIT_COPY,
} from '../flowCreditStatus.js';

describe('flowCreditState', () => {
  it('returns "earned" when both endpoints are structured', () => {
    expect(
      flowCreditState({
        sourceStructured: true,
        sinkStructured: true,
        hasFeatureOptions: true,
      }),
    ).toBe('earned');
    // "earned" does not depend on hasFeatureOptions once both are structured.
    expect(
      flowCreditState({
        sourceStructured: true,
        sinkStructured: true,
        hasFeatureOptions: false,
      }),
    ).toBe('earned');
  });

  it('returns "prompt" when not both structured but options exist', () => {
    // Neither pinned.
    expect(
      flowCreditState({
        sourceStructured: false,
        sinkStructured: false,
        hasFeatureOptions: true,
      }),
    ).toBe('prompt');
    // Boundary: exactly one pinned, the other free text.
    expect(
      flowCreditState({
        sourceStructured: true,
        sinkStructured: false,
        hasFeatureOptions: true,
      }),
    ).toBe('prompt');
    expect(
      flowCreditState({
        sourceStructured: false,
        sinkStructured: true,
        hasFeatureOptions: true,
      }),
    ).toBe('prompt');
  });

  it('returns "no-features" when not both structured and no options exist', () => {
    expect(
      flowCreditState({
        sourceStructured: false,
        sinkStructured: false,
        hasFeatureOptions: false,
      }),
    ).toBe('no-features');
    // Boundary: one pinned but no options to pin the other -> still no-features.
    expect(
      flowCreditState({
        sourceStructured: true,
        sinkStructured: false,
        hasFeatureOptions: false,
      }),
    ).toBe('no-features');
  });

  it('has copy for every state', () => {
    expect(FLOW_CREDIT_COPY.earned).toMatch(/closed-loop credit/i);
    expect(FLOW_CREDIT_COPY.prompt).toMatch(/pin both/i);
    expect(FLOW_CREDIT_COPY['no-features']).toMatch(/no mapped features/i);
  });
});
