// ActProgressBar — Plan Nav v1.1 section 4.3. A read-only strip on a Plan
// objective showing how many of its launched Act field-tasks have been
// verified-complete. Plan is read-only for decision completion: this bar
// reflects Act's ground truth (the verification records) without letting the
// steward mutate it here.
//
// The pure derivation is exported for unit testing; the component subscribes
// to the two Act stores (both keyed by LOCAL projectId).

import { useActTaskStore } from '../../../store/olos/actTaskStore.js';
import { useVerificationRecordStore } from '../../../store/olos/verificationRecordStore.js';
import { deriveActProgress } from './actProgress.js';
import css from './ActProgressBar.module.css';

interface Props {
  projectId: string;
  objectiveId: string;
}

export default function ActProgressBar({ projectId, objectiveId }: Props) {
  const tasksById = useActTaskStore((s) => s.byProject[projectId]);
  const verifsById = useVerificationRecordStore((s) => s.byProject[projectId]);

  const tasks = tasksById ? Object.values(tasksById) : [];
  const verifications = verifsById ? Object.values(verifsById) : [];
  const { verified, total } = deriveActProgress(
    tasks,
    verifications,
    objectiveId,
  );

  if (total === 0) {
    return (
      <section className={css.section} aria-label="Act progress">
        <p className={css.empty}>No field actions launched yet</p>
      </section>
    );
  }

  const label = `${verified} of ${total} decisions verified`;
  const pct = Math.round((verified / total) * 100);

  return (
    <section className={css.section} aria-label="Act progress">
      <div className={css.headerRow}>
        <p className={css.eyebrow}>Field verification</p>
        <span className={css.count}>{label}</span>
      </div>
      <div
        className={css.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={verified}
        aria-valuetext={label}
      >
        <div
          className={css.fill}
          data-complete={verified === total ? 'true' : undefined}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
