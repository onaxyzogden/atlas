import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.js";
import { MAP_STYLES } from "../lib/mapStyles.js";

export function MapToolbar({
  styleId,
  onStyleChange,
  pitch,
  onPitchToggle,
  measuring,
  onMeasureToggle,
  lastMeasureKm,
  onReset,
}) {
  const [stylesOpen, setStylesOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!stylesOpen) return;
    const onDoc = (e) => {
      if (!popoverRef.current?.contains(e.target)) setStylesOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [stylesOpen]);

  return (
    <div className="land-brief-toolbar" role="toolbar" aria-label="Map tools">
      <div className="land-brief-toolbar-group" ref={popoverRef}>
        <button
          type="button"
          className={`land-brief-tool${stylesOpen ? " is-on" : ""}`}
          aria-expanded={stylesOpen}
          aria-label="Base map"
          title="Base map"
          onClick={() => setStylesOpen((v) => !v)}
        >
          <Icon.layers aria-hidden="true" />
        </button>
        {stylesOpen ? (
          <ul className="land-brief-tool-popover" role="menu">
            {Object.values(MAP_STYLES).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={s.id === styleId}
                  className={`land-brief-tool-popover-item${s.id === styleId ? " is-on" : ""}`}
                  onClick={() => {
                    onStyleChange(s.id);
                    setStylesOpen(false);
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        className={`land-brief-tool${pitch > 0 ? " is-on" : ""}`}
        aria-pressed={pitch > 0}
        aria-label={pitch > 0 ? "Switch to 2D" : "Switch to 3D"}
        title={pitch > 0 ? "2D view" : "3D view"}
        onClick={onPitchToggle}
      >
        <Icon.mountain aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`land-brief-tool${measuring ? " is-on" : ""}`}
        aria-pressed={measuring}
        aria-label="Measure distance"
        title="Measure distance"
        onClick={onMeasureToggle}
      >
        <Icon.ruler aria-hidden="true" />
      </button>

      <button
        type="button"
        className="land-brief-tool"
        aria-label="Reset view"
        title="Reset view"
        onClick={onReset}
      >
        <Icon.home aria-hidden="true" />
      </button>

      {measuring && lastMeasureKm != null ? (
        <div className="land-brief-tool-readout" aria-live="polite">
          {lastMeasureKm < 1 ? `${Math.round(lastMeasureKm * 1000)} m` : `${lastMeasureKm.toFixed(2)} km`}
        </div>
      ) : null}
    </div>
  );
}
