/**
 * @vitest-environment happy-dom
 *
 * StakeholderCapture -- store-direct stakeholder register capture.
 * Mirrors BoundaryCapture.test.tsx setup (happy-dom + testing-library +
 * lucide-react stub). Covers pure helpers (no render) and component behaviour.
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
  if (id === 'stakeholderRelationship') return ['Goodwill', 'Conflict'];
  if (id === 'stakeholderCommsChannel') return ['Phone', 'Email'];
  if (id === 'stakeholderType') return ['Neighbour', 'Other'];
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
  // --- builder (contact) ---
  describe('contact mode (c2)', () => {
    it('false when 0 rows and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c2', [], {})).toBe(false);
    });

    it('true when at least 1 row', () => {
      expect(isStakeholderValid('s1-stakeholders-c2', [makeRow()], {})).toBe(true);
    });

    it('true with none marker even when rows is empty', () => {
      expect(isStakeholderValid('s1-stakeholders-c2', [], { none: 'true' })).toBe(true);
    });

    it('false when none marker is "false"', () => {
      expect(isStakeholderValid('s1-stakeholders-c2', [], { none: 'false' })).toBe(false);
    });
  });

  // --- mapContact ---
  describe('mapContact mode (c1)', () => {
    it('true with at least 1 row', () => {
      expect(isStakeholderValid('s1-stakeholders-c1', [makeRow()], {})).toBe(true);
    });

    it('true with none marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c1', [], { none: 'true' })).toBe(true);
    });

    it('false with no rows and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c1', [], {})).toBe(false);
    });
  });

  // --- cultural ---
  describe('cultural mode (c3)', () => {
    it('false with a non-cultural row only', () => {
      expect(
        isStakeholderValid('s1-stakeholders-c3', [makeRow({ isIndigenousOrCultural: false })], {}),
      ).toBe(false);
    });

    it('true with an isIndigenousOrCultural=true row', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c3',
          [makeRow({ isIndigenousOrCultural: true })],
          {},
        ),
      ).toBe(true);
    });

    it('true with culturalNone marker even with no rows', () => {
      expect(
        isStakeholderValid('s1-stakeholders-c3', [], { culturalNone: 'true' }),
      ).toBe(true);
    });
  });

  // --- annotate c5 ---
  describe('annotate mode (c5)', () => {
    it('false with no rows and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c5', [], {})).toBe(false);
    });

    it('true when a row has relationshipStatus', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c5',
          [makeRow({ relationshipStatus: 'goodwill' })],
          {},
        ),
      ).toBe(true);
    });

    it('true with none marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c5', [], { none: 'true' })).toBe(true);
    });

    it('false when row has no relationshipStatus and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c5', [makeRow()], {})).toBe(false);
    });
  });

  // --- annotate c6 ---
  describe('annotate mode (c6)', () => {
    it('false with no rows and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c6', [], {})).toBe(false);
    });

    it('true when a row has commsChannel', () => {
      expect(
        isStakeholderValid(
          's1-stakeholders-c6',
          [makeRow({ commsChannel: 'Phone' })],
          {},
        ),
      ).toBe(true);
    });

    it('true with none marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c6', [], { none: 'true' })).toBe(true);
    });

    it('false when row has no commsChannel and no marker', () => {
      expect(isStakeholderValid('s1-stakeholders-c6', [makeRow()], {})).toBe(false);
    });
  });
});

// --------------------------------------------------------------------------
// Pure helper: summariseStakeholder
// --------------------------------------------------------------------------

describe('summariseStakeholder', () => {
  describe('contact mode (c2)', () => {
    it('acknowledged copy when 0 rows and none marker', () => {
      const s = summariseStakeholder('s1-stakeholders-c2', [], { none: 'true' });
      expect(s).toMatch(/No stakeholders in this category - acknowledged/);
    });

    it('singular count when 1 row', () => {
      const s = summariseStakeholder('s1-stakeholders-c2', [makeRow()], {});
      expect(s).toMatch(/1 stakeholder recorded/);
    });

    it('plural count when 2 rows', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c2',
        [makeRow({ id: 'a' }), makeRow({ id: 'b' })],
        {},
      );
      expect(s).toMatch(/2 stakeholders recorded/);
    });
  });

  describe('cultural mode (c3)', () => {
    it('acknowledged copy when no cultural rows', () => {
      const s = summariseStakeholder('s1-stakeholders-c3', [], {});
      expect(s).toMatch(/No Indigenous relationships identified/);
    });

    it('count for cultural rows', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c3',
        [makeRow({ isIndigenousOrCultural: true })],
        {},
      );
      expect(s).toMatch(/1 Indigenous\/cultural relationship recorded/);
    });

    it('plural for multiple cultural rows', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c3',
        [
          makeRow({ id: 'a', isIndigenousOrCultural: true }),
          makeRow({ id: 'b', isIndigenousOrCultural: true }),
        ],
        {},
      );
      expect(s).toMatch(/2 Indigenous\/cultural relationships recorded/);
    });
  });

  describe('annotate mode (c5)', () => {
    it('acknowledged copy when no rows have relationshipStatus', () => {
      const s = summariseStakeholder('s1-stakeholders-c5', [makeRow()], {});
      expect(s).toMatch(/No relationships to annotate - acknowledged/);
    });

    it('singular count when 1 row has relationshipStatus', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c5',
        [makeRow({ relationshipStatus: 'goodwill' })],
        {},
      );
      expect(s).toMatch(/1 relationship status recorded/);
    });

    it('plural count', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c5',
        [
          makeRow({ id: 'a', relationshipStatus: 'goodwill' }),
          makeRow({ id: 'b', relationshipStatus: 'conflict' }),
        ],
        {},
      );
      expect(s).toMatch(/2 relationship statuses recorded/);
    });
  });

  describe('annotate mode (c6)', () => {
    it('acknowledged copy when no rows have commsChannel', () => {
      const s = summariseStakeholder('s1-stakeholders-c6', [makeRow()], {});
      expect(s).toMatch(/No comms channels to annotate - acknowledged/);
    });

    it('singular count when 1 row has commsChannel', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c6',
        [makeRow({ commsChannel: 'Phone' })],
        {},
      );
      expect(s).toMatch(/1 comms channel recorded/);
    });

    it('plural count', () => {
      const s = summariseStakeholder(
        's1-stakeholders-c6',
        [
          makeRow({ id: 'a', commsChannel: 'Phone' }),
          makeRow({ id: 'b', commsChannel: 'Email' }),
        ],
        {},
      );
      expect(s).toMatch(/2 comms channels recorded/);
    });
  });
});

// --------------------------------------------------------------------------
// Component tests
// --------------------------------------------------------------------------

// Minimal wrapper that holds marker state
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
// builder -- contact (c2)
// --------------------------------------------------------------------------

describe('StakeholderCapture -- builder (c2 contact)', () => {
  it('typing a name and clicking stakeholder-add creates a row in the store', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c2" />);

    fireEvent.change(screen.getByTestId('stakeholder-name'), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByTestId('stakeholder-add'));

    const rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Alice');
  });

  it('does not create a row if name is empty', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c2" />);
    fireEvent.click(screen.getByTestId('stakeholder-add'));
    const rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows).toHaveLength(0);
  });

  it('clicking stakeholder-none-toggle calls onMarkerChange with none:true', () => {
    const onMarkerChange = vi.fn();
    render(
      <ControlledCapture
        itemId="s1-stakeholders-c2"
        onMarkerChange={onMarkerChange}
      />,
    );
    fireEvent.click(screen.getByTestId('stakeholder-none-toggle'));
    expect(onMarkerChange).toHaveBeenCalledWith(
      expect.objectContaining({ none: 'true' }),
    );
  });
});

// --------------------------------------------------------------------------
// builder -- mapContact (c1)
// --------------------------------------------------------------------------

describe('StakeholderCapture -- mapContact (c1)', () => {
  it('renders the stakeholder-open-map button as disabled', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c1" />);
    const btn = screen.getByTestId('stakeholder-open-map') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// --------------------------------------------------------------------------
// cultural (c3)
// --------------------------------------------------------------------------

describe('StakeholderCapture -- cultural (c3)', () => {
  it('adding via cultural-add creates a row with isIndigenousOrCultural=true', () => {
    render(<ControlledCapture itemId="s1-stakeholders-c3" />);

    fireEvent.change(screen.getByTestId('cultural-name'), {
      target: { value: 'Elder Group' },
    });
    fireEvent.change(screen.getByTestId('cultural-context'), {
      target: { value: 'Custodians of the river' },
    });
    fireEvent.click(screen.getByTestId('cultural-add'));

    const rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isIndigenousOrCultural).toBe(true);
    expect(rows[0]!.name).toBe('Elder Group');
  });

  it('cultural-none-toggle calls onMarkerChange with culturalNone:true', () => {
    const onMarkerChange = vi.fn();
    render(
      <ControlledCapture
        itemId="s1-stakeholders-c3"
        onMarkerChange={onMarkerChange}
      />,
    );
    fireEvent.click(screen.getByTestId('cultural-none-toggle'));
    expect(onMarkerChange).toHaveBeenCalledWith(
      expect.objectContaining({ culturalNone: 'true' }),
    );
  });
});

// --------------------------------------------------------------------------
// annotate (c5)
// --------------------------------------------------------------------------

describe('StakeholderCapture -- annotate (c5)', () => {
  it('changing annotate-relationship select updates relationshipStatus on the row', () => {
    // Seed one row directly via the store
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(PROJECT_ID, { name: 'A', type: '', role: '' });

    render(<ControlledCapture itemId="s1-stakeholders-c5" />);

    fireEvent.change(screen.getByTestId('annotate-relationship'), {
      target: { value: 'Goodwill' },
    });

    const rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relationshipStatus).toBe('Goodwill');
  });
});

// --------------------------------------------------------------------------
// remove
// --------------------------------------------------------------------------

describe('StakeholderCapture -- remove (c2)', () => {
  it('clicking stakeholder-remove deletes the row from the store', () => {
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(PROJECT_ID, { name: 'Bob', type: '', role: '' });

    render(<ControlledCapture itemId="s1-stakeholders-c2" />);

    fireEvent.click(screen.getByTestId('stakeholder-remove'));

    const rows = useStakeholderRegisterStore.getState().listForProject(PROJECT_ID);
    expect(rows).toHaveLength(0);
  });
});
