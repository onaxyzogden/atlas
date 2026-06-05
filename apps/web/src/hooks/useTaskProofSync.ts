/**
 * useTaskProofSync - pulls a single ActTask's ProofRecords + VerificationRecords
 * from the server on mount (and when the task changes) so a freshly opened
 * device sees proofs captured / verifications signed off elsewhere.
 *
 * No-op for local-only projects (no serverId) or when no task is given: the
 * formal proof path is an authenticated + synced capability. Safe to call
 * unconditionally (before any early return) because it guards on its own
 * arguments. Mirrors useActTaskSync.
 */
import { useEffect } from 'react';
import {
  useProofRecordStore,
  useVerificationRecordStore,
} from '../store/olos/index.js';

export function useTaskProofSync(
  localProjectId?: string,
  serverId?: string,
  taskId?: string,
): void {
  useEffect(() => {
    if (!localProjectId || !serverId || !taskId) return;
    void useProofRecordStore
      .getState()
      .pullForTask(localProjectId, serverId, taskId);
    void useVerificationRecordStore
      .getState()
      .pullForTask(localProjectId, serverId, taskId);
  }, [localProjectId, serverId, taskId]);
}
