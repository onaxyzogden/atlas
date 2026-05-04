import { Children, cloneElement, useId, useRef, useState } from "react";

const DEFAULT_DELAY = 800;

export function Tooltip({ content, delay = DEFAULT_DELAY, side = "top", children }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const tooltipId = useId();

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  const child = Children.only(children);
  const trigger = cloneElement(child, {
    "aria-describedby": open ? tooltipId : child.props["aria-describedby"],
    onMouseEnter: (e) => { child.props.onMouseEnter?.(e); show(); },
    onMouseLeave: (e) => { child.props.onMouseLeave?.(e); hide(); },
    onFocus: (e) => { child.props.onFocus?.(e); show(); },
    onBlur: (e) => { child.props.onBlur?.(e); hide(); },
  });

  return (
    <span className="prim-tooltip-host">
      {trigger}
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`prim-tooltip prim-tooltip--${side}`}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
