/**
 * TriggeredProtocolsPanel — shows standing protocols whose IF condition has
 * fired.  Rendered as the first panel in both Act right-rail surfaces
 * (ActOpsAside and ActOpsDashboard) when at least one triggered+non-deferred
 * record exists for the project.
 *
 * Action buttons:
 *   Log Response — flips status → 'active' (card disappears); sets lastLoggedAt.
 *   Defer 24h    — hides card for 24 h via deferredUntil filter in the store.
 *
 * Module-awareness: when activeModule is set, only shows protocols whose
 * `feeds` intersect FEEDS_TO_MODULE[module].  Protocols with no mapped feed
 * pass through (always visible).
 */

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { STANDARD_PROTOCOL_TEMPLATES } from '@ogden/shared';
import { useProtocolStore, useTriggeredProtocols } from '../../../store/protocolStore.js';
import { FEEDS_TO_MODULE } from '../data/protocolFeedsMap.js';
import type { ActModule } from '../types.js';
import css from './ActOpsAside.module.css';

interface Props {
  projectId: string | null;
  activeModule: ActModule | null;
}

export default function TriggeredProtocolsPanel({ projectId, activeModule }: Props) {
  const triggered = useTriggeredProtocols(projectId);
  const logResponse = useProtocolStore((s) => s.logResponse);
  const defer = useProtocolStore((s) => s.defer);

  const [justLogged, setJustLogged] = useState<Set<string>>(new Set());

  if (!projectId || triggered.length === 0) return null;

  const visible = triggered.filter((record) => {
    if (activeModule === null) return true;
    const template = STANDARD_PROTOCOL_TEMPLATES.find((t) => t.id === record.templateId);
    if (!template) return true;
    const hasMappedFeed = template.feeds.some((f) => FEEDS_TO_MODULE[f] !== undefined);
    if (!hasMappedFeed) return true;
    return template.feeds.some((f) => FEEDS_TO_MODULE[f] === activeModule);
  });

  if (visible.length === 0) return null;

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h3 className={css.panelTitle}>Active Protocols</h3>
        <span className={css.panelSubtitle}>{visible.length} triggered</span>
      </div>
      <ul className={css.alertList}>
        {visible.map((record) => {
          const template = STANDARD_PROTOCOL_TEMPLATES.find((t) => t.id === record.templateId);
          if (!template) return null;
          const logged = justLogged.has(record.templateId);
          return (
            <li
              key={record.templateId}
              className={css.alertItem}
              data-protocol="triggered"
            >
              <span className={css.alertIcon}>
                <AlertCircle size={14} aria-hidden="true" />
              </span>
              <div className={css.alertBody}>
                <span className={css.alertTitle}>{template.name}</span>
                <span className={css.alertMeta}>IF {template.condition}</span>
                {template.feeds.length > 0 && (
                  <span className={css.alertChip} data-protocol="triggered">
                    {template.feeds[0]}
                  </span>
                )}
                <div className={css.protocolActions}>
                  <button
                    type="button"
                    className={css.primaryBtn}
                    onClick={() => {
                      logResponse(projectId, record.templateId);
                      setJustLogged((prev) => new Set(prev).add(record.templateId));
                      setTimeout(() => {
                        setJustLogged((prev) => {
                          const next = new Set(prev);
                          next.delete(record.templateId);
                          return next;
                        });
                      }, 1500);
                    }}
                  >
                    {logged ? 'Logged ✓' : 'Log Response'}
                  </button>
                  <button
                    type="button"
                    className={css.secondaryBtn}
                    onClick={() =>
                      defer(
                        projectId,
                        record.templateId,
                        new Date(Date.now() + 86_400_000).toISOString(),
                      )
                    }
                  >
                    Defer 24h
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
