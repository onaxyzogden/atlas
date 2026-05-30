// ActTierToolsRail.tsx
//
// Bottom rail: the real Act quick-log tools (QUICK_LOGS — harvest, water
// check, livestock move). Clicking one arms the matching map tool via the
// shell's onActivate handler (setActiveModule + setActiveTool), so the pin
// the steward then clicks on the canvas opens the right log form through
// ActDrawHost. The currently-armed tool is highlighted from the map-tool
// store's activeTool — so the rail reflects the live armed state even when
// a tool was armed elsewhere.
//
// All three logs always render. Per-objective tool relevance (highlighting
// the log that matches the selected objective's domain) is deferred until
// objectives carry a domain link — there is no objective->module mapping to
// key off today, and inventing one would be fiction.

import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { QUICK_LOGS, type QuickLog } from '../quickLogs.js';
import styles from './ActTierShell.module.css';

interface Props {
  disabled?: boolean;
  onActivate: (log: QuickLog) => void;
}

export default function ActTierToolsRail({ disabled, onActivate }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);

  return (
    <div className={styles.toolsPanel} aria-label="Field log tools">
      <div className={styles.toolsHeader}>
        <span className={styles.toolsLabel}>Field logs</span>
        <span className={styles.toolsHint}>
          Arm a tool, then click the feature on the map to log against it
        </span>
      </div>
      <div className={styles.toolsRow}>
        {QUICK_LOGS.map((log) => {
          const Icon = log.Icon;
          const isArmed = !!log.toolId && activeTool === log.toolId;
          return (
            <button
              key={log.id}
              type="button"
              className={styles.toolBtn}
              data-active={isArmed}
              disabled={disabled}
              onClick={() => onActivate(log)}
              title={log.hint}
            >
              <span className={styles.toolIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <span className={styles.toolText}>
                <span className={styles.toolLabel}>{log.label}</span>
                <span className={styles.toolHint}>{log.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
