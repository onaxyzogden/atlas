/**
 * uiStore.migrateUIPersistedState — covers the 2026-04-30 one-time
 * coercion of stale `sidebarGrouping` values ('stage' / 'phase' / 'domain')
 * to the new 'stage3' default that landed with the 2026-04-29 IA restructure.
 *
 * See ADR 2026-04-30-uistore-stage3-grouping-migration.md.
 */

import { describe, it, expect } from 'vitest';
import { migrateUIPersistedState } from '../store/uiStore.js';

describe('migrateUIPersistedState', () => {
  it("coerces persisted sidebarGrouping: 'stage' to 'stage3' on fromVersion < 2", () => {
    const result = migrateUIPersistedState(
      { sidebarGrouping: 'stage', colorScheme: 'dark', sidebarOpen: true },
      1,
    );
    expect(result).toEqual({
      sidebarGrouping: 'stage3',
      colorScheme: 'dark',
      sidebarOpen: true,
    });
  });

  it("coerces persisted sidebarGrouping: 'phase' to 'stage3'", () => {
    const result = migrateUIPersistedState({ sidebarGrouping: 'phase' }, 1) as {
      sidebarGrouping: string;
    };
    expect(result.sidebarGrouping).toBe('stage3');
  });

  it("coerces persisted sidebarGrouping: 'domain' to 'stage3'", () => {
    const result = migrateUIPersistedState({ sidebarGrouping: 'domain' }, 0) as {
      sidebarGrouping: string;
    };
    expect(result.sidebarGrouping).toBe('stage3');
  });

  it("leaves already-stage3 sidebarGrouping unchanged", () => {
    const input = { sidebarGrouping: 'stage3', colorScheme: 'light' };
    const result = migrateUIPersistedState(input, 1);
    expect(result).toBe(input);
  });

  it('leaves a state without sidebarGrouping unchanged', () => {
    const input = { colorScheme: 'dark', sidebarOpen: false };
    const result = migrateUIPersistedState(input, 1);
    expect(result).toBe(input);
  });

  it('is a no-op on fromVersion >= 2 (idempotent for already-migrated browsers)', () => {
    const input = { sidebarGrouping: 'stage' };
    const result = migrateUIPersistedState(input, 2);
    expect(result).toBe(input);
  });

  it('handles null persistedState defensively', () => {
    const result = migrateUIPersistedState(null, 1);
    expect(result).toBeNull();
  });
});
