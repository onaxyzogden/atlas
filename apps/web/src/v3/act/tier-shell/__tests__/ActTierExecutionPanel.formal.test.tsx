/**
 * @vitest-environment happy-dom
 *
 * ActTierExecutionPanel - formal proof/verification section (P1.5, fork 2026-06-04).
 *
 * Pins the four contract points from the Phase-1 plan:
 *   (a) flag-off  -> no "Verification" section; lightweight "Record observation" intact.
 *   (b) flag-on + synced + a handoff-seeded ActTask for this objective's domain
 *       -> "Verification" section + the TaskProofPanel mount.
 *   (c) flag-on + offline (no serverId) -> no formal section; lightweight intact.
 *   (d) flag-on + a PASS sign-off -> a task_verification ObserveDataPoint emitted
 *       carrying this objective's domainId + sourceObjectiveId (so it slots into
 *       the existing Observe rollup exactly like the lightweight path).
 *
 * The domain seam: the seeded ActTask's objectiveId is the UNIVERSAL Act
 * catalogue id (resolveActObjectiveId(OBJ)), NOT OBJ.id - the bridge links the
 * two id spaces by domain, never by id-equality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into childless <svg>, which
// React 18 + happy-dom reject on re-render. Stub every export (established
// pattern, ActTierExecutionPanel.protocols.test).
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

// TaskProofPanel's useTaskProofSync + push verbs hit the OLOS api; mock it so
// the proof/verification/task round-trips are in-memory (mirrors the
// TaskProofPanel unit test's hoisted mock).
const h = vi.hoisted(() => ({
  proofListResp: [] as unknown[],
  verifyListResp: [] as unknown[],
  proofCreateResp: null as unknown,
  verifyCreateResp: null as unknown,
  taskUpdateResp: null as unknown,
  verifyCreateCalls: [] as Array<{ projectId: string; taskId: string; input: any }>,
  taskUpdateCalls: [] as Array<{ projectId: string; taskId: string; patch: any }>,
}));

vi.mock('../../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      proofs: {
        list: vi.fn(async () => ({ data: h.proofListResp, error: null })),
        create: vi.fn(async () => ({ data: h.proofCreateResp, error: null })),
      },
      verifications: {
        list: vi.fn(async () => ({ data: h.verifyListResp, error: null })),
        create: vi.fn(
          async (projectId: string, taskId: string, input: unknown) => {
            h.verifyCreateCalls.push({ projectId, taskId, input });
            return { data: h.verifyCreateResp, error: null };
          },
        ),
      },
      tasks: {
        list: vi.fn(async () => ({ data: [], error: null })),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: unknown) => {
            h.taskUpdateCalls.push({ projectId, taskId, patch });
            return { data: h.taskUpdateResp, error: null };
          },
        ),
      },
    },
  },
}));

import {
  findPlanStratumObjective,
  resolveActObjectiveId,
  getPrimaryDomainForObjective,
  type ActTask,
  type ProjectMemberRecord,
  type ProofRecord,
  type VerificationRecord,
} from '@ogden/shared';
import {
  useProofRecordStore,
  useVerificationRecordStore,
  useActTaskStore,
} from '../../../../store/olos/index.js';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { usePlanStratumProgressStore } from '../../../../store/planStratumStore.js';
import { useActEvidenceStore } from '../../../../store/actEvidenceStore.js';
import { OLOS_FORMAL_PROOF_LS_KEY } from '../../../../config/olosFlags.js';
import ActTierExecutionPanel from '../ActTierExecutionPanel.js';

const PROJECT_ID = 'proj-formal';
const SERVER_ID = 'srv-formal';
const OBJ = findPlanStratumObjective('s5-water-strategy')!;
const ACT_OBJECTIVE_ID = resolveActObjectiveId(OBJ)!;
const DOMAIN_ID = getPrimaryDomainForObjective(OBJ)!;

const REVIEWER: ProjectMemberRecord = {
  userId: 'u-rev',
  email: 'rev@x.io',
  displayName: 'Reviewer',
  role: 'reviewer',
  operationalRoles: [],
  joinedAt: '2026-01-01T00:00:00.000Z',
};

function actTask(p: Partial<ActTask> = {}): ActTask {
  return {
    id: 'srv-task-1',
    projectId: PROJECT_ID,
    objectiveId: ACT_OBJECTIVE_ID, // universal Act catalogue id, NOT OBJ.id
    handoffPackageId: 'pkg-1',
    title: 'Verify water strategy',
    description: '',
    priority: 'normal',
    status: 'completed-pending-verification',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as ActTask;
}

function serverProof(): ProofRecord {
  return {
    id: 'uuid-proof', // server-saved (no 'proof-' prefix) -> citable in sign-off
    projectId: SERVER_ID,
    taskId: 'srv-task-1',
    proofType: 'note',
    note: 'inspected',
    capturedAt: '2026-01-01T00:00:00.000Z',
    verificationStatus: 'pending',
  } as ProofRecord;
}

function resetAll() {
  useProofRecordStore.setState({ byProject: {}, syncByProject: {} });
  useVerificationRecordStore.setState({ byProject: {}, syncByProject: {} });
  useActTaskStore.setState({ byProject: {}, syncByProject: {} });
  useObserveDataPointStore.setState({ byProject: {} });
  usePlanStratumProgressStore.setState({ byProject: {} });
  useActEvidenceStore.setState({ byProject: {} });
  window.localStorage.clear();
  h.proofListResp = [];
  h.verifyListResp = [];
  h.proofCreateResp = null;
  h.verifyCreateResp = null;
  h.taskUpdateResp = null;
  h.verifyCreateCalls = [];
  h.taskUpdateCalls = [];
}

beforeEach(() => resetAll());
afterEach(() => cleanup());

function renderPanel(props: {
  serverId?: string;
  members?: ProjectMemberRecord[];
  currentUserId?: string;
  myRole?: ProjectMemberRecord['role'];
} = {}) {
  return render(
    <ActTierExecutionPanel
      projectId={PROJECT_ID}
      tier={undefined}
      objective={OBJ}
      status="active"
      serverId={props.serverId}
      members={props.members}
      currentUserId={props.currentUserId}
      myRole={props.myRole}
    />,
  );
}

describe('ActTierExecutionPanel - formal verification section', () => {
  it('(a) flag-off: no Verification section even when synced with a seeded task', () => {
    useActTaskStore.setState({
      byProject: { [PROJECT_ID]: { 'srv-task-1': actTask() } },
    });
    renderPanel({ serverId: SERVER_ID, members: [REVIEWER] });

    expect(screen.queryByText('Verification')).toBeNull();
    expect(screen.queryByText('Proof and verification')).toBeNull();
    // Lightweight completion path is intact.
    expect(screen.getByText('Record observation')).toBeTruthy();
  });

  it('(b) flag-on + synced + seeded task: Verification section + TaskProofPanel mount', () => {
    window.localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'true');
    useActTaskStore.setState({
      byProject: { [PROJECT_ID]: { 'srv-task-1': actTask() } },
    });
    renderPanel({ serverId: SERVER_ID, members: [REVIEWER] });

    expect(screen.getByText('Verification')).toBeTruthy();
    expect(screen.getByText('Proof and verification')).toBeTruthy();
  });

  it('(b2) flag-on + synced + no task: surfaces the no-formal-task hint, no panel', () => {
    window.localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'true');
    renderPanel({ serverId: SERVER_ID, members: [REVIEWER] });

    expect(screen.getByText('Verification')).toBeTruthy();
    expect(screen.getByText(/No formal task yet/)).toBeTruthy();
    expect(screen.queryByText('Proof and verification')).toBeNull();
  });

  it('(c) flag-on + offline (no serverId): no formal section; lightweight intact', () => {
    window.localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'true');
    useActTaskStore.setState({
      byProject: { [PROJECT_ID]: { 'srv-task-1': actTask() } },
    });
    renderPanel({ members: [REVIEWER] }); // no serverId

    expect(screen.queryByText('Verification')).toBeNull();
    expect(screen.getByText('Record observation')).toBeTruthy();
  });

  it('(d) a PASS sign-off emits a task_verification ObserveDataPoint keyed to this objective', async () => {
    window.localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'true');
    useActTaskStore.setState({
      byProject: { [PROJECT_ID]: { 'srv-task-1': actTask() } },
    });
    // A server-saved proof exists for the task so sign-off is armed.
    h.proofListResp = [serverProof()];
    h.verifyCreateResp = {
      id: 'uuid-verify',
      projectId: SERVER_ID,
      taskId: 'srv-task-1',
      outcome: 'pass',
      criteriaChecked: [],
      requiredReworkIds: [],
      proofRecordIds: ['uuid-proof'],
      notes: 'looks good',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    } as VerificationRecord;
    h.taskUpdateResp = actTask({ status: 'verified-complete' });

    renderPanel({
      serverId: SERVER_ID,
      members: [REVIEWER],
      currentUserId: 'u-rev',
      myRole: 'reviewer',
    });

    // Wait for the synced proof to populate so "Sign off" is enabled.
    await screen.findByText('Sign off');
    fireEvent.click(screen.getByText('Sign off'));

    await waitFor(() => {
      const points = useObserveDataPointStore.getState().byProject[PROJECT_ID] ?? [];
      expect(points.some((p) => p.sourceType === 'task_verification')).toBe(true);
    });

    const point = (useObserveDataPointStore.getState().byProject[PROJECT_ID] ?? []).find(
      (p) => p.sourceType === 'task_verification',
    )!;
    expect(point.domainId).toBe(DOMAIN_ID);
    expect(point.sourceObjectiveId).toBe(OBJ.id); // PlanStratumObjective id space
    expect(point.sourceActionId).toBe('srv-task-1'); // the verified ActTask
    expect(point.capturedBy).toBe('act-tier-formal');
    expect(point.statusOutput).toBe('clear');
  });
});
