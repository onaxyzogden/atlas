/**
 * @vitest-environment happy-dom
 *
 * ProjectUrgencyCard role badge (Slice 5.5a). The card shows a small badge
 * for a non-steward role and nothing for owner/primary_steward or when no
 * role is supplied (offline / unsynced).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import type { LocalProject } from '../../../store/projectStore.js';

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

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

import ProjectUrgencyCard from '../ProjectUrgencyCard';

const baseProject = {
  id: 'p-1',
  name: 'Acme Homestead',
  description: null,
  status: 'active',
  serverId: 'srv-1',
  metadata: {},
} as unknown as LocalProject;

afterEach(() => cleanup());

describe('ProjectUrgencyCard role badge', () => {
  it('renders a badge for a non-steward role', () => {
    render(
      <ProjectUrgencyCard project={baseProject} urgency={undefined} role="contractor" />,
    );
    expect(screen.getByText('Contractor')).toBeTruthy();
  });

  it('renders no badge for the owner', () => {
    render(
      <ProjectUrgencyCard project={baseProject} urgency={undefined} role="owner" />,
    );
    expect(screen.queryByText('Owner')).toBeNull();
  });

  it('renders no badge and still shows the project when role is undefined', () => {
    render(<ProjectUrgencyCard project={baseProject} urgency={undefined} />);
    expect(screen.getByText('Acme Homestead')).toBeTruthy();
    expect(screen.queryByText('Contractor')).toBeNull();
  });
});
