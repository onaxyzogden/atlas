/**
 * useOfflineGate — hook for gating features that require network connectivity.
 *
 * Usage:
 *   const { isOffline, requireOnline } = useOfflineGate();
 *   <Button disabled={isOffline} onClick={() => requireOnline(doThing, 'PDF Export')} />
 */

import { useConnectivityStore } from '../store/connectivityStore.js';
import { toast } from '../components/Toast.js';
import { FLAGS } from '@ogden/shared';

export function useOfflineGate() {
  const isOnline = useConnectivityStore((s) => s.isOnline);

  // If offline mode feature is not enabled, always report online
  const effectiveOnline = FLAGS.OFFLINE_MODE ? isOnline : true;

  return {
    isOnline: effectiveOnline,
    isOffline: !effectiveOnline,

    /**
     * Guard an action behind a network check.
     * If offline, shows a toast warning and does not execute.
     */
    requireOnline(action: () => void, featureName: string) {
      if (!effectiveOnline) {
        toast.warning(`${featureName} requires an internet connection`);
        return;
      }
      action();
    },
  };
}
