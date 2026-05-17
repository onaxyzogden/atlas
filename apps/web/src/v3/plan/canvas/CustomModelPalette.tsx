/**
 * CustomModelPalette — a section in the PlanTools left rail (Vision /
 * 3D Terrain views only) that lets the steward upload custom GLB files
 * and place them on the map. Mounted by `PlanTools`, not the canvas, so
 * it lives in the shared StageShell left column alongside the other rail
 * sections rather than floating over the map.
 *
 * Per ADR 2026-05-11 Phase 6. Uploads go through `customModelValidator`
 * (magic-byte + extension allowlist + ≤10 MB) before landing in
 * `customModelStore` (IndexedDB-backed). Tiles for each uploaded model
 * arm the canonical `custom-glb` BE tool and stash the model id in
 * `customDrawSelectionStore` so `BeV2ExistingTool` can stamp
 * `proposed.customModelId` on the created entity.
 */

import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useCustomModelStore } from '../../../store/customModelStore.js';
import { useCustomDrawSelectionStore } from '../../../store/customDrawSelectionStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { validateCustomGlb } from './customModelValidator.js';
import css from '../PlanTools.module.css';

const CUSTOM_GLB_TOOL_ID = 'plan.structures-subsystems.be.custom-glb' as const;

export default function CustomModelPalette() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hydrated = useCustomModelStore((s) => s.hydrated);
  const hydrate = useCustomModelStore((s) => s.hydrate);
  const entries = useCustomModelStore((s) => s.entries);
  const add = useCustomModelStore((s) => s.add);
  const remove = useCustomModelStore((s) => s.remove);

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const activeCustomModelId = useCustomDrawSelectionStore(
    (s) => s.activeCustomModelId,
  );
  const setActiveCustomModelId = useCustomDrawSelectionStore((s) => s.set);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  // If the user disarms the custom-glb tool elsewhere, clear the selection.
  useEffect(() => {
    if (activeTool !== CUSTOM_GLB_TOOL_ID && activeCustomModelId) {
      setActiveCustomModelId(null);
    }
  }, [activeTool, activeCustomModelId, setActiveCustomModelId]);

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const result = await validateCustomGlb(file);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      const baseName = file.name.replace(/\.glb$/i, '').slice(0, 40) || 'Custom model';
      await add(baseName, file, result.sha256);
    } catch (err) {
      setError((err as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function onTileClick(id: string) {
    if (activeCustomModelId === id && activeTool === CUSTOM_GLB_TOOL_ID) {
      setActiveCustomModelId(null);
      setActiveTool(null);
      return;
    }
    setActiveCustomModelId(id);
    setActiveTool(CUSTOM_GLB_TOOL_ID);
  }

  const rows = Object.values(entries).sort((a, b) => b.addedAt - a.addedAt);

  return (
    <section className={css.group} aria-label="Custom models">
      <header className={css.groupHeader}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.groupLabel}>Custom models</span>
      </header>

      {rows.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}
        >
          No uploads yet. GLB files up to 10 MB. After uploading,
          click a tile and then click on the map to place.
        </p>
      ) : (
        <div className={css.itemGrid}>
          {rows.map((entry) => {
            const isActive =
              activeTool === CUSTOM_GLB_TOOL_ID &&
              activeCustomModelId === entry.id;
            return (
              <div
                key={entry.id}
                style={{ position: 'relative', display: 'flex' }}
              >
                <button
                  type="button"
                  className={css.toolItem}
                  data-active={isActive ? 'true' : 'false'}
                  aria-pressed={isActive}
                  onClick={() => onTileClick(entry.id)}
                  title={`${entry.label} (${(entry.sizeBytes / 1024).toFixed(0)} KB)`}
                  style={{ flex: 1 }}
                >
                  <span className={css.toolGlyph} aria-hidden="true">
                    <Upload size={16} strokeWidth={1.6} />
                  </span>
                  <span className={css.toolLabel}>{entry.label}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => {
                    void remove(entry.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    lineHeight: 0,
                  }}
                >
                  <Trash2 size={10} strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className={css.openModuleBtn}
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={14} strokeWidth={1.6} aria-hidden="true" />
        <span>{busy ? 'Uploading…' : 'Upload .glb'}</span>
      </button>
      {error && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: 'var(--color-danger, #c84a3f)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
