// PortfolioBatchActionBar.tsx
//
// Sticky bottom action bar for the v3 Portfolio multi-select toolbar. Shown by
// PortfolioHomePage whenever select mode is on and at least one project is
// checked, on either the dashboard grid or the map list. Modeled on the legacy
// HomePage compare-bar pattern (.compareBar), but the actions are lifecycle
// operations rather than navigation:
//
//   - When viewing ACTIVE projects: primary = Archive (reversible), Delete.
//   - When viewing ARCHIVED projects: primary = Unarchive (restore), Delete.
//
// The bar is purely presentational — it owns no selection state and runs no
// store action itself; every handler is supplied by the host, which also owns
// the confirm dialogs. `busy` disables the buttons while a batch op is running.

import { Button } from '../../components/ui/Button.js';
import css from './PortfolioBatchActionBar.module.css';

export interface PortfolioBatchActionBarProps {
  count: number;
  /** Whether the host is currently showing the archived set (drives the
   *  primary action: Unarchive when true, Archive when false). */
  showingArchived: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function PortfolioBatchActionBar({
  count,
  showingArchived,
  onArchive,
  onUnarchive,
  onDelete,
  onCancel,
  busy = false,
}: PortfolioBatchActionBarProps) {
  return (
    <div className={css.bar} role="region" aria-label="Batch project actions">
      <span className={css.text}>
        {count} {count === 1 ? 'project' : 'projects'} selected
      </span>
      <div className={css.actions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {showingArchived ? (
          <Button variant="primary" size="sm" onClick={onUnarchive} disabled={busy}>
            Unarchive ({count})
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onArchive} disabled={busy}>
            Archive ({count})
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
          Delete ({count})
        </Button>
      </div>
    </div>
  );
}
