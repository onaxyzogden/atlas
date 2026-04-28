/**
 * MatrixTogglesPopover — three boolean overlays driven by matrixTogglesStore.
 *
 * Surfaced from the V3LifecycleSidebar footer's "Matrix Toggles" P0 utility.
 * The toggles persist (localStorage) and will eventually drive map overlays;
 * for v1 they are stored state only — the Discover/Diagnose maps will read
 * the store when the overlay layer lands.
 */

import { useEffect, useRef } from "react";
import { useMatrixTogglesStore } from "../../store/matrixTogglesStore.js";
import css from "./MatrixTogglesPopover.module.css";

export interface MatrixTogglesPopoverProps {
  onClose: () => void;
}

export default function MatrixTogglesPopover({ onClose }: MatrixTogglesPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { topography, sectors, zones, wind, toggle } = useMatrixTogglesStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={css.popover} role="dialog" aria-label="Matrix overlays">
      <h3 className={css.title}>Matrix Overlays</h3>

      <label className={css.row}>
        <input
          type="checkbox"
          checked={topography}
          onChange={() => toggle("topography")}
        />
        <span className={css.rowBody}>
          <span className={css.rowLabel}>Topography</span>
          <span className={css.rowDesc}>Contours, slope, aspect, watersheds</span>
        </span>
      </label>

      <label className={css.row}>
        <input
          type="checkbox"
          checked={sectors}
          onChange={() => toggle("sectors")}
        />
        <span className={css.rowBody}>
          <span className={css.rowLabel}>Sectors</span>
          <span className={css.rowDesc}>Solar arcs (winter · summer · equinox)</span>
        </span>
      </label>

      <label className={css.row}>
        <input
          type="checkbox"
          checked={zones}
          onChange={() => toggle("zones")}
        />
        <span className={css.rowBody}>
          <span className={css.rowLabel}>Zones</span>
          <span className={css.rowDesc}>Use-frequency rings (Zone 0–5)</span>
        </span>
      </label>

      <label className={css.row}>
        <input
          type="checkbox"
          checked={wind}
          onChange={() => toggle("wind")}
        />
        <span className={css.rowBody}>
          <span className={css.rowLabel}>Wind sectors</span>
          <span className={css.rowDesc}>Prevailing wind rose (eight-direction)</span>
        </span>
      </label>

      <div className={css.foot}>
        <button
          type="button"
          className={css.linkBtn}
          onClick={() => toggle("topography")}
        >
          {topography ? "Hide topography" : "Show topography"}
        </button>
        <span className={css.note}>Topography · Sectors · Zones · Wind live</span>
      </div>
    </div>
  );
}
