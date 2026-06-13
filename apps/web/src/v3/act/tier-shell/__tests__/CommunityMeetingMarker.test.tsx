/**
 * @vitest-environment happy-dom
 *
 * CommunityMeetingMarker — the imperative pulsing MapLibre marker at the
 * communal meeting place. Renders null; all DOM output is the marker/popup.
 *
 * `maplibre-gl` is mocked with tiny spy classes (Marker/Popup) so the marker
 * lifecycle is observable without a real GL context (impossible under
 * happy-dom). The clock is pinned so the upcoming-meeting derivation is
 * deterministic.
 *
 * Pins:
 *   - No marker when the place is undesignated OR no gatherings are upcoming.
 *   - One marker (badge = count) when a place resolves AND ≥1 gathering exists.
 *   - Clicking the marker opens a popup; its "View in work panel" button calls
 *     onOpenWork.
 */

import React, { type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { CommunityWorkInstance } from '@ogden/shared';
import type { CommunityWorkProposal } from '../../../../store/communityWorkPlanStore.js';

// Spy MapLibre — hoisted so the mock factory and the assertions share refs.
const gl = vi.hoisted(() => {
  const markers: Array<{ element: HTMLElement; added: boolean; removed: boolean }> = [];
  const popups: Array<{ dom: HTMLElement | null; removed: boolean }> = [];
  class FakeMarker {
    element: HTMLElement;
    added = false;
    removed = false;
    constructor(opts: { element: HTMLElement }) {
      this.element = opts.element;
      markers.push(this);
    }
    setLngLat() {
      return this;
    }
    addTo() {
      this.added = true;
      return this;
    }
    remove() {
      this.removed = true;
    }
  }
  class FakePopup {
    dom: HTMLElement | null = null;
    removed = false;
    constructor(_opts?: unknown) {
      popups.push(this);
    }
    setLngLat() {
      return this;
    }
    setDOMContent(el: HTMLElement) {
      this.dom = el;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      this.removed = true;
    }
  }
  return { markers, popups, FakeMarker, FakePopup };
});

vi.mock('../../../../lib/maplibre.js', () => ({
  maplibregl: { Marker: gl.FakeMarker, Popup: gl.FakePopup },
}));

import { useCommunityWorkPlanStore } from '../../../../store/communityWorkPlanStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { useCommunityMeetingPlaceStore } from '../../../../store/communityMeetingPlaceStore.js';
import CommunityMeetingMarker from '../CommunityMeetingMarker.js';

const P = 'p1';
const map = {} as unknown as ComponentProps<typeof CommunityMeetingMarker>['map'];

function meeting(over: Partial<CommunityWorkInstance> = {}): CommunityWorkProposal {
  const instance: CommunityWorkInstance = {
    key: 'cwp__governance__governance-meeting__2026-07-01',
    ruleKey: 'cwp__governance__governance-meeting',
    dueDate: '2026-07-01',
    kind: 'governance-meeting',
    title: 'Governance meeting — agreements & decisions',
    inputsHash: 'h1',
    ...over,
  };
  return {
    id: `cwp-${instance.key}`,
    projectId: P,
    instance,
    status: 'confirmed',
    confirmedWorkItemId: `cmw__${instance.key}`,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-06-13T12:00:00Z'));
  gl.markers.length = 0;
  gl.popups.length = 0;
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useCommunityMeetingPlaceStore.setState({
    placesByProject: {},
    armedProjectId: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CommunityMeetingMarker', () => {
  it('creates no marker when the place is undesignated', () => {
    useCommunityWorkPlanStore.setState({ rules: [], proposals: [meeting()] });
    render(<CommunityMeetingMarker map={map} projectId={P} onOpenWork={vi.fn()} />);
    expect(gl.markers).toHaveLength(0);
  });

  it('creates no marker when a place is set but nothing is upcoming', () => {
    useCommunityMeetingPlaceStore
      .getState()
      .setMeetingPlace(P, { kind: 'point', coordinates: [-79, 43] });
    render(<CommunityMeetingMarker map={map} projectId={P} onOpenWork={vi.fn()} />);
    expect(gl.markers).toHaveLength(0);
  });

  it('creates one pulsing marker (badge = count) when place + gatherings resolve', () => {
    useCommunityMeetingPlaceStore
      .getState()
      .setMeetingPlace(P, { kind: 'point', coordinates: [-79, 43] });
    useCommunityWorkPlanStore.setState({
      rules: [],
      proposals: [
        meeting(),
        meeting({
          key: 'cwp__commons__commons-review__2026-07-05',
          ruleKey: 'cwp__commons__commons-review',
          kind: 'commons-review',
          dueDate: '2026-07-05',
        }),
      ],
    });
    render(<CommunityMeetingMarker map={map} projectId={P} onOpenWork={vi.fn()} />);
    expect(gl.markers).toHaveLength(1);
    const m = gl.markers[0]!;
    expect(m.added).toBe(true);
    expect(m.element.className).toContain('ogden-community-meeting-marker');
    expect(m.element.textContent).toBe('2');
  });

  it('clicking the marker opens a popup whose action calls onOpenWork', () => {
    const onOpenWork = vi.fn();
    useCommunityMeetingPlaceStore
      .getState()
      .setMeetingPlace(P, { kind: 'point', coordinates: [-79, 43] });
    useCommunityWorkPlanStore.setState({ rules: [], proposals: [meeting()] });
    render(
      <CommunityMeetingMarker map={map} projectId={P} onOpenWork={onOpenWork} />,
    );

    // Click the marker element → a popup is created with DOM content.
    fireEvent.click(gl.markers[0]!.element);
    expect(gl.popups).toHaveLength(1);
    const dom = gl.popups[0]!.dom!;
    expect(dom.textContent).toContain('1 upcoming gathering');
    expect(dom.textContent).toContain('Governance meeting');

    // The "View in work panel" button delegates to onOpenWork.
    const button = dom.querySelector('button')!;
    expect(button.textContent).toBe('View in work panel');
    fireEvent.click(button);
    expect(onOpenWork).toHaveBeenCalledTimes(1);
  });
});
