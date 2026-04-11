/**
 * ZoneAutoSuggest — score-driven zone category suggestions
 * based on site assessment scores and Tier 3 environmental data.
 */

import { useMemo } from 'react';
import type { ZoneCategory } from '../../store/zoneStore.js';
import { ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import type { ScoredResult } from '../../lib/computeScores.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { computeZoneSuggestions } from './zoneAnalysis.js';
import p from '../../styles/panel.module.css';

interface ZoneAutoSuggestProps {
  scores: ScoredResult[] | null;
  siteData: SiteData | null;
  existingCategories: Set<ZoneCategory>;
}

export default function ZoneAutoSuggest({ scores, siteData, existingCategories }: ZoneAutoSuggestProps) {
  const suggestions = useMemo(
    () => computeZoneSuggestions(scores, siteData, existingCategories),
    [scores, siteData, existingCategories],
  );

  if (!scores) {
    return (
      <div className={p.card} style={{ opacity: 0.7 }}>
        <div className={p.cardTitle}>Auto-Suggest</div>
        <div className={p.cardDesc}>Fetch site data to receive zone suggestions based on land analysis.</div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={p.card}>
        <div className={p.cardTitle}>Auto-Suggest</div>
        <div className={p.cardDesc}>
          All recommended zone types are already present, or scores are below suggestion thresholds.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className={p.sectionLabel}>Suggested Zones</h3>
      <div className={p.section}>
        {suggestions.map((s, i) => {
          const cfg = ZONE_CATEGORY_CONFIG[s.category];
          return (
            <div key={i} className={p.card} style={{ borderLeft: `3px solid ${cfg.color}`, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.875rem' }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{cfg.label}</span>
                </div>
                <span style={{
                  fontSize: '0.625rem',
                  padding: '1px 6px',
                  borderRadius: 8,
                  background: 'var(--color-water-100, #d1e6ee)',
                  color: 'var(--color-water-700, #2a5d70)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Suggested
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--color-panel-muted, #8a8578)' }}>
                {s.reason}
              </div>
              <div style={{ fontSize: '0.6875rem', marginTop: 4, color: 'var(--color-panel-muted, #8a8578)', opacity: 0.8 }}>
                Source: {s.sourceName} ({s.sourceScore.toFixed(0)}/100)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
