import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function SlideUpPane({ open, title, onClose, children }) {
  const closeButtonRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === "function") {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="slide-up-pane-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="slide-up-pane"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="slide-up-pane__header">
          <h2>{title}</h2>
          <button
            ref={closeButtonRef}
            className="slide-up-pane__close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="slide-up-pane__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
