import { useState } from "react";
import { Icon } from "../icons.js";
import { IconButton, Tooltip } from "./primitives/index.js";

// Inline collapsible pane anchored to top (direction="down") or bottom (direction="up")
// of its parent column. Renders a handle bar on the appropriate edge so the user can
// expand/collapse without the pane disappearing entirely.
export function CollapsiblePane({
  direction = "down",
  title,
  defaultCollapsed = false,
  className = "",
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const cls = [
    "collapsible-pane",
    `collapsible-pane--${direction}`,
    collapsed ? "is-collapsed" : "",
    className,
  ].filter(Boolean).join(" ");

  const Caret = Icon.chevronDown;
  // direction=down: expanded→up(180), collapsed→down(0). direction=up: expanded→down(0), collapsed→up(180).
  const rotateDeg =
    direction === "down" ? (collapsed ? 0 : 180) : collapsed ? 180 : 0;
  const caretRotation = `rotate(${rotateDeg}deg)`;

  const handle = (
    <div className="collapsible-pane__handle">
      {title ? <span className="collapsible-pane__title">{title}</span> : null}
      <Tooltip content={collapsed ? "Expand" : "Collapse"} side={direction === "down" ? "bottom" : "top"}>
        <IconButton
          label={collapsed ? `Expand ${title || "panel"}` : `Collapse ${title || "panel"}`}
          size="sm"
          onClick={() => setCollapsed((c) => !c)}
          className="collapsible-pane__toggle"
        >
          <Caret style={{ transform: caretRotation }} />
        </IconButton>
      </Tooltip>
    </div>
  );

  return (
    <section className={cls} aria-label={title}>
      {direction === "up" ? (collapsed ? null : <div className="collapsible-pane__body">{children}</div>) : null}
      {handle}
      {direction === "down" ? (collapsed ? null : <div className="collapsible-pane__body">{children}</div>) : null}
    </section>
  );
}
