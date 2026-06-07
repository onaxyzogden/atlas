// DevUnlockToggle — DEV-ONLY header affordance to bypass the Plan prerequisite
// lock gate across both the Plan and Act stages. Flips `useDevUnlockStore`,
// which PlanStratumShell and ActTierShell read to lift `locked` statuses.
//
// Renders nothing in a production build (`import.meta.env.DEV` is statically
// false, so the whole control tree-shakes out). Positioned fixed in the top
// header strip so it is reachable from every stage without disturbing the
// StageSpine layout.

import { Lock, LockOpen } from 'lucide-react';
import { useDevUnlockStore } from '../store/devUnlockStore.js';

export default function DevUnlockToggle() {
  const unlockAll = useDevUnlockStore((s) => s.unlockAll);
  const toggle = useDevUnlockStore((s) => s.toggle);

  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={unlockAll}
      title="DEV: unlock all strata (bypass prerequisite gate)"
      data-testid="dev-unlock-all-toggle"
      style={{
        position: 'fixed',
        top: 8,
        right: 12,
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        border: `1px solid ${unlockAll ? '#c4a265' : 'rgba(148, 163, 184, 0.5)'}`,
        background: unlockAll ? 'rgba(196, 162, 101, 0.18)' : 'rgba(15, 23, 42, 0.6)',
        color: unlockAll ? '#e7c98a' : '#cbd5e1',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
    >
      {unlockAll ? (
        <LockOpen size={13} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Lock size={13} strokeWidth={2} aria-hidden="true" />
      )}
      {unlockAll ? 'Strata unlocked (dev)' : 'Unlock all (dev)'}
    </button>
  );
}
