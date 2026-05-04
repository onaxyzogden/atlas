import { useState } from "react";

export function QaOverlay({ reference, nativeWidth, nativeHeight }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(45);

  const referenceSrc = reference?.startsWith("/")
    ? reference
    : `/src/assets/reference/${reference}`;

  return (
    <aside
      className={`qa-panel ${open ? "is-open" : ""}`}
      aria-label="Reference overlay controls"
      style={{
        "--qa-native-width": nativeWidth ? `${nativeWidth}px` : undefined,
        "--qa-native-height": nativeHeight ? `${nativeHeight}px` : undefined,
        "--qa-aspect-ratio": nativeWidth && nativeHeight ? `${nativeWidth} / ${nativeHeight}` : undefined
      }}
    >
      <button className="qa-toggle" type="button" onClick={() => setOpen(!open)}>
        QA
      </button>
      {open ? (
        <>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Source overlay
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(event) => setOpacity(event.target.value)}
            aria-label="Overlay opacity"
          />
        </>
      ) : null}
      {enabled ? (
        <img
          className="qa-reference"
          src={referenceSrc}
          alt=""
          style={{ opacity: Number(opacity) / 100 }}
        />
      ) : null}
    </aside>
  );
}
