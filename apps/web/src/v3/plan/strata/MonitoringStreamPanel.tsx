/**
 * MonitoringStreamPanel -- the display-only green "monitoring stream" panel of a
 * Mode-4 (Design) objective. Renders the objective's `monitoringProtocol`: the
 * Key Indicators it will watch (each a metric + its measurement frequency), the
 * Response Triggers that act on them, and the Observe-stage domain that receives
 * the readings (`feeds`).
 *
 * Pure presentational. The protocol is authored in the shared catalogue and is
 * DISPLAY-ONLY -- it never gates. Tightened at Threshold 2 (Coherence Check,
 * Section C): `indicators` is >=2 `{ metric, frequency }` pairs and `feeds` is a
 * `UniversalDomain` id, rendered through `UNIVERSAL_DOMAIN_LABELS` as the named
 * Observe-stage destination (never the kebab id directly).
 */

import { UNIVERSAL_DOMAIN_LABELS, type UniversalDomain } from '@ogden/shared';
import { Gauge, Telescope } from 'lucide-react';
import css from './MonitoringStreamPanel.module.css';

export interface MonitoringIndicator {
  metric: string;
  frequency: string;
}

export interface MonitoringStreamPanelProps {
  indicators: readonly MonitoringIndicator[];
  triggers: readonly string[];
  feeds: UniversalDomain;
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
          {indicators.map(({ metric, frequency }) => (
            <li key={metric} className={css.item}>
              <span className={css.bullet} aria-hidden="true" />
              <span className={css.metric}>
                {metric}
                <span className={css.freq} data-testid="monitoring-stream-freq">
                  {frequency}
                </span>
              </span>
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
        {/* feeds is type- and Zod-schema-constrained to a known UniversalDomain,
            so the label resolves; the widened lookup + ?? is a defensive guard
            against un-validated/legacy protocol data so this can't render blank. */}
        <span>
          {(UNIVERSAL_DOMAIN_LABELS as Record<string, string | undefined>)[
            feeds
          ] ?? feeds}
        </span>
      </p>
    </section>
  );
}
