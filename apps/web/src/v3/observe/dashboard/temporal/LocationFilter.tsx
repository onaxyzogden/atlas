/**
 * LocationFilter — Phase 4 Slice 4.5 cluster picker for the Temporal
 * chart (Observe Dashboard Spec §5.3 — "trends require same-location
 * series"). Renders one button per ≤10m proximity cluster; the active
 * cluster's points feed the chart.
 *
 * Hidden when only one cluster exists (no choice to make).
 */

import type { LocationCluster } from './locationClusters.js';

interface Props {
  clusters: readonly LocationCluster[];
  activeClusterId: string | null;
  onChange: (clusterId: string) => void;
}

export default function LocationFilter({
  clusters,
  activeClusterId,
  onChange,
}: Props) {
  if (clusters.length <= 1) return null;
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      role="radiogroup"
      aria-label="Filter chart by location cluster"
    >
      {clusters.map((cluster) => {
        const active = cluster.id === activeClusterId;
        return (
          <button
            key={cluster.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(cluster.id)}
            style={{
              background: active
                ? 'rgba(196, 162, 101, 0.18)'
                : 'rgba(31, 29, 26, 0.85)',
              color: active ? '#f2ede3' : 'rgba(242, 237, 227, 0.75)',
              border: active
                ? '1px solid rgba(196, 162, 101, 0.65)'
                : '1px solid rgba(242, 237, 227, 0.16)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{cluster.label}</span>
            <span
              aria-hidden
              style={{
                background: active
                  ? 'rgba(196, 162, 101, 0.32)'
                  : 'rgba(242, 237, 227, 0.08)',
                color: active ? '#f2ede3' : 'rgba(242, 237, 227, 0.65)',
                borderRadius: 999,
                padding: '0 6px',
                fontSize: 10.5,
              }}
            >
              {cluster.points.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
