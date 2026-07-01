// @vitest-environment happy-dom
/**
 * Shell-mode accessor defaults. As of the "promote new shells as main" slice,
 * builtin samples (MTC, "351 House") are no longer pinned to the legacy shells:
 * every project — builtin or not — defaults to the new Plan/Act/Observe shells.
 * Explicit per-project values still win so the per-stage toggle keeps working
 * (the legacy shells stay reachable, honouring the no-deletion-in-revamps rule).
 */

import { describe, expect, it } from 'vitest';
import {
  getActShellMode,
  getObserveShellMode,
  getPlanShellMode,
} from '../projectStore';

describe('shell-mode defaults — new shells are main for all projects', () => {
  it('Plan: builtin and non-builtin both default to tier-shell', () => {
    expect(getPlanShellMode({ isBuiltin: true })).toBe('tier-shell');
    expect(getPlanShellMode({ isBuiltin: false })).toBe('tier-shell');
  });

  it('Act: builtin and non-builtin both default to ops-hub', () => {
    // ops-hub (the Operations Hub) is the promoted Act default; the previous
    // tier-shell default is preserved as a selectable fallback via the toggle.
    expect(getActShellMode({ isBuiltin: true })).toBe('ops-hub');
    expect(getActShellMode({ isBuiltin: false })).toBe('ops-hub');
  });

  it('Observe: builtin and non-builtin both default to dashboard', () => {
    expect(getObserveShellMode({ isBuiltin: true })).toBe('dashboard');
    expect(getObserveShellMode({ isBuiltin: false })).toBe('dashboard');
  });

  it('explicit per-project value wins over the default (toggle invariant)', () => {
    expect(
      getPlanShellMode({ isBuiltin: true, planShellMode: 'module-bar' }),
    ).toBe('module-bar');
    expect(
      getActShellMode({ isBuiltin: true, actShellMode: 'command-centre' }),
    ).toBe('command-centre');
    expect(
      getObserveShellMode({ isBuiltin: true, observeShellMode: 'module-bar' }),
    ).toBe('module-bar');
  });

  it('explicit new-shell value is also honoured', () => {
    expect(
      getPlanShellMode({ isBuiltin: false, planShellMode: 'stratum-spine' }),
    ).toBe('stratum-spine');
    expect(
      getActShellMode({ isBuiltin: false, actShellMode: 'field-action' }),
    ).toBe('field-action');
    expect(
      getActShellMode({ isBuiltin: true, actShellMode: 'tier-shell' }),
    ).toBe('tier-shell');
    expect(
      getObserveShellMode({ isBuiltin: false, observeShellMode: 'dashboard' }),
    ).toBe('dashboard');
  });
});
