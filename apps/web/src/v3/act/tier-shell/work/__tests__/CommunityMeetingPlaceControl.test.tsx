/**
 * @vitest-environment happy-dom
 *
 * CommunityMeetingPlaceControl — the steward-facing meeting-place designation
 * in the Act work panel.
 *
 * Pins:
 *   - Renders ONLY for ecovillage projects (primary or secondary type).
 *   - Structure picker lists gathering-kind features and designates one.
 *   - "Drop a pin" arms the transient placement flag; Cancel disarms.
 *   - "Clear" removes the designation (only shown when set).
 *   - Dangling-feature designation surfaces a "Structure removed" warning.
 *   - Nudges when upcoming gatherings exist but no place is set.
 *
 * The clock is pinned (vi.setSystemTime) so the upcoming-meeting derivation —
 * which reads the real `new Date()` inside the component — is deterministic.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { BuiltEnvironmentEntity, CommunityWorkInstance } from '@ogden/shared';
import type { LocalProject } from '../../../../../store/projectStore.js';
import type { CommunityWorkProposal } from '../../../../../store/communityWorkPlanStore.js';

// Stub lucide icons (MapPin) — the real components crash under happy-dom.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
      typeof value === 'function';
    stubbed[key] = isComponent
      ? Object.assign(
          React.forwardRef<SVGSVGElement, Record<string, unknown>>(
            function LucideStub(_props, ref) {
              return React.createElement('svg', {
                ref,
                'data-lucide-icon': key,
                'aria-hidden': 'true',
              });
            },
          ),
          { displayName: `LucideStub(${key})` },
        )
      : value;
  }
  return stubbed;
});

import { useProjectStore } from '../../../../../store/projectStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../../store/builtEnvironmentStoreV2.js';
import { useCommunityWorkPlanStore } from '../../../../../store/communityWorkPlanStore.js';
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useCommunityMeetingPlaceStore } from '../../../../../store/communityMeetingPlaceStore.js';
import CommunityMeetingPlaceControl from '../CommunityMeetingPlaceControl.js';

const P = 'p1';
const TESTID = 'community-meeting-place-control';

function project(over: Partial<LocalProject['metadata'] & object> = {}): LocalProject {
  return {
    id: P,
    name: 'Ogden Ecovillage Test',
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'ecovillage',
        secondaryTypeIds: [],
        tensionAcknowledgements: [],
        versionHistory: [],
        reopeningAcknowledgements: [],
      },
      ...over,
    },
    parcelBoundaryGeojson: null,
  } as unknown as LocalProject;
}

function feature(over: Partial<BuiltEnvironmentEntity> = {}): BuiltEnvironmentEntity {
  const stamp = '2026-06-01T00:00:00.000Z';
  return {
    id: 'pav-1',
    projectId: P,
    kind: 'pavilion',
    state: 'existing',
    geometry: { type: 'Point', coordinates: [-80.1, 44.3] },
    label: 'Main Pavilion',
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  } as BuiltEnvironmentEntity;
}

function confirmedMeeting(): CommunityWorkProposal {
  const instance: CommunityWorkInstance = {
    key: 'cwp__governance__governance-meeting__2026-07-01',
    ruleKey: 'cwp__governance__governance-meeting',
    dueDate: '2026-07-01',
    kind: 'governance-meeting',
    title: 'Governance meeting — agreements & decisions',
    inputsHash: 'h1',
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

const placeStore = () => useCommunityMeetingPlaceStore.getState();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-06-13T12:00:00Z'));
  useProjectStore.setState({ projects: [project()] } as never);
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useCommunityMeetingPlaceStore.setState({
    placesByProject: {},
    armedProjectId: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CommunityMeetingPlaceControl — project-type gate', () => {
  it('renders nothing for a non-ecovillage project', () => {
    useProjectStore.setState({
      projects: [
        project({
          projectTypeRecord: {
            primaryTypeId: 'homestead',
            secondaryTypeIds: [],
            tensionAcknowledgements: [],
            versionHistory: [],
            reopeningAcknowledgements: [],
          },
        }),
      ],
    } as never);
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.queryByTestId(TESTID)).toBeNull();
  });

  it('renders for an ecovillage primary type', () => {
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.getByTestId(TESTID)).toBeTruthy();
  });

  it('renders when ecovillage is only a secondary type', () => {
    useProjectStore.setState({
      projects: [
        project({
          projectTypeRecord: {
            primaryTypeId: 'homestead',
            secondaryTypeIds: ['ecovillage'],
            tensionAcknowledgements: [],
            versionHistory: [],
            reopeningAcknowledgements: [],
          },
        }),
      ],
    } as never);
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.getByTestId(TESTID)).toBeTruthy();
  });
});

describe('CommunityMeetingPlaceControl — designation', () => {
  it('shows "Not set" with no designation', () => {
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.getByTestId(TESTID).textContent).toContain('Not set');
  });

  it('lists gathering features and designates the chosen structure', () => {
    useBuiltEnvironmentStoreV2.setState({
      entities: [
        feature({ id: 'pav-1', kind: 'pavilion', label: 'Main Pavilion' }),
        feature({ id: 'barn-1', kind: 'barn', label: 'Barn' }), // not a gathering kind
      ],
    });
    render(<CommunityMeetingPlaceControl projectId={P} />);
    const select = screen.getByLabelText(
      'Choose a gathering structure as the meeting place',
    ) as HTMLSelectElement;
    // Only the gathering feature is an option (+ the placeholder).
    const optionLabels = Array.from(select.options).map((o) => o.textContent);
    expect(optionLabels).toContain('Main Pavilion');
    expect(optionLabels).not.toContain('Barn');

    fireEvent.change(select, { target: { value: 'pav-1' } });
    expect(placeStore().placesByProject[P]).toEqual({
      kind: 'feature',
      featureId: 'pav-1',
    });
  });

  it('arms "drop a pin", shows the hint, and Cancel disarms', () => {
    render(<CommunityMeetingPlaceControl projectId={P} />);
    fireEvent.click(screen.getByText('Drop a pin'));
    expect(placeStore().armedProjectId).toBe(P);
    expect(
      screen.getByText('Click the map to drop the meeting-place pin.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(placeStore().armedProjectId).toBeNull();
  });

  it('clears a set designation', () => {
    placeStore().setMeetingPlace(P, { kind: 'point', coordinates: [-79, 43] });
    render(<CommunityMeetingPlaceControl projectId={P} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(placeStore().placesByProject[P]).toBeUndefined();
  });

  it('warns when the designated structure no longer exists (dangling)', () => {
    placeStore().setMeetingPlace(P, { kind: 'feature', featureId: 'gone' });
    render(<CommunityMeetingPlaceControl projectId={P} />);
    const root = screen.getByTestId(TESTID);
    expect(root.textContent).toContain('Structure removed');
    expect(root.textContent).toContain('no longer exists');
  });
});

describe('CommunityMeetingPlaceControl — nudge', () => {
  it('nudges when upcoming gatherings exist but no place is set', () => {
    useCommunityWorkPlanStore.setState({
      rules: [],
      proposals: [confirmedMeeting()],
    });
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.getByTestId(TESTID).textContent).toContain(
      'no place to show on the map',
    );
  });

  it('shows no nudge once a place is set', () => {
    useCommunityWorkPlanStore.setState({
      rules: [],
      proposals: [confirmedMeeting()],
    });
    placeStore().setMeetingPlace(P, { kind: 'point', coordinates: [-79, 43] });
    render(<CommunityMeetingPlaceControl projectId={P} />);
    expect(screen.getByTestId(TESTID).textContent).not.toContain(
      'no place to show on the map',
    );
  });
});
