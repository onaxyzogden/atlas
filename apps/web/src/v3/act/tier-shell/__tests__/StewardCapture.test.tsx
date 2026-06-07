/**
 * @vitest-environment happy-dom
 *
 * StewardCapture -- bespoke right-panel capture for the optional
 * s1-vision-steward checklist item. Mirrors BoundaryCapture.test.tsx setup
 * (happy-dom + testing-library + lucide-react forwardRef stub) and seeds the
 * auth user via useAuthStore.setState in beforeEach (per SessionExpiredBanner).
 *
 * Covers pure helpers (no render): decodeSteward zip-to-min / ragged / drops
 * invalid-role rows / empty-or-missing / round-trip; isStewardValid always
 * true; summariseSteward zero + mixed. And component behaviour: primary card,
 * null user placeholder, three role cards, team count, queue gating + emit,
 * role-hint, remove.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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

import StewardCapture, {
  decodeSteward,
  isStewardValid,
  summariseSteward,
  stewardInvitesToQueued,
  type StewardModel,
} from '../StewardCapture.js';
import { useAuthStore } from '../../../../store/authStore.js';
import type { FormValue } from '../actToolCatalog.js';

// --------------------------------------------------------------------------
// Shared
// --------------------------------------------------------------------------

function resolveOptions(): readonly string[] {
  return [];
}

beforeEach(() => {
  useAuthStore.setState({
    token: 'tok',
    user: {
      id: 'u',
      email: 'yousef@apricotlane.com',
      displayName: 'Yousef Al-Amin',
      defaultOrgId: 'org-1',
      emailVerified: true,
    },
    error: null,
  });
  localStorage.clear();
});

afterEach(() => cleanup());

// --------------------------------------------------------------------------
// Pure helper: decodeSteward
// --------------------------------------------------------------------------

describe('decodeSteward', () => {
  it('empty value -> {invites:[]}', () => {
    expect(decodeSteward({})).toEqual({ invites: [] });
  });

  it('missing keys -> {invites:[]}', () => {
    expect(decodeSteward({ somethingElse: 'x' })).toEqual({ invites: [] });
  });

  it('zips three parallel arrays', () => {
    const value: FormValue = {
      inviteNames: ['Amina', 'Bilal'],
      inviteEmails: ['amina@x.com', 'bilal@x.com'],
      inviteRoles: ['team_member', 'contractor'],
    };
    expect(decodeSteward(value)).toEqual({
      invites: [
        { name: 'Amina', email: 'amina@x.com', role: 'team_member' },
        { name: 'Bilal', email: 'bilal@x.com', role: 'contractor' },
      ],
    });
  });

  it('zips to the min length of ragged arrays', () => {
    const value: FormValue = {
      inviteNames: ['Amina', 'Bilal', 'Carl'],
      inviteEmails: ['amina@x.com', 'bilal@x.com'],
      inviteRoles: ['team_member', 'contractor', 'landowner'],
    };
    expect(decodeSteward(value).invites).toHaveLength(2);
  });

  it('drops rows whose role is not a valid enum value', () => {
    const value: FormValue = {
      inviteNames: ['Amina', 'Bilal'],
      inviteEmails: ['amina@x.com', 'bilal@x.com'],
      inviteRoles: ['team_member', 'owner'],
    };
    expect(decodeSteward(value)).toEqual({
      invites: [{ name: 'Amina', email: 'amina@x.com', role: 'team_member' }],
    });
  });

  it('tolerates blank name/email positionally', () => {
    const value: FormValue = {
      inviteNames: [''],
      inviteEmails: [''],
      inviteRoles: ['landowner'],
    };
    expect(decodeSteward(value)).toEqual({
      invites: [{ name: '', email: '', role: 'landowner' }],
    });
  });
});

// --------------------------------------------------------------------------
// Round-trip identity (encode is the exact inverse of decode for all-valid)
// --------------------------------------------------------------------------

describe('decodeSteward round-trip', () => {
  it('decode(value) re-decodes identically through a populated value', () => {
    const value: FormValue = {
      inviteNames: ['Amina', 'Bilal'],
      inviteEmails: ['amina@x.com', 'bilal@x.com'],
      inviteRoles: ['team_member', 'landowner'],
    };
    const model = decodeSteward(value);
    // Re-encode by reconstructing the parallel arrays the component persists,
    // then decode again -- must yield the same model.
    const reEncoded: FormValue = {
      inviteNames: model.invites.map((i) => i.name),
      inviteEmails: model.invites.map((i) => i.email),
      inviteRoles: model.invites.map((i) => i.role),
    };
    expect(decodeSteward(reEncoded)).toEqual(model);
  });
});

// --------------------------------------------------------------------------
// Pure helper: isStewardValid
// --------------------------------------------------------------------------

describe('isStewardValid', () => {
  it('true with zero invites', () => {
    expect(isStewardValid({ invites: [] })).toBe(true);
  });

  it('true with populated invites', () => {
    const model: StewardModel = {
      invites: [{ name: 'Amina', email: 'a@x.com', role: 'team_member' }],
    };
    expect(isStewardValid(model)).toBe(true);
  });
});

// --------------------------------------------------------------------------
// Pure helper: summariseSteward
// --------------------------------------------------------------------------

describe('summariseSteward', () => {
  it('zero invites -> "Primary steward confirmed"', () => {
    expect(summariseSteward({ invites: [] })).toBe('Primary steward confirmed');
  });

  it('mixed -> human labels, omitting zero-count clauses', () => {
    const model: StewardModel = {
      invites: [
        { name: 'A', email: 'a@x.com', role: 'team_member' },
        { name: 'B', email: 'b@x.com', role: 'contractor' },
      ],
    };
    expect(summariseSteward(model)).toBe(
      'Primary steward + 2 invited (1 co-steward, 1 contractor)',
    );
  });

  it('omits the zero co-steward clause when only reviewers invited', () => {
    const model: StewardModel = {
      invites: [{ name: 'C', email: 'c@x.com', role: 'landowner' }],
    };
    expect(summariseSteward(model)).toBe(
      'Primary steward + 1 invited (1 reviewer)',
    );
  });
});

// --------------------------------------------------------------------------
// Pure mapper: stewardInvitesToQueued
// --------------------------------------------------------------------------

describe('stewardInvitesToQueued', () => {
  const NOW = '2026-06-07T00:00:00.000Z';

  it('maps invites to canonical queued shape with the given timestamp', () => {
    const model = {
      invites: [{ name: 'Amina', email: 'a@b.com', role: 'team_member' as const }],
    };
    expect(stewardInvitesToQueued(model, NOW)).toEqual([
      { name: 'Amina', email: 'a@b.com', role: 'team_member', queuedAt: NOW },
    ]);
  });

  it('returns [] for an empty model', () => {
    expect(stewardInvitesToQueued({ invites: [] }, NOW)).toEqual([]);
  });

  it('drops invites with a blank email (canonical requires a real email)', () => {
    const model = {
      invites: [
        { name: 'X', email: '', role: 'contractor' as const },
        { name: 'Y', email: 'y@b.com', role: 'landowner' as const },
      ],
    };
    expect(stewardInvitesToQueued(model, NOW)).toEqual([
      { name: 'Y', email: 'y@b.com', role: 'landowner', queuedAt: NOW },
    ]);
  });

  it('round-trips from a persisted FormValue via decodeSteward', () => {
    const value = {
      inviteNames: ['Amina'],
      inviteEmails: ['a@b.com'],
      inviteRoles: ['team_member'],
    };
    expect(stewardInvitesToQueued(decodeSteward(value), NOW)).toEqual([
      { name: 'Amina', email: 'a@b.com', role: 'team_member', queuedAt: NOW },
    ]);
  });
});

// --------------------------------------------------------------------------
// Component harness
// --------------------------------------------------------------------------

function ControlledCapture({
  initialValue = {},
  onChange,
}: {
  initialValue?: FormValue;
  onChange?: (v: FormValue) => void;
}): JSX.Element {
  const [value, setValue] = React.useState<FormValue>(initialValue);
  return (
    <StewardCapture
      itemId="s1-vision-steward"
      value={value}
      resolveOptions={resolveOptions}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Primary steward card
// --------------------------------------------------------------------------

describe('StewardCapture -- primary steward card', () => {
  it('shows displayName, "You" badge, initials, and a lock icon', () => {
    render(<ControlledCapture />);
    expect(screen.getByTestId('primary-steward-name').textContent).toContain(
      'Yousef Al-Amin',
    );
    expect(screen.getByTestId('primary-steward-you')).toBeTruthy();
    expect(screen.getByTestId('primary-steward-avatar').textContent).toBe('YA');
    expect(screen.getByTestId('primary-steward-lock')).toBeTruthy();
  });

  it('null user renders a placeholder and does not throw', () => {
    useAuthStore.setState({ token: null, user: null, error: null });
    expect(() => render(<ControlledCapture />)).not.toThrow();
    expect(screen.getByTestId('primary-steward-name')).toBeTruthy();
  });
});

// --------------------------------------------------------------------------
// Role explanation cards
// --------------------------------------------------------------------------

describe('StewardCapture -- role cards', () => {
  it('renders three role explanation cards with access chips', () => {
    render(<ControlledCapture />);
    const cards = screen.getAllByTestId('role-card');
    expect(cards).toHaveLength(3);
    // each card carries at least one access chip
    expect(screen.getAllByTestId('access-chip').length).toBeGreaterThanOrEqual(3);
  });
});

// --------------------------------------------------------------------------
// Team list
// --------------------------------------------------------------------------

describe('StewardCapture -- team list', () => {
  it('starts at 1 member (just the primary steward)', () => {
    render(<ControlledCapture />);
    expect(screen.getByTestId('team-count').textContent).toBe('1 member');
    expect(screen.getAllByTestId('team-member')).toHaveLength(1);
  });
});

// --------------------------------------------------------------------------
// Invite form gating + emit
// --------------------------------------------------------------------------

describe('StewardCapture -- invite form', () => {
  it('Queue is disabled until name && email-with-"@"', () => {
    render(<ControlledCapture />);
    const queue = screen.getByTestId('invite-submit') as HTMLButtonElement;
    expect(queue.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('invite-name'), {
      target: { value: 'Amina' },
    });
    expect(queue.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('invite-email'), {
      target: { value: 'no-at-sign' },
    });
    expect(queue.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('invite-email'), {
      target: { value: 'amina@x.com' },
    });
    expect(queue.disabled).toBe(false);
  });

  it('typing name/email does NOT call onChange', () => {
    const onChange = vi.fn();
    render(<ControlledCapture onChange={onChange} />);
    fireEvent.change(screen.getByTestId('invite-name'), {
      target: { value: 'Amina' },
    });
    fireEvent.change(screen.getByTestId('invite-email'), {
      target: { value: 'amina@x.com' },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selecting a role updates the role-hint text', () => {
    render(<ControlledCapture />);
    const before = screen.getByTestId('role-hint').textContent;
    fireEvent.click(screen.getByTestId('invite-role-contractor'));
    const after = screen.getByTestId('role-hint').textContent;
    expect(after).not.toBe(before);
    expect(after).toBeTruthy();
  });

  it('Queue calls onChange ONCE with the row appended to all three arrays', () => {
    const onChange = vi.fn();
    render(<ControlledCapture onChange={onChange} />);

    fireEvent.click(screen.getByTestId('invite-role-contractor'));
    fireEvent.change(screen.getByTestId('invite-name'), {
      target: { value: 'Amina' },
    });
    fireEvent.change(screen.getByTestId('invite-email'), {
      target: { value: 'amina@x.com' },
    });
    fireEvent.click(screen.getByTestId('invite-submit'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      inviteNames: ['Amina'],
      inviteEmails: ['amina@x.com'],
      inviteRoles: ['contractor'],
    });

    // team count reflects the queued invite
    expect(screen.getByTestId('team-count').textContent).toBe('2 members');
  });

  it('removing an invite emits with the index removed from all three arrays', () => {
    const onChange = vi.fn();
    render(
      <ControlledCapture
        initialValue={{
          inviteNames: ['Amina', 'Bilal'],
          inviteEmails: ['amina@x.com', 'bilal@x.com'],
          inviteRoles: ['team_member', 'contractor'],
        }}
        onChange={onChange}
      />,
    );

    // 1 primary + 2 invited = 3 rows
    expect(screen.getAllByTestId('team-member')).toHaveLength(3);

    fireEvent.click(screen.getByTestId('invite-remove-0'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      inviteNames: ['Bilal'],
      inviteEmails: ['bilal@x.com'],
      inviteRoles: ['contractor'],
    });
  });
});
