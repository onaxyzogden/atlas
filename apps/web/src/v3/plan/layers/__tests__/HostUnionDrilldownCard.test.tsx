/**
 * @vitest-environment happy-dom
 *
 * HostUnionDrilldownCard — render + interaction tests. Slice M.
 *
 * Asserts:
 *   - renders the host name in the header
 *   - one row per provided member with name + layer pill carrying
 *     `data-layer` and the inline `--pill-tint` CSS custom property
 *   - empty-members renders the colocated empty-state copy
 *   - close button fires `onClose`
 *   - "Open full audit →" fires `onOpenAudit` with the host id
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  HostUnionDrilldownCard,
  type DrilldownMemberRow,
} from '../HostUnionDrilldownCard.js';
import { drilldownStrings } from '../drilldownStrings.js';

const sampleMembers: DrilldownMemberRow[] = [
  { key: 'g1:0', name: 'Black locust', layer: 'canopy' },
  { key: 'g1:1', name: 'Hazelnut', layer: 'sub_canopy' },
  { key: 'g2:0', name: 'Comfrey', layer: 'herbaceous' },
];

describe('HostUnionDrilldownCard', () => {
  it('renders the host name in the header', () => {
    render(
      <HostUnionDrilldownCard
        point={{ x: 100, y: 100 }}
        hostId="host-1"
        hostName="North paddock host"
        members={sampleMembers}
        onClose={() => {}}
        onOpenAudit={() => {}}
      />,
    );
    expect(screen.getByText('North paddock host')).toBeTruthy();
  });

  it('renders one row per member with name + layer pill', () => {
    render(
      <HostUnionDrilldownCard
        point={{ x: 100, y: 100 }}
        hostId="host-1"
        hostName="North paddock host"
        members={sampleMembers}
        onClose={() => {}}
        onOpenAudit={() => {}}
      />,
    );
    sampleMembers.forEach((m) => {
      const row = screen.getByTestId(`host-union-drilldown-row-${m.key}`);
      expect(row.textContent).toContain(m.name);
      const pill = row.querySelector('[data-layer]');
      expect(pill).toBeTruthy();
      expect(pill?.getAttribute('data-layer')).toBe(m.layer);
    });
  });

  it('empty members list renders the empty-state copy', () => {
    render(
      <HostUnionDrilldownCard
        point={{ x: 100, y: 100 }}
        hostId="host-1"
        hostName="North paddock host"
        members={[]}
        onClose={() => {}}
        onOpenAudit={() => {}}
      />,
    );
    const empty = screen.getByTestId('host-union-drilldown-empty');
    expect(empty.textContent).toBe(drilldownStrings.emptyMembers);
  });

  it('close button fires onClose', () => {
    const onClose = vi.fn();
    render(
      <HostUnionDrilldownCard
        point={{ x: 100, y: 100 }}
        hostId="host-1"
        hostName="North paddock host"
        members={sampleMembers}
        onClose={onClose}
        onOpenAudit={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('host-union-drilldown-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Open full audit fires onOpenAudit with hostId', () => {
    const onOpenAudit = vi.fn();
    render(
      <HostUnionDrilldownCard
        point={{ x: 100, y: 100 }}
        hostId="host-42"
        hostName="North paddock host"
        members={sampleMembers}
        onClose={() => {}}
        onOpenAudit={onOpenAudit}
      />,
    );
    fireEvent.click(screen.getByTestId('host-union-drilldown-open-audit'));
    expect(onOpenAudit).toHaveBeenCalledTimes(1);
    expect(onOpenAudit).toHaveBeenCalledWith('host-42');
  });
});
