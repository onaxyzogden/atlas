/**
 * MonitoringStreamPanel -- the display-only green "monitoring stream" panel of a
 * Mode-4 (Design) objective. Renders the objective's `monitoringProtocol`: the
 * Key Indicators it will watch, the Response Triggers that act on them, and the
 * single Feeds stream label naming where those readings flow in the Observe
 * stage.
 *
 * Pure presentational. The protocol is authored in the shared catalogue and is
 * DISPLAY-ONLY -- it never gates. `feeds` is a free-text stream label, NOT an
 * Observe-domain wire (Threshold 2, which audits monitoring, is deferred), so it
 * renders as a plain line, not a domain chip.
 */

import { Gauge, Telescope } from 'lucide-react';
import css from './MonitoringStreamPanel.module.css';

export interface MonitoringStreamPanelProps {
  indicators: readonly string[];
  triggers: readonly string[];
  feeds: string;
}

export default function MonitoringStreamPanel({
  indicators,
  triggers,
  feeds,
}: MonitoringStreamPanelProps) {
  return (
    <section
      className={css.panel}
      data-testid="monitoring-stream"
      aria-label="Monitoring stream"
    >
      <div className={css.head}>
        <Gauge size={14} aria-hidden="true" className={css.icon} />
        <p className={css.title}>Monitoring stream</p>
      </div>

      <div className={css.group}>
        <p className={css.groupLabel}>Key indicators</p>
        <ul className={css.list}>
          {indicators.map((text) => (
            <li key={text} className={css.item}>
              <span className={css.bullet} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={css.group}>
        <p className={css.groupLabel}>Response triggers</p>
        <ul className={css.list}>
          {triggers.map((text) => (
            <li key={text} className={`${css.item} ${css.itemTrigger}`}>
              <span className={css.bullet} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={css.feeds} data-testid="monitoring-stream-feeds">
        <Telescope size={13} aria-hidden="true" className={css.icon} />
        <span className={css.feedsLabel}>Feeds</span>
        <span>{feeds}</span>
      </p>
    </section>
  );
}
