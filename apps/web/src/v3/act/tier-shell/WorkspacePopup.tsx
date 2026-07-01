/**
 * WorkspacePopup -- a centered-modal popup that animates BOTH appearance and
 * disappearance.
 *
 * The shared <Modal> portals + traps focus + scale-fades IN, but it returns
 * null on close, so its exit is instant. The Tier-0 workbench needs the working
 * panel to animate OUT as well, so this component adds a small enter/exit state
 * machine around the same vocabulary (portal to body, useFocusTrap, the Modal
 * scrim + --ease-bounce panel motion).
 *
 * Lifecycle (phase):
 *   closed  -> nothing mounted.
 *   open    -> mounted; scrim + panel run the IN keyframes.
 *   closing -> still mounted; panel runs the OUT keyframes. When the panel's
 *              animationend fires we call onClose() and drop to `closed`.
 *
 * Close affordances (close button / backdrop / Escape) only request a close:
 * they set phase='closing' and DEFER onClose() until the exit animation ends,
 * so the parent's selection (and thus `children`) stays valid throughout the
 * animation. An EXTERNAL close (parent flips `open` to false while we're open,
 * e.g. switching objectives) also animates out -- we render the children frozen
 * at their last-open value so the panel fades with content rather than blank.
 *
 * ASCII-only; design tokens are project var()s with literal fallbacks
 * (see WorkspacePopup.module.css).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../../components/ui/useFocusTrap.js';
import css from './WorkspacePopup.module.css';

type Phase = 'closed' | 'open' | 'closing';

export interface WorkspacePopupProps {
  open: boolean;
  /** Called once the exit animation has finished and the popup may unmount. */
  onClose: () => void;
  children: React.ReactNode;
  /** Optional accessible label for the dialog. */
  ariaLabel?: string;
}

export const WorkspacePopup: React.FC<WorkspacePopupProps> = ({
  open,
  onClose,
  children,
  ariaLabel = 'Objective workspace',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed');

  // Last children rendered while open -- shown during `closing` so an external
  // close (parent already cleared its selection) still animates out with content.
  const frozenChildren = useRef<React.ReactNode>(children);
  if (open) frozenChildren.current = children;

  // Drive the machine from the `open` prop.
  useEffect(() => {
    if (open) {
      setPhase('open');
    } else {
      // Only animate out if we were actually mounted; ignore the closed->closed
      // case (initial mount with open=false).
      setPhase((p) => (p === 'closed' ? 'closed' : 'closing'));
    }
  }, [open]);

  // Trap focus only while fully open (not during the exit animation).
  const requestClose = useCallback(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);
  useFocusTrap(panelRef, phase === 'open', { onEscape: requestClose });

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) requestClose();
    },
    [requestClose],
  );

  // When the panel's OUT animation ends, finish the close: notify the parent and
  // drop to `closed` so the portal unmounts.
  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      // Only the panel's OWN keyframe should advance the machine -- ignore
      // animationend bubbling up from any animated child content.
      if (e.target !== e.currentTarget) return;
      if (phase === 'closing') {
        setPhase('closed');
        onClose();
      }
    },
    [phase, onClose],
  );

  if (phase === 'closed') return null;

  // During `closing` the parent may already have cleared its selection, so fall
  // back to the frozen copy captured on the last open render.
  const body = phase === 'open' ? children : frozenChildren.current;

  return createPortal(
    <div
      className={css.overlay}
      data-state={phase}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={css.panel}
        data-state={phase}
        onAnimationEnd={handleAnimationEnd}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        id={dialogId}
        tabIndex={-1}
      >
        <button
          type="button"
          className={css.closeButton}
          onClick={requestClose}
          aria-label="Close workspace"
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
        <div className={css.body}>{body}</div>
      </div>
    </div>,
    document.body,
  );
};

WorkspacePopup.displayName = 'WorkspacePopup';

export default WorkspacePopup;
