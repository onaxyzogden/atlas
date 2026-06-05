/**
 * @vitest-environment happy-dom
 *
 * ProjectBundleBar framing (Phase 5):
 *   - Flag OFF: keeps the data-loss warning (regression lock).
 *   - Flag ON:  reframes as an optional offline backup, no warn role.
 *   - Export / Import controls remain present in both modes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const flags = vi.hoisted(() => ({ SYNC_STATE_BLOBS: false }));
const h = vi.hoisted(() => ({ params: { projectId: 'proj-1' } as { projectId?: string } }));

// ProjectBundleBar renders on the v3 project frame, so it reads the active
// projectId from the router and links to the Protocols dashboard. Stub the
// router: useParams returns the hoisted params; Link renders a plain anchor
// with $projectId interpolated from params.
vi.mock('@tanstack/react-router', () => ({
  useParams: () => h.params,
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to?: string;
    params?: { projectId?: string };
    children?: unknown;
    [k: string]: unknown;
  }) => {
    const href =
      typeof to === 'string'
        ? to.replace('$projectId', params?.projectId ?? '')
        : '#';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (
      <a href={href} {...(rest as any)}>
        {children as any}
      </a>
    );
  },
}));

// Icons are presentational and pull lucide's CJS build (dual-React hazard in
// the test env). Stub them — the unit under test is copy/role/controls.
vi.mock('lucide-react', () => {
  const Icon = () => null;
  return { Download: Icon, Upload: Icon, ShieldAlert: Icon, ShieldCheck: Icon };
});

vi.mock('@ogden/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ogden/shared')>();
  return { ...actual, FLAGS: { ...actual.FLAGS, get SYNC_STATE_BLOBS() { return flags.SYNC_STATE_BLOBS; } } };
});

import { render, screen } from '@testing-library/react';
import ProjectBundleBar from '../ProjectBundleBar.js';

beforeEach(() => {
  flags.SYNC_STATE_BLOBS = false;
  h.params = { projectId: 'proj-1' };
  localStorage.clear();
});

describe('ProjectBundleBar — sync-aware framing', () => {
  it('flag OFF: shows the data-loss warning and a status role', () => {
    render(<ProjectBundleBar />);
    expect(screen.getByText(/permanently delete it/i)).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('flag ON: reframes as an optional offline backup, no warn role', () => {
    flags.SYNC_STATE_BLOBS = true;
    const { container } = render(<ProjectBundleBar />);
    expect(screen.getByText(/syncs to your account across devices/i)).toBeTruthy();
    expect(screen.queryByText(/permanently delete it/i)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[class*="warn"]')).toBeNull();
  });

  it('keeps Export and Import reachable regardless of flag', () => {
    flags.SYNC_STATE_BLOBS = true;
    render(<ProjectBundleBar />);
    expect(screen.getByRole('button', { name: /export bundle/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /import bundle/i })).toBeTruthy();
  });

  it('links to the Protocols dashboard for the active project', () => {
    h.params = { projectId: 'proj-1' };
    render(<ProjectBundleBar />);
    const link = screen.getByRole('link', { name: /protocols/i });
    expect(link.getAttribute('href')).toBe('/v3/project/proj-1/protocols');
  });

  it('omits the Protocols link when no project is active', () => {
    h.params = {};
    render(<ProjectBundleBar />);
    expect(screen.queryByRole('link', { name: /protocols/i })).toBeNull();
  });
});
