// ActOpsHubHeader.tsx
//
// Thin header band for the Operations Hub: a stage eyebrow, the project name as
// the title, and today's date. No data dependency beyond the project name — the
// metric strip below carries the live counts. The header-search and date
// navigation in the inspiration mock are deferred to Phase 4.

import { format } from 'date-fns';
import css from './ActOpsHubHeader.module.css';

interface Props {
  projectName: string;
}

export default function ActOpsHubHeader({ projectName }: Props) {
  const today = format(new Date(), 'EEEE, d MMMM yyyy');
  return (
    <header className={css.header}>
      <div className={css.titleBlock}>
        <span className={css.eyebrow}>Operations Hub</span>
        <h1 className={css.title}>{projectName}</h1>
      </div>
      <time className={css.date}>{today}</time>
    </header>
  );
}
