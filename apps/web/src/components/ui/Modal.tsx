import React, { useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap.js';
import styles from './Modal.module.css';

/* -------------------------------------------------------------------------- */
/*  Modal — OGDEN Atlas Design System                                         */
/* -------------------------------------------------------------------------- */

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  /* --- Focus trap (shared hook — see ui/useFocusTrap.ts) ----------------- */
  useFocusTrap(panelRef, open, { onEscape: onClose });

  /* --- Overlay click ------------------------------------------------------ */

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  /* --- Render ------------------------------------------------------------- */

  if (!open) return null;

  const panelClassNames = [styles.panel, styles[`size-${size}`]]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    /* a11y: backdrop click dismiss; Escape key handled in useEffect keydown listener above */
    <div className={styles.overlay} onClick={handleOverlayClick} role="presentation">
      <div
        ref={panelRef}
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Header */}
        {(title || description) && (
          <div className={styles.header}>
            {title && (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        {children && <div className={styles.body}>{children}</div>}

        {/* Footer */}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

Modal.displayName = 'Modal';
