/**
 * SectorRadiusControl — single numeric input that lets the steward
 * configure the OBSERVE sector wedge outer radius (metres) for the
 * active project. Persists into `LocalProject.metadata.sectorRadiusM`
 * via `useProjectStore.updateProject`. The renderer
 * (`ObserveAnnotationLayers`) and the export library
 * (`annotationExport`) both subscribe to the same field — typing here
 * doubles the on-map wedges within ~300 ms.
 *
 * Empty input clears the override (writes `undefined`) → the renderer
 * falls back to `DEFAULT_SECTOR_RADIUS_M` (250).
 */

import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../../store/projectStore.js';
import { DEFAULT_SECTOR_RADIUS_M } from '../lib/sectorRadius.js';

interface Props {
  projectId: string | null;
}

const DEBOUNCE_MS = 300;
const MIN_M = 10;
const MAX_M = 5000;

export default function SectorRadiusControl({ projectId }: Props) {
  const stored = useProjectStore((s) => {
    if (!projectId) return undefined;
    return s.projects.find((p) => p.id === projectId)?.metadata?.sectorRadiusM;
  });
  const updateProject = useProjectStore((s) => s.updateProject);

  // Mirror the stored value into a string so the field can also represent
  // an empty / partially-typed state without committing every keystroke.
  const [draft, setDraft] = useState<string>(
    typeof stored === 'number' ? String(stored) : '',
  );

  // External edits (other tab / clear) reflect into the field.
  useEffect(() => {
    setDraft(typeof stored === 'number' ? String(stored) : '');
  }, [stored]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const commit = (next: string) => {
    if (!projectId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = next.trim();
      const project = useProjectStore
        .getState()
        .projects.find((p) => p.id === projectId);
      const prev = project?.metadata ?? {};
      if (trimmed === '') {
        // Clear override → fall back to DEFAULT_SECTOR_RADIUS_M.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sectorRadiusM: _drop, ...rest } = prev;
        updateProject(projectId, { metadata: rest });
        return;
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n <= 0) return;
      const clamped = Math.min(MAX_M, Math.max(MIN_M, n));
      updateProject(projectId, {
        metadata: { ...prev, sectorRadiusM: clamped },
      });
    }, DEBOUNCE_MS);
  };

  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 12,
        maxWidth: 240,
      }}
    >
      <span>Sector wedge radius — m</span>
      <input
        type="number"
        min={MIN_M}
        max={MAX_M}
        step={10}
        placeholder={String(DEFAULT_SECTOR_RADIUS_M)}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        disabled={!projectId}
        style={{
          padding: '4px 6px',
          border: '1px solid #c4a265',
          borderRadius: 4,
          background: '#fff',
          font: 'inherit',
        }}
      />
      <span style={{ color: '#6a5a3a', fontSize: 11 }}>
        Default 250 m. Applied to all sun, wind, fire, noise, wildlife, and
        view sectors.
      </span>
    </label>
  );
}
