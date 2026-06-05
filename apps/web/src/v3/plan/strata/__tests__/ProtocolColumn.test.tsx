/**
 * @vitest-environment happy-dom
 *
 * ProtocolColumn — the CENTER multi-select protocol list in Plan Protocol mode.
 * These tests assert the presentational contract the shell depends on:
 *   1. One selectable row per template across all groups.
 *   2. Clicking a row fires onToggle(templateId).
 *   3. Rows whose id is in selectedIds carry data-selected="true".
 *   4. Empty groups render the empty-state copy.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  resolveProjectProtocols,
  type DesignTension,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import ProtocolColumn from '../ProtocolColumn.js';
import { type ProtocolTierGroup } from '../useProtocolLibrary.js';

// The DesignTensionBanner (mounted when tensions are passed) renders lucide
// icons that throw in this happy-dom setup; mock them to no-ops, mirroring
// DesignTensionBanner.test.tsx.
vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
  Crosshair: () => null,
}));

// A realistic resolved set; the column is presentational and tier-agnostic, so
// the fixture just needs a stratum-labelled group of real protocols.
const TEMPLATES: readonly StandardProtocolTemplate[] = resolveProjectProtocols({
  primaryTypeId: 'silvopasture',
}).protocols.slice(0, 6);
const GROUPS: ProtocolTierGroup[] = [
  {
    tier: 'S1 · Project Foundation',
    stratumId: 's1-project-foundation',
    items: [...TEMPLATES],
  },
];

describe('ProtocolColumn', () => {
  it('renders one selectable row per template', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
      />,
    );
    const rows = screen.getAllByTestId('protocol-list-row');
    expect(rows).toHaveLength(TEMPLATES.length);
    // Each row exposes its template id and an unchecked checkbox role.
    expect(rows[0]!.getAttribute('data-template-id')).toBe(TEMPLATES[0]!.id);
    expect(rows[0]!.getAttribute('aria-checked')).toBe('false');
  });

  it('fires onToggle with the template id when a row is clicked', () => {
    const onToggle = vi.fn();
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={onToggle}
      />,
    );
    const row = screen
      .getAllByTestId('protocol-list-row')
      .find((el) => el.getAttribute('data-template-id') === TEMPLATES[1]!.id)!;
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(TEMPLATES[1]!.id);
  });

  it('marks rows in selectedIds as selected', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[TEMPLATES[0]!.id]}
        onToggle={vi.fn()}
      />,
    );
    const selected = screen
      .getAllByTestId('protocol-list-row')
      .find((el) => el.getAttribute('data-template-id') === TEMPLATES[0]!.id)!;
    expect(selected.getAttribute('data-selected')).toBe('true');
    expect(selected.getAttribute('aria-checked')).toBe('true');

    const other = screen
      .getAllByTestId('protocol-list-row')
      .find((el) => el.getAttribute('data-template-id') === TEMPLATES[1]!.id)!;
    expect(other.getAttribute('data-selected')).toBe('false');
  });

  it('renders the empty state when there are no groups', () => {
    render(
      <ProtocolColumn
        groups={[]}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.queryAllByTestId('protocol-list-row')).toHaveLength(0);
    expect(screen.getByTestId('protocol-column-empty')).toBeTruthy();
  });

  // ── Bulk select/deselect-all toggle ──
  it('does NOT render the toggle-all button when onToggleAll is omitted', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('protocol-select-all-toggle')).toBeNull();
  });

  it('reads "Select all" and fires onToggleAll when not all are selected', () => {
    const onToggleAll = vi.fn();
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[TEMPLATES[0]!.id]}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );
    const toggle = screen.getByTestId('protocol-select-all-toggle');
    expect(toggle.textContent).toBe('Select all');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('reads "Deselect all" when every visible template is selected', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={TEMPLATES.map((t) => t.id)}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const toggle = screen.getByTestId('protocol-select-all-toggle');
    expect(toggle.textContent).toBe('Deselect all');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('does NOT render the toggle-all button in the empty state', () => {
    render(
      <ProtocolColumn
        groups={[]}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('protocol-select-all-toggle')).toBeNull();
  });

  // ── Secondary-type conflict surfacing (DesignTension banner, read-only) ──
  const TENSIONS: readonly DesignTension[] = [
    {
      id: 'tension-a',
      typeA: 'homestead',
      typeB: 'silvopasture',
      resolutionStratumId: 's4-foundation-decisions',
      resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
      description: 'Spatial conflict resolved at zone allocation.',
    },
  ];

  it('does NOT render the tension banner when no tensions are passed', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('plan-design-tension-banner')).toBeNull();
  });

  it('renders a read-only tension banner when tensions are passed', () => {
    render(
      <ProtocolColumn
        groups={GROUPS}
        statusByTemplate={{}}
        selectedIds={[]}
        onToggle={vi.fn()}
        tensions={TENSIONS}
        highlightTensionIds={['tension-a']}
      />,
    );
    const banner = screen.getByTestId('plan-design-tension-banner');
    expect(banner).toBeTruthy();
    // The reconciling-stratum label is surfaced (expanded by default).
    expect(within(banner).getAllByText(/zone allocation/i).length).toBeGreaterThan(0);
    // Read-only: no per-row "Show objectives for…" navigation buttons
    // (onSelectTension omitted → rows render as static text).
    expect(
      within(banner).queryByRole('button', { name: /show objectives for/i }),
    ).toBeNull();
  });
});
