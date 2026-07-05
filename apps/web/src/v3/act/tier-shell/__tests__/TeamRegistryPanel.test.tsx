/**
 * @vitest-environment happy-dom
 *
 * TeamRegistryPanel -- the Declaration right-pane REFERENCE block for the
 * Steward/Team Object. Read-only: it renders the live roster join (memberStore
 * <-> visionStore.stewardProfiles) + the project Intent Object (SharedVision)
 * through the pure selectTeamRoster adapter. Both stores are seeded (the roster
 * is their join), mirroring StewardTeamCapture.test.tsx.
 *
 * Pinned:
 *   1. empty fallbacks  -- no roster / no hours / no intent.
 *   2. member rows       -- name + role + the "constituted" check.
 *   3. labour bars        -- only pledged stewards, with the declared total.
 *   4. intent reference   -- Purpose / Non-negotiable / Committed from vision.
 *   5. Amanah             -- the rendered panel carries no advance-sale copy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProjectMemberRecord } from '@ogden/shared';

// The panel reads project-resolved operational-role labels via
// useResolvedOperationalRoles, which wraps the React-Query `useProject` hook.
// This is a store-direct render (no QueryClientProvider), so stub the resolver
// with the built-in defs -- exercising the default (no-override) path that the
// overwhelming majority of projects use.
vi.mock('../../../roles/useResolvedOperationalRoles.js', async () => {
  const shared = await vi.importActual<typeof import('@ogden/shared')>(
    '@ogden/shared',
  );
  return {
    useResolvedOperationalRoles: () => ({
      defs: shared.resolveOperationalRoleDefs(),
      domainsMap: shared.resolveOperationalRoleDomains(),
    }),
  };
});

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import TeamRegistryPanel from '../TeamRegistryPanel.js';
import {
  useVisionStore,
  type SharedVision,
  type StewardProfile,
} from '../../../../store/visionStore.js';
import { useMemberStore } from '../../../../store/memberStore.js';
import { useProjectStore, type LocalProject } from '../../../../store/projectStore.js';

const PROJECT_ID = 'proj-team-panel';

function makeMember(over: Partial<ProjectMemberRecord> = {}): ProjectMemberRecord {
  return {
    userId: 'u1',
    email: 'ali@example.nz',
    displayName: 'Ali Rahman',
    role: 'primary_steward',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  useMemberStore.setState({
    members: [],
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
  useVisionStore.setState({ visions: [] });
  useProjectStore.setState({ projects: [] });
  localStorage.clear();
});

function seedRoster(members: ProjectMemberRecord[]): void {
  useMemberStore.setState({
    members,
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
}

function seedVision(
  profiles: Record<string, StewardProfile> = {},
  sharedVision: SharedVision = {},
): void {
  useVisionStore.getState().ensureDefaults(PROJECT_ID);
  useVisionStore.setState((s) => ({
    visions: s.visions.map((v) =>
      v.projectId === PROJECT_ID
        ? { ...v, stewardProfiles: profiles, sharedVision }
        : v,
    ),
  }));
}

function seedProjectTeam(team: NonNullable<LocalProject['metadata']>['team']): void {
  useProjectStore.setState({
    projects: [{ id: PROJECT_ID, metadata: { team } } as LocalProject],
  });
}

describe('TeamRegistryPanel -- empty state', () => {
  it('renders the panel with all three empty fallbacks', () => {
    seedVision();
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);
    expect(screen.getByTestId('team-registry-panel')).toBeTruthy();
    expect(screen.getByTestId('registry-count').textContent).toMatch(
      /0 of 0 constituted/,
    );
    expect(screen.getByText(/No stewards on the roster yet/)).toBeTruthy();
    expect(screen.getByText(/No weekly hours declared yet/)).toBeTruthy();
    expect(screen.getByText(/Intent Object not yet declared/)).toBeTruthy();
  });
});

describe('TeamRegistryPanel -- member rows + constituted count', () => {
  it('lists each steward, flags the one with a team role, and counts it', () => {
    seedRoster([
      makeMember(),
      makeMember({ userId: 'u2', displayName: 'Noor Said' }),
    ]);
    seedVision({
      u1: { teamRole: 'Land manager' },
      u2: {},
    });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    const rowAli = screen.getByTestId('member-row-u1');
    expect(rowAli.textContent).toMatch(/Ali Rahman/);
    expect(rowAli.textContent).toMatch(/Land manager/);
    expect(rowAli.getAttribute('data-complete')).toBe('true');

    const rowNoor = screen.getByTestId('member-row-u2');
    expect(rowNoor.textContent).toMatch(/Noor Said/);
    expect(rowNoor.getAttribute('data-complete')).toBeNull();

    expect(screen.getByTestId('registry-count').textContent).toMatch(
      /1 of 2 constituted/,
    );
  });
});

describe('TeamRegistryPanel -- operational-role chips (ADR 2026-06-24)', () => {
  it('renders read-only label chips for a member with operational roles', () => {
    seedRoster([
      makeMember({ operationalRoles: ['livestock', 'finance_legal'] }),
    ]);
    seedVision({ u1: {} });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    const chips = screen.getByTestId('op-roles-u1');
    expect(chips.textContent).toMatch(/Livestock Lead/);
    expect(chips.textContent).toMatch(/Finance & Legal Lead/);
  });

  it('renders no chip container when the member holds no operational roles', () => {
    seedRoster([makeMember()]);
    seedVision({ u1: {} });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('op-roles-u1')).toBeNull();
  });
});

describe('TeamRegistryPanel -- labour bars', () => {
  it('renders a bar only for stewards who pledged hours, with the total', () => {
    seedRoster([
      makeMember(),
      makeMember({ userId: 'u2', displayName: 'Noor Said' }),
    ]);
    seedVision({
      u1: { maintenanceHrsInitial: 20, maintenanceHrsOngoing: 10 }, // 30
      u2: {}, // none -> excluded
    });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    expect(screen.getByTestId('labour-bar-u1').textContent).toMatch(
      /30 hr \/ wk/,
    );
    expect(screen.queryByTestId('labour-bar-u2')).toBeNull();
    // Section count caption reflects the summed roster pledge.
    expect(screen.getByText(/30 hr \/ wk declared/)).toBeTruthy();
  });
});

describe('TeamRegistryPanel -- intent reference', () => {
  it('surfaces Purpose / Non-negotiable / Committed from SharedVision', () => {
    seedVision(
      {},
      {
        statement: 'A regenerative family farm.',
        constraints: ['No riba.'],
        coreFunctions: ['Grow food', 'Steward soil'],
      },
    );
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    expect(screen.getByTestId('intent-purpose').textContent).toMatch(
      /A regenerative family farm\./,
    );
    expect(screen.getByTestId('intent-nonNegotiable').textContent).toMatch(
      /No riba\./,
    );
    expect(screen.getByTestId('intent-committed').textContent).toMatch(
      /Grow food, Steward soil/,
    );
  });
});

describe('TeamRegistryPanel -- Amanah wording-pin (rendered DOM)', () => {
  it('carries no advance-sale / subscription / CSA framing', () => {
    seedRoster([makeMember()]);
    seedVision(
      { u1: { teamRole: 'Land manager', maintenanceHrsInitial: 12 } },
      {
        statement: 'A regenerative family farm.',
        constraints: ['No riba.'],
        coreFunctions: ['Grow food'],
      },
    );
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);
    const text = (
      screen.getByTestId('team-registry-panel').textContent ?? ''
    ).toLowerCase();
    expect(text).not.toMatch(
      /subscription|presale|advance sale|csa|csra|yield[- ]share/,
    );
  });
});

describe('TeamRegistryPanel -- provisional rows from the wizard team', () => {
  it('renders named-at-setup people as muted "Awaiting role" rows and counts them', () => {
    seedVision(); // empty roster + empty vision
    seedProjectTeam({
      primarySteward: { name: 'Ali Rahman', email: 'ali@example.nz' },
      queuedInvites: [
        { email: 'noor@example.nz', role: 'team_member', queuedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    expect(screen.getByTestId('registry-count').textContent).toMatch(/0 of 2 constituted/);

    const row = screen.getByTestId('member-row-provisional:ali@example.nz');
    expect(row.textContent).toMatch(/Ali Rahman/);
    expect(row.textContent).toMatch(/Awaiting role/);
    expect(row.getAttribute('data-provisional')).toBe('true');
    // Provisional rows are not "constituted" -> no check badge.
    expect(row.getAttribute('data-complete')).toBeNull();
  });
});

describe('TeamRegistryPanel -- self-describing empty-state jump links', () => {
  it('invokes the nav callbacks with the right destinations', () => {
    seedVision(); // everything empty, no team
    const onNavigateObjective = vi.fn();
    const onSelectItem = vi.fn();
    render(
      <TeamRegistryPanel
        projectId={PROJECT_ID}
        onNavigateObjective={onNavigateObjective}
        onSelectItem={onSelectItem}
      />,
    );

    fireEvent.click(screen.getByTestId('jump-roster'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c1');

    fireEvent.click(screen.getByTestId('jump-labour'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c5');

    fireEvent.click(screen.getByTestId('jump-intent'));
    expect(onNavigateObjective).toHaveBeenCalledWith('s1-vision');
  });

  it('offers an "assign roles" jump (c2) when provisional rows are present', () => {
    seedVision();
    seedProjectTeam({ primarySteward: { name: 'Ali Rahman', email: 'ali@example.nz' } });
    const onSelectItem = vi.fn();
    render(<TeamRegistryPanel projectId={PROJECT_ID} onSelectItem={onSelectItem} />);

    fireEvent.click(screen.getByTestId('jump-roles'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c2');
  });

  it('renders no jump buttons when no nav callbacks are provided', () => {
    seedVision();
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('jump-roster')).toBeNull();
    expect(screen.queryByTestId('jump-labour')).toBeNull();
    expect(screen.queryByTestId('jump-intent')).toBeNull();
    // The existing descriptive empty copy still renders (unchanged).
    expect(screen.getByText(/No stewards on the roster yet/)).toBeTruthy();
  });
});
