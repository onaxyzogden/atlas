import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { IconButton } from "./IconButton.jsx";

export function Modal({ open, onClose, title, children, size = "md", className = "" }) {
  const trapRef = useFocusTrap(open, onClose);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="prim-modal-backdrop" onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "prim-modal-title" : undefined}
        className={`prim-modal prim-modal--${size} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {title || onClose ? (
          <header className="prim-modal__header">
            {title ? <h2 id="prim-modal-title">{title}</h2> : <span />}
            {onClose ? (
              <IconButton label="Close" onClick={onClose}>
                <X aria-hidden="true" />
              </IconButton>
            ) : null}
          </header>
        ) : null}
        <div className="prim-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
