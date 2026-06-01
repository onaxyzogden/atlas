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
import { render, screen, fireEvent } from '@testing-library/react';
import {
  templatesForEnterprises,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import ProtocolColumn from '../ProtocolColumn.js';
import { type ProtocolTierGroup } from '../useProtocolLibrary.js';

const TEMPLATES: readonly StandardProtocolTemplate[] =
  templatesForEnterprises(['sheep_beef']);
const GROUPS: ProtocolTierGroup[] = [
  { tier: 'Stratum 6 — Integration', items: [...TEMPLATES] },
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
});
