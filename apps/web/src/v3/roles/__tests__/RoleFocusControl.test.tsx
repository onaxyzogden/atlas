/**
 * @vitest-environment happy-dom
 *
 * RoleFocusControl -- composes ViewFocusToggle + the "Viewing as" picker. Mock
 * the two hooks it reads (useViewScope opted-in bundle + useResolvedOperationalRoles
 * defs) so this is a pure presentational test: assert which affordances render for
 * each activation shape, that the picker lists the resolved role labels, and that
 * selecting a role/`My roles` drives setFocusRole (+ setFocusMode only when a
 * specific role is picked from Full view).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mutable stand-in for useViewScope's return; reset per test.
const viewScope = {
  layerActive: true,
  focusMode: 'role' as 'role' | 'full',
  setFocusMode: vi.fn(),
  focusRole: null as string | null,
  setFocusRole: vi.fn(),
  canPickRole: true,
  scope: new Set<string>(),
  isScoped: true,
};

vi.mock('../useViewScope.js', () => ({
  useViewScope: () => viewScope,
}));

const DEFS = [
  { slug: 'ecology_soils', label: 'Ecology & Soils Steward', description: '' },
  { slug: 'food_production', label: 'Food Production Lead', description: '' },
  { slug: 'livestock', label: 'Livestock Lead', description: '' },
  { slug: 'infrastructure', label: 'Infrastructure Lead', description: '' },
  { slug: 'community_governance', label: 'Community & Governance Lead', description: '' },
  { slug: 'finance_legal', label: 'Finance & Legal Lead', description: '' },
];

vi.mock('../useResolvedOperationalRoles.js', () => ({
  useResolvedOperationalRoles: () => ({ defs: DEFS }),
}));

import RoleFocusControl from '../RoleFocusControl.js';

function setScope(over: Partial<typeof viewScope>): void {
  Object.assign(viewScope, over);
}

beforeEach(() => {
  Object.assign(viewScope, {
    layerActive: true,
    focusMode: 'role',
    setFocusMode: vi.fn(),
    focusRole: null,
    setFocusRole: vi.fn(),
    canPickRole: true,
    scope: new Set<string>(),
    isScoped: true,
  });
});

describe('RoleFocusControl -- rendering', () => {
  it('renders nothing when neither affordance applies (solo project)', () => {
    setScope({ layerActive: false, canPickRole: false });
    const { container } = render(<RoleFocusControl projectId="p" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('role-focus-control')).toBeNull();
  });

  it('renders both the focus toggle and the picker for an own-role viewer', () => {
    render(<RoleFocusControl projectId="p" />);
    expect(screen.queryByTestId('view-focus-toggle')).not.toBeNull();
    expect(screen.queryByTestId('role-view-as-select')).not.toBeNull();
  });

  it('renders only the picker (no toggle) for a no-role coordinator', () => {
    setScope({ layerActive: false, canPickRole: true });
    render(<RoleFocusControl projectId="p" />);
    expect(screen.queryByTestId('view-focus-toggle')).toBeNull();
    expect(screen.queryByTestId('role-view-as-select')).not.toBeNull();
  });

  it('lists "My roles" plus every resolved role label, defaulting to "My roles"', () => {
    render(<RoleFocusControl projectId="p" />);
    const select = screen.getByTestId('role-view-as-select') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels[0]).toBe('My roles');
    expect(labels).toContain('Livestock Lead');
    expect(labels).toContain('Finance & Legal Lead');
    expect(select.options.length).toBe(DEFS.length + 1);
    expect(select.value).toBe(''); // focusRole null ⇒ "My roles"
  });

  it('reflects the active override role as the selected option', () => {
    setScope({ focusRole: 'livestock' });
    render(<RoleFocusControl projectId="p" />);
    const select = screen.getByTestId('role-view-as-select') as HTMLSelectElement;
    expect(select.value).toBe('livestock');
  });
});

describe('RoleFocusControl -- interaction', () => {
  it('picking a role from Full view sets the role AND flips to role mode', () => {
    setScope({ focusMode: 'full' });
    render(<RoleFocusControl projectId="p" />);
    fireEvent.change(screen.getByTestId('role-view-as-select'), {
      target: { value: 'livestock' },
    });
    expect(viewScope.setFocusRole).toHaveBeenCalledWith('livestock');
    expect(viewScope.setFocusMode).toHaveBeenCalledWith('role');
  });

  it('picking a role while already in role mode does not touch the mode', () => {
    setScope({ focusMode: 'role' });
    render(<RoleFocusControl projectId="p" />);
    fireEvent.change(screen.getByTestId('role-view-as-select'), {
      target: { value: 'finance_legal' },
    });
    expect(viewScope.setFocusRole).toHaveBeenCalledWith('finance_legal');
    expect(viewScope.setFocusMode).not.toHaveBeenCalled();
  });

  it('picking "My roles" clears the override without touching the mode', () => {
    setScope({ focusRole: 'livestock', focusMode: 'role' });
    render(<RoleFocusControl projectId="p" />);
    fireEvent.change(screen.getByTestId('role-view-as-select'), {
      target: { value: '' },
    });
    expect(viewScope.setFocusRole).toHaveBeenCalledWith(null);
    expect(viewScope.setFocusMode).not.toHaveBeenCalled();
  });
});
