/**
 * HostUnionDrilldownCard — floating sticky card surfacing the per-
 * member roster of a single silvopasture host. Slice M of the B4
 * host-canopy-union tooltip remaining-deferrals roadmap.
 *
 * Opened by the `HostUnionContextMenu`'s "Open detail" item.
 * Renders host name + per-member rows (species commonName + layer
 * pill) + an "Open full audit →" link that routes to the
 * `SilvopastureIntegrationCard` via PlanModuleSlideUp (with the
 * matching row scrolled to and highlighted).
 *
 * Strictly presentational — the caller owns lifecycle (mount on
 * `drilldownHost` state, dismiss on ESC / close button /
 * click-outside / "Open full audit"). The caller is also
 * responsible for resolving the per-member roster via the same
 * `resolveMembers` selector that drives the tooltip's
 * `memberCount` — the card iterates whatever rows the caller
 * supplies.
 *
 * Slice O ADR carve-out: per-member layer pills are legitimate.
 * Layer-tinting at the *host* level is information loss (silvopasture
 * is polyculture-by-construction); layer-tinting per *member* is
 * correct metadata because each member genuinely belongs to a single
 * stratum. See `wiki/decisions/2026-05-30-atlas-b4-tooltip-drilldown.md`
 * for the trigger / surface / content design rationale.
 */

import { useLayoutEffect, useState } from 'react';
import styles from './HostUnionDrilldownCard.module.css';
import { drilldownStrings } from './drilldownStrings.js';
import {
  LAYER_LABEL,
  LAYER_TINT,
} from '../cards/plant-systems/guildLayerOrder.js';
import type { GuildLayer } from '../../../store/site-annotations.js';

export interface DrilldownMemberRow {
  /** Stable React key — typically `${guildId}:${memberIndex}`. */
  key: string;
  /** Steward-visible species label (plant catalog commonName, fallback
   *  to speciesId). */
  name: string;
  layer: GuildLayer;
}

export interface HostUnionDrilldownCardProps {
  point: { x: number; y: number };
  hostId: string;
  hostName: string;
  /** Pre-resolved canopy-bearing member rows. The caller iterates the
   *  same set the host-union tooltip's `memberCount` derives from. */
  members: DrilldownMemberRow[];
  onClose: () => void;
  onOpenAudit: (hostId: string) => void;
}

const ESTIMATED_W = 280;
const PER_ROW_H = 24;
const BASE_H = 100;
const CURSOR_GAP = 12;
const EDGE_PADDING = 8;

export function HostUnionDrilldownCard({
  point,
  hostId,
  hostName,
  members,
  onClose,
  onOpenAudit,
}: HostUnionDrilldownCardProps): React.JSX.Element {
  const viewportW =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportH =
    typeof window === 'undefined' ? 768 : window.innerHeight;

  const rawH = BASE_H + members.length * PER_ROW_H;
  const cappedH = Math.min(rawH, Math.max(120, viewportH - 160));
  const anchorRight =
    point.x + ESTIMATED_W + CURSOR_GAP > viewportW - EDGE_PADDING;
  const anchorBottom =
    point.y + cappedH + CURSOR_GAP > viewportH - EDGE_PADDING;
  const left = anchorRight
    ? Math.max(EDGE_PADDING, point.x - ESTIMATED_W - CURSOR_GAP)
    : point.x + CURSOR_GAP;
  const top = anchorBottom
    ? Math.max(EDGE_PADDING, point.y - cappedH - CURSOR_GAP)
    : point.y + CURSOR_GAP;

  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      className={styles.card}
      data-testid="host-union-drilldown-card"
      data-host-id={hostId}
      role="dialog"
      aria-label={`${hostName} — host detail`}
      {...(visible ? { 'data-visible': 'true' } : {})}
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div className={styles.hostName}>{hostName}</div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label={drilldownStrings.closeLabel}
          data-testid="host-union-drilldown-close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className={styles.sectionHeader}>
        {drilldownStrings.membersHeader}
      </div>

      {members.length === 0 ? (
        <div className={styles.empty} data-testid="host-union-drilldown-empty">
          {drilldownStrings.emptyMembers}
        </div>
      ) : (
        <ul className={styles.memberList} role="list">
          {members.map((m) => (
            <li
              key={m.key}
              className={styles.memberRow}
              data-testid={`host-union-drilldown-row-${m.key}`}
            >
              <span className={styles.memberName}>{m.name}</span>
              <span
                className={styles.layerPill}
                data-layer={m.layer}
                style={
                  { '--pill-tint': LAYER_TINT[m.layer] } as React.CSSProperties
                }
              >
                {LAYER_LABEL[m.layer]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={styles.auditLink}
        data-testid="host-union-drilldown-open-audit"
        onClick={() => onOpenAudit(hostId)}
      >
        {drilldownStrings.openFullAudit}
      </button>
    </div>
  );
}
