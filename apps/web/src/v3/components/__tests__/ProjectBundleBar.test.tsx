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
});
