/**
 * TrueNorthAdvisoryBanner — advisory soft-gate shown when the steward is in
 * Observe before Stage 0 (True North) is complete. It never blocks: it offers a
 * shortcut back to define the goal, and a dismiss. Steward-sovereign, mirroring
 * the livestock-gate precedent.
 *
 * Fixed-position so it can mount on any Observe surface (compass grid or the
 * map shell) without participating in their layout. Dismissal is remembered for
 * the session, per project.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Compass, X } from 'lucide-react';
import { useTrueNorthData } from './useTrueNorthData.js';
import css from './TrueNorthAdvisoryBanner.module.css';

function dismissKey(projectId: string) {
  return `ogden-true-north-banner-dismissed:${projectId}`;
}

export default function TrueNorthAdvisoryBanner({
  projectId,
}: {
  projectId: string;
}) {
  const navigate = useNavigate();
  const data = useTrueNorthData(projectId);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissKey(projectId)) === '1',
  );

  if (data.ready || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(dismissKey(projectId), '1');
    setDismissed(true);
  };

  return (
    <div className={css.banner} role="status">
      <Compass size={16} strokeWidth={2} className={css.icon} />
      <p className={css.text}>
        Define your <strong>True North</strong> first — {data.stage.pct}% done.
        You can map anyway, but the Fit Gate will be incomplete.
      </p>
      <button
        type="button"
        className={css.action}
        onClick={() =>
          navigate({
            to: '/v3/project/$projectId/true-north',
            params: { projectId },
          })
        }
      >
        Go to True North
      </button>
      <button
        type="button"
        className={css.dismiss}
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
