/**
 * @vitest-environment happy-dom
 *
 * StakeholderCapture -- store-direct stakeholder register capture.
 * Mirrors BoundaryCapture.test.tsx setup (happy-dom + testing-library +
 * lucide-react stub). Covers pure helpers (no render) and component behaviour
 * for the pixel-faithful mixed-surface rewrite (c1 neighbours, c2 authority,
 * c3 cultural, c4 community, c5 relationships, c6 channels).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStakeholderRegisterStore } from '../../../../store/stakeholderRegisterStore.js';

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

import StakeholderCapture, {
  stakeholderModeFor,
  isStakeholderValid,
  summariseStakeholder,
} from '../StakeholderCapture.js';
import type { StakeholderRecord } from '../../../../store/stakeholderRegisterStore.js';
import type { FormValue } from '../actToolCatalog.js';

// --------------------------------------------------------------------------
// Shared test fixtures
// --------------------------------------------------------------------------

const PROJECT_ID = 'proj-test';

function resolveOptions(id: string): readonly string[] {
  if (id === 'stakeholderNeighbourType')
    return ['Shares boundary', 'Downstream'];
  if (id === 'stakeholderCommunityType')
    return ['Local farming network', 'Landcare group'];
  if (id === 'stakeholderRelationship')
    return ['Conflict', 'Tension', 'Neutral', 'Goodwill', 'Partnership'];
  if (id === 'stakeholderCommsChannel')
    return ['Email', 'Phone', 'SMS', 'Post', 'In-person', 'Community mtg'];
  return [];
}

function makeRow(overrides: Partial<StakeholderRecord> = {}): StakeholderRecord {
  return {
    id: 'row-1',
    projectId: PROJECT_ID,
    name: 'Test Person',
    type: '',
    role: '',
    createdAt: '2026-06-06T00:00:00.000Z',
    ...overrides,
  };
}

// --------------------------------------------------------------------------
// Store reset before each test
// --------------------------------------------------------------------------

beforeEach(() => {
  useStakeholderRegisterStore.setState({ byProject: {} });
  localStorage.clear();
});

// --------------------------------------------------------------------------
// Pure helper: stakeholderModeFor
// --------------------------------------------------------------------------

describe('stakeholderModeFor', () => {
  const cases: ReadonlyArray<[string, ReturnType<typeof stakeholderModeFor>]> = [
    ['s1-stakeholders-c1', 'mapContact'],
    ['s1-stakeholders-c2', 'contact'],
    ['s1-stakeholders-c3', 'cultural'],
    ['s1-stakeholders-c4', 'contact'],
    ['s1-stakeholders-c5', 'annotate'],
    ['s1-stakeholders-c6', 'annotate'],
  ];

  it.each(cases)('maps %s -> %s', (itemId, mode) => {
    expect(stakeholderModeFor(itemId)).toBe(mode);
  });

  it('returns "contact" as the default for an unknown id', () => {
    expect(stakeholderModeFor('s1-stakeholders-cX')).toBe('contact');
  });
});

// --------------------------------------------------------------------------
// Pure helper: isStakeholderValid
// --------------------------------------------------------------------------

describe('isStakeholderValid', () => {
  // --- c1 mapContact: requires >=1 neighbour row ---
  describe('c1 (neighbours)', () => {
    it('false with no rows', () => {
      expect(isStakeholderValid('s1-stakeholders-c1', [], {})).toBe(false);
    });

    it('false when the only row is not a neighbour', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c1',
          [makeRow({ type: 'authority' })],
          {},
        ),
      ).toBe(false);
    });

    it('true with at least one neighbour row', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c1',
          [makeRow({ type: 'neighbour' })],
          {},
        ),
      ).toBe(true);
    });
  });

  // --- c2 contact: requires >=1 authority row ---
  describe('c2 (authority)', () => {
    it('false with no rows', () => {
      expect(isStakeholderValid('s1-stakeholders-c2', [], {})).toBe(false);
    });

    it('false when the only row is not an authority', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c2',
          [makeRow({ type: 'neighbour' })],
          {},
        ),
      ).toBe(false);
    });

    it('true with at least one authority row', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c2',
          [makeRow({ type: 'authority' })],
          {},
        ),
      ).toBe(true);
    });
  });

  // --- always-valid items ---
  describe('always-valid items (c3/c4/c5/c6)', () => {
    it('c3 is always valid (default cultural status)', () => {
      expect(isStakeholderValid('s1-stakeholders-c3', [], {})).toBe(true);
    });

    it('c4 is always valid (can record with none)', () => {
      expect(isStakeholderValid('s1-stakeholders-c4', [], {})).toBe(true);
    });

    it('c5 is always valid', () => {
      expect(isStakeholderValid('s1-stakeholders-c5', [], {})).toBe(true);
    });

    it('c6 is always valid', () => {
      expect(isStakeholderValid('s1-stakeholders-c6', [], {})).toBe(true);
    });
  });
});

// --------------------------------------------------------------------------
// Pure helper: summariseStakeholder
// --------------------------------------------------------------------------

describe('summariseStakeholder', () => {
  it('c1: counts neighbour rows (plural)', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c1',
      [
        makeRow({ id: 'a', type: 'neighbour' }),
        makeRow({ id: 'b', type: 'neighbour' }),
        makeRow({ id: 'c', type: 'authority' }),
      ],
      {},
    );
    expect(s).toBe('2 neighbours recorded');
  });

  it('c1: singular for one neighbour', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c1',
      [makeRow({ type: 'neighbour' })],
      {},
    );
    expect(s).toBe('1 neighbour recorded');
  });

  it('c2: counts authority rows', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c2',
      [makeRow({ type: 'authority' })],
      {},
    );
    expect(s).toBe('1 authority contact recorded');
  });

  it('c4: zero -> "No community stakeholders recorded"', () => {
    const s = summariseStakeholder('s1-stakeholders-c4', [], {});
    expect(s).toBe('No community stakeholders recorded');
  });

  it('c4: counts community rows (plural)', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c4',
      [
        makeRow({ id: 'a', type: 'community' }),
        makeRow({ id: 'b', type: 'community' }),
      ],
      {},
    );
    expect(s).toBe('2 community stakeholders recorded');
  });

  it('c3: default status title when marker unset', () => {
    const s = summariseStakeholder('s1-stakeholders-c3', [], {});
    expect(s).toBe('Cultural status: Not yet investigated');
  });

  it('c3: selected status title from marker', () => {
    const s = summariseStakeholder('s1-stakeholders-c3', [], {
      culturalStatus: 'formal-protocol',
    });
    expect(s).toBe(
      'Cultural status: Formal protocol, agreement, or recognition in place',
    );
  });

  it('c5: counts rows with relationshipStatus', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c5',
      [
        makeRow({ id: 'a', relationshipStatus: 'goodwill' }),
        makeRow({ id: 'b' }),
      ],
      {},
    );
    expect(s).toBe('1 relationship characterised');
  });

  it('c6: counts rows with non-empty commsChannels', () => {
    const s = summariseStakeholder(
      's1-stakeholders-c6',
      [
        makeRow({ id: 'a', commsChannels: ['Email'] }),
        makeRow({ id: 'b', commsChannels: [] }),
        makeRow({ id: 'c' }),
      ],
      {},
    );
    expect(s).toBe('1 stakeholder with preferred channels');
  });
});

// --------------------------------------------------------------------------
// Component harness
// --------------------------------------------------------------------------

function ControlledCapture({
  itemId,
  initialMarker = {},
  onMarkerChange,
}: {
  itemId: string;
  initialMarker?: FormValue;
  onMarkerChange?: (v: FormValue) => void;
}): JSX.Element {
  const [marker, setMarker] = React.useState<FormValue>(initialMarker);
  return (
    <StakeholderCapture
      itemId={itemId}
      projectId={PROJECT_ID}
      resolveOptions={resolveOptions}
      markerValue={marker}
      onMarkerChange={(next) => {
        setMarker(next);
        onMarkerChange?.(next);
      }}
    />
  );
}

// --------------------------------------------------------------------------
// c1 neighbours
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c1 neighbours (mapContact)', () => {
  it('renders the open-map button disabled', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c1" />);
    const btn = screen.getByTestId('stakeholder-open-map') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('add-neighbour flow creates a neighbour row', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c1" />);

    fireEvent.click(screen.getByTestId('stakeholder-add-neighbour'));
    fireEvent.change(screen.getByTestId('stakeholder-name'), {
      target: { value: 'Sarah Mathews' },
    });
    fireEvent.click(screen.getByTestId('stakeholder-add'));

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe('neighbour');
    expect(rows[0]!.name).toBe('Sarah Mathews');
    // role defaults to first option when no chip chosen
    expect(rows[0]!.role).toBe('Shares boundary');
  });

  it('empty name falls back to "Unknown neighbour"', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c1" />);
    fireEvent.click(screen.getByTestId('stakeholder-add-neighbour'));
    fireEvent.click(screen.getByTestId('stakeholder-add'));
    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows[0]!.name).toBe('Unknown neighbour');
  });

  it('clicking stakeholder-remove deletes a neighbour row', () => {
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(PROJECT_ID, {
        name: 'Bob',
        type: 'neighbour',
        role: 'Shares boundary',
      });

    render(<ControlledCapture itemId="s1-stakeholders-c1" />);
    fireEvent.click(screen.getByTestId('stakeholder-remove'));

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows).toHaveLength(0);
  });
});

// --------------------------------------------------------------------------
// c2 authority
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c2 authority (contact)', () => {
  it('clicking an authority button creates an authority row', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c2" />);
    const buttons = screen.getAllByTestId('stakeholder-auth-btn');
    expect(buttons.length).toBe(8);
    fireEvent.click(buttons[0]!);

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe('authority');
    expect(rows[0]!.name).toBe('Local Council - Planning');
    expect(rows[0]!.role).toBe('Authority contact');
  });
});

// --------------------------------------------------------------------------
// c4 community
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c4 community (contact)', () => {
  it('clicking a community chip creates a community row', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c4" />);
    const chips = screen.getAllByTestId('stakeholder-community-chip');
    fireEvent.click(chips[0]!);

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe('community');
    expect(rows[0]!.name).toBe('Local farming network');
    expect(rows[0]!.role).toBe('Community member');
  });

  it('add-another creates a generic community row', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c4" />);
    fireEvent.click(screen.getByTestId('stakeholder-add-another'));

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe('community');
    expect(rows[0]!.name).toBe('Community member');
  });
});

// --------------------------------------------------------------------------
// c3 cultural
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c3 cultural', () => {
  it('renders five status cards and no defer/none toggle', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c3" />);
    expect(screen.getAllByTestId('cultural-status-card')).toHaveLength(5);
    expect(screen.queryByTestId('cultural-none-toggle')).toBeNull();
    expect(screen.queryByTestId('stakeholder-none-toggle')).toBeNull();
  });

  it('selecting a card calls onMarkerChange with culturalStatus', () => {
    const onMarkerChange = vi.fn();
    render(
      <ControlledCapture
        itemId="s1-stakeholders-c3"
        onMarkerChange={onMarkerChange}
      />,
    );
    const cards = screen.getAllByTestId('cultural-status-card');
    const teal = cards.find(
      (c) => c.getAttribute('data-status-id') === 'active-consultation',
    )!;
    fireEvent.click(teal);
    expect(onMarkerChange).toHaveBeenCalledWith(
      expect.objectContaining({ culturalStatus: 'active-consultation' }),
    );
  });

  it('typing in notes calls onMarkerChange with culturalNotes', () => {
    const onMarkerChange = vi.fn();
    render(
      <ControlledCapture
        itemId="s1-stakeholders-c3"
        onMarkerChange={onMarkerChange}
      />,
    );
    fireEvent.change(screen.getByTestId('cultural-notes'), {
      target: { value: 'Contacted the council on 1 June.' },
    });
    expect(onMarkerChange).toHaveBeenCalledWith(
      expect.objectContaining({
        culturalNotes: 'Contacted the council on 1 June.',
      }),
    );
  });
});

// --------------------------------------------------------------------------
// c5 relationships
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c5 relationships (annotate)', () => {
  it('shows the empty note when register is empty', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c5" />);
    expect(
      screen.getByText(/Add stakeholders in items 1-4 first/),
    ).toBeTruthy();
  });

  it('clicking a relationship pill sets lowercased relationshipStatus', () => {
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(PROJECT_ID, { name: 'A', type: 'neighbour', role: '' });

    render(<ControlledCapture itemId="s1-stakeholders-c5" />);

    const pills = screen.getAllByTestId('annotate-relationship-pill');
    const goodwill = pills.find((p) => p.getAttribute('data-value') === 'Goodwill')!;
    fireEvent.click(goodwill);

    const rows = useStakeholderRegisterStore
      .getState()
      .listForProject(PROJECT_ID);
    expect(rows[0]!.relationshipStatus).toBe('goodwill');
  });
});

// --------------------------------------------------------------------------
// c6 channels
// --------------------------------------------------------------------------

describe('StakeholderCapture -- c6 channels (annotate)', () => {
  it('shows the empty note when register is empty', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c6" />);
    expect(
      screen.getByText(/Add stakeholders in items 1-4 first/),
    ).toBeTruthy();
  });

  it('toggling a channel pill adds then removes the value', () => {
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(PROJECT_ID, { name: 'A', type: 'community', role: '' });

    render(<ControlledCapture itemId="s1-stakeholders-c6" />);

    const getPill = () =>
      screen
        .getAllByTestId('annotate-channel-pill')
        .find((p) => p.getAttribute('data-value') === 'Email')!;

    fireEvent.click(getPill());
    let rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows[0]!.commsChannels).toEqual(['Email']);

    fireEvent.click(getPill());
    rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows[0]!.commsChannels).toEqual([]);
  });
});
