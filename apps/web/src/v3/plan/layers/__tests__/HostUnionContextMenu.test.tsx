/**
 * @vitest-environment happy-dom
 *
 * HostUnionContextMenu — render + interaction tests. Slice M.
 *
 * Asserts:
 *   - renders the single "Open detail" item with the colocated
 *     drilldownStrings copy
 *   - clicking the item fires `onOpenDetail` then `onClose`
 *   - ARIA labelling carries the host name
 *
 * Lifecycle dismiss (ESC, document-pointerdown) lives on
 * PlanDataLayers — the menu component is strictly presentational, so
 * those handlers are exercised in the integration-level tests when
 * they exist. This unit set covers the component's contract.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HostUnionContextMenu } from '../HostUnionContextMenu.js';
import { drilldownStrings } from '../drilldownStrings.js';

describe('HostUnionContextMenu', () => {
  it('renders the Open detail item with colocated copy', () => {
    render(
      <HostUnionContextMenu
        point={{ x: 100, y: 100 }}
        hostName="North paddock host"
        onOpenDetail={() => {}}
        onClose={() => {}}
      />,
    );
    const item = screen.getByTestId('host-union-context-menu-open-detail');
    expect(item.textContent).toBe(drilldownStrings.openDetail);
  });

  it('clicking Open detail fires onOpenDetail then onClose', () => {
    const onOpenDetail = vi.fn();
    const onClose = vi.fn();
    render(
      <HostUnionContextMenu
        point={{ x: 100, y: 100 }}
        hostName="North paddock host"
        onOpenDetail={onOpenDetail}
        onClose={onClose}
      />,
    );
    fireEvent.click(
      screen.getByTestId('host-union-context-menu-open-detail'),
    );
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    // Order matters: onOpenDetail should fire before onClose so the
    // parent's drilldown-open state-write lands before the menu's
    // dismiss state-write (the menu component sequences them).
    const openOrder = onOpenDetail.mock.invocationCallOrder[0]!;
    const closeOrder = onClose.mock.invocationCallOrder[0]!;
    expect(openOrder).toBeLessThan(closeOrder);
  });

  it('exposes host name via aria-label for screen readers', () => {
    render(
      <HostUnionContextMenu
        point={{ x: 100, y: 100 }}
        hostName="North paddock host"
        onOpenDetail={() => {}}
        onClose={() => {}}
      />,
    );
    const menu = screen.getByTestId('host-union-context-menu');
    expect(menu.getAttribute('aria-label')).toContain('North paddock host');
  });
});
