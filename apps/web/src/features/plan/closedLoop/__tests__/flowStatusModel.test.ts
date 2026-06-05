/**
 * @vitest-environment happy-dom
 *
 * flowStatusModel - pure unit tests for the MaterialFlow design-intent
 * resolvers (operationalStatus default, dash lookup, cadence label, month
 * membership). No store mutation / no render.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveOperationalStatus,
  dashForStatus,
  dashForFlow,
  cadenceLabel,
  flowIsActiveInMonth,
} from '../flowStatusModel.js';

describe('resolveOperationalStatus', () => {
  it('defaults undefined to "active" (legacy back-compat)', () => {
    expect(resolveOperationalStatus({})).toBe('active');
    expect(resolveOperationalStatus({ operationalStatus: undefined })).toBe('active');
  });

  it('passes an explicit status through', () => {
    expect(resolveOperationalStatus({ operationalStatus: 'at-risk' })).toBe('at-risk');
    expect(resolveOperationalStatus({ operationalStatus: 'suspended' })).toBe('suspended');
  });
});

describe('dashForStatus / dashForFlow', () => {
  it('maps active to a solid line (undefined dash)', () => {
    expect(dashForStatus('active')).toBeUndefined();
  });

  it('maps the degraded statuses to a non-empty dasharray', () => {
    expect(dashForStatus('seasonally-dormant')).toBeTruthy();
    expect(dashForStatus('at-risk')).toBeTruthy();
    expect(dashForStatus('suspended')).toBeTruthy();
  });

  it('dashForFlow defaults an undefined status to the active (solid) dash', () => {
    expect(dashForFlow({})).toBeUndefined();
    expect(dashForFlow({ operationalStatus: 'at-risk' })).toBe(dashForStatus('at-risk'));
  });
});

describe('cadenceLabel', () => {
  it('returns "Not set" for undefined / null', () => {
    expect(cadenceLabel(undefined)).toBe('Not set');
    expect(cadenceLabel(null)).toBe('Not set');
  });

  it('labels a known cadence', () => {
    expect(cadenceLabel('weekly')).toBe('Weekly');
    expect(cadenceLabel('rotation-based')).toBe('Rotation-based');
  });
});

describe('flowIsActiveInMonth', () => {
  it('treats a flow with no activeMonths as active all year', () => {
    expect(flowIsActiveInMonth({}, 1)).toBe(true);
    expect(flowIsActiveInMonth({ activeMonths: [] }, 7)).toBe(true);
  });

  it('respects an explicit activeMonths set', () => {
    expect(flowIsActiveInMonth({ activeMonths: [4, 5, 6] }, 5)).toBe(true);
    expect(flowIsActiveInMonth({ activeMonths: [4, 5, 6] }, 11)).toBe(false);
  });
});
