/**
 * StampModePicker — floating two-chip strip that appears while a
 * fill-eligible point design-element kind is armed (point geometry +
 * `defaultSpacingM` set on the spec). Lets the steward switch between
 * single-click placement (`free`) and polygon-fill stamping (`fill`)
 * without re-arming the kind.
 *
 * Mounted once in `PlanLayout` so it covers both Current and Vision
 * canvases. Reads `activeTool` from `useMapToolStore` and resolves it
 * to an elementCatalog spec; renders nothing if the active tool isn't
 * a fill-eligible point kind. Writes to `useStampModeStore`.
 */

import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { findElementSpec } from './elementCatalog.js';
import { useStampModeStore, type StampMode } from './stampModeStore.js';

/** Tool-id prefixes that route through the design-element draw flow.
 *  Mirrors the `DESIGN_ELEMENT_TOOL_IDS` set in `PlanDrawHost.tsx`
 *  and the `useActiveElementKind` mapping in `useToolIdToElementKind`. */
function toolIdToKind(toolId: string | null): string | null {
  if (!toolId) return null;
  if (toolId.startsWith('plan.')) return toolId.split('.').pop() ?? null;
  return toolId;
}

export default function StampModePicker() {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const mode = useStampModeStore((s) => s.mode);
  const setMode = useStampModeStore((s) => s.setMode);

  const kind = toolIdToKind(activeTool);
  const spec = kind ? findElementSpec(kind) : undefined;
  const eligible =
    !!spec && spec.drawMode === 'draw_point' && !!spec.defaultSpacingM;

  if (!eligible) return null;

  const chip = (value: StampMode, glyph: string, label: string) => {
    const active = mode === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setMode(value)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        style={{
          width: 36,
          height: 32,
          borderRadius: 8,
          border: '1px solid rgba(196, 162, 101, 0.28)',
          background: active
            ? 'rgba(196, 162, 101, 0.92)'
            : 'rgba(20, 22, 18, 0.72)',
          color: active ? '#1a1a14' : '#ddd1b4',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {glyph}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Stamp mode"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 132,
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        borderRadius: 12,
        background: 'rgba(12, 14, 10, 0.78)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.22)',
        zIndex: 50,
      }}
    >
      {chip('free', '•', 'Single placement')}
      {chip('fill', '▦', 'Polygon fill')}
    </div>
  );
}
