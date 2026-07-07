/**
 * @vitest-environment happy-dom
 *
 * EducationalBookletExport × H4 (deep-audit 2026-07-03) — the representative
 * pin for the export/publish call-site pattern: the exports API addresses a
 * project by its SERVER UUID, never the local store id. Synced project →
 * generate fires with serverId; unsynced project → the control disables with
 * an honest "not yet synced" state and no request is ever sent.
 */
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    exports: { generate: vi.fn() },
  },
}));

// Minimal zustand stub — unit isolation from projectStore's persist/seed graph.
vi.mock('../../../store/projectStore.js', async () => {
  const { create } = await import('zustand');
  return {
    useProjectStore: create(() => ({
      projects: [] as Array<{ id: string; serverId?: string | null }>,
    })),
  };
});

import EducationalBookletExport from '../EducationalBookletExport.js';
import { api } from '../../../lib/apiClient.js';
import { useProjectStore } from '../../../store/projectStore.js';
import type { LocalProject } from '../../../store/projectStore.js';

const mockGenerate = vi.mocked(api.exports.generate);

const LOCAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SERVER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// The component only reads id/name from the project prop.
const project = { id: LOCAL_ID, name: 'Test Farm' } as LocalProject;

// The hook only reads id/serverId; the mock store holds these slim rows.
const setProjects = (rows: Array<{ id: string; serverId?: string | null }>) =>
  useProjectStore.setState({ projects: rows as unknown as LocalProject[] });

describe('EducationalBookletExport -- server-id resolution (H4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setProjects([]);
  });
  afterEach(() => {
    cleanup();
  });

  it('generates with the SERVER id, not the local store id', async () => {
    setProjects([{ id: LOCAL_ID, serverId: SERVER_ID }]);
    mockGenerate.mockResolvedValue({ data: { storageUrl: 'https://x/pdf' } } as never);

    render(<EducationalBookletExport project={project} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    expect(mockGenerate).toHaveBeenCalledWith(SERVER_ID, expect.anything());
  });

  it('disables Generate with an honest not-yet-synced state and never fires', () => {
    setProjects([{ id: LOCAL_ID, serverId: null }]);

    render(<EducationalBookletExport project={project} onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: /generate pdf/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/save this project to the server/i);

    fireEvent.click(btn);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
