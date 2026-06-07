/**
 * ActHandoffPreviewPanel - read-only "what approval will generate" preview for
 * PLAN Module 5 (Slice A4). Shows the loop approval-gate verdict and the Act
 * handoff payload that buildLoopActPayload would emit, so a steward sees exactly
 * what crosses to Act before approving.
 *
 * Presentational: reads the project-scoped flows / fertility infra / validation,
 * runs the pure canApproveLoop + buildLoopActPayload helpers, and renders the
 * result. All logic lives in loopApprovalGate.ts / loopHandoffContract.ts (tested
 * there); this file only wires data and markup.
 */

import { useMemo } from 'react';
import {
  getAllowOrphanOutputs,
  type LocalProject,
} from '../../../store/projectStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useClosedLoopValidation } from '../useClosedLoopValidation.js';
import { canApproveLoop } from './loopApprovalGate.js';
import { buildLoopActPayload } from './loopHandoffContract.js';
import styles from './ActHandoffPreviewPanel.module.css';

interface Props {
  project: LocalProject;
}

export default function ActHandoffPreviewPanel({ project }: Props) {
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const allInfra = useClosedLoopStore((s) => s.fertilityInfra);

  const flows = useMemo(
    () => allFlows.filter((f) => f.projectId === project.id),
    [allFlows, project.id],
  );
  const infra = useMemo(
    () => allInfra.filter((i) => i.projectId === project.id),
    [allInfra, project.id],
  );

  const validation = useClosedLoopValidation(project);
  const allowOrphanOutputs = getAllowOrphanOutputs(project);

  const verdict = useMemo(
    () => canApproveLoop(validation, allowOrphanOutputs),
    [validation, allowOrphanOutputs],
  );

  const { payload, summary } = useMemo(
    () => buildLoopActPayload({ id: project.id }, flows, infra, validation),
    [project.id, flows, infra, validation],
  );

  return (
    <section
      className={styles.panel}
      aria-label="Act handoff preview"
      data-testid="act-handoff-preview"
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Act handoff preview</h2>
        <span
          className={styles.verdict}
          data-ok={verdict.ok ? 'true' : 'false'}
          data-testid="loop-approval-verdict"
        >
          {verdict.ok ? 'Ready to approve' : 'Blocked'}
        </span>
      </header>

      <p className={styles.reason}>{verdict.reason}</p>

      <dl className={styles.counts}>
        <Count label="Flows" value={summary.flowCount} />
        <Count label="Closed loop" value={summary.closedLoopCount} />
        <Count
          label="Dangling ends"
          value={verdict.counts.danglingEndpoints}
          warn={verdict.counts.danglingEndpoints > 0}
        />
        <Count
          label="Orphan outputs"
          value={verdict.counts.orphanOutputs}
          warn={verdict.counts.orphanOutputs > 0 && !allowOrphanOutputs}
        />
      </dl>

      <p className={styles.scope}>{payload.workScope}</p>

      <div className={styles.sections}>
        <PreviewList
          title="Materials"
          testid="handoff-materials"
          items={(payload.materials ?? []).map((m) => ({
            id: m.id,
            primary: m.name,
            secondary:
              m.quantity != null
                ? `${m.quantity} ${m.unit ?? ''}`.trim()
                : (m.sourceNote ?? ''),
          }))}
        />
        <PreviewList
          title="Monitoring"
          testid="handoff-monitoring"
          items={(payload.monitoringRequirements ?? []).map((r) => ({
            id: r.id,
            primary: r.description,
            secondary: r.cadence ?? '',
          }))}
        />
        <PreviewList
          title="Success criteria"
          testid="handoff-success"
          items={(payload.successCriteria ?? []).map((c) => ({
            id: c.id,
            primary: c.description,
            secondary: c.measurement ?? '',
          }))}
        />
        <PreviewList
          title="Sequence"
          testid="handoff-sequence"
          ordered
          items={(payload.sequence ?? []).map((s, i) => ({
            id: `seq-${i}`,
            primary: s,
            secondary: '',
          }))}
        />
      </div>
    </section>
  );
}

function Count({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className={styles.count}>
      <dt className={styles.countLabel}>{label}</dt>
      <dd className={styles.countValue} data-warn={warn ? 'true' : undefined}>
        {value}
      </dd>
    </div>
  );
}

interface PreviewItem {
  id: string;
  primary: string;
  secondary: string;
}

function PreviewList({
  title,
  testid,
  items,
  ordered,
}: {
  title: string;
  testid: string;
  items: PreviewItem[];
  ordered?: boolean;
}) {
  return (
    <div className={styles.section} data-testid={testid}>
      <h3 className={styles.sectionTitle}>
        {title} <span className={styles.sectionCount}>{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className={styles.empty}>None</p>
      ) : (
        <ol className={styles.list} data-ordered={ordered ? 'true' : undefined}>
          {items.map((it) => (
            <li key={it.id} className={styles.item}>
              <span className={styles.itemPrimary}>{it.primary}</span>
              {it.secondary ? (
                <span className={styles.itemSecondary}>{it.secondary}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
