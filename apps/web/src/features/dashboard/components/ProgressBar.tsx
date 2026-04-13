/**
 * ProgressBar — horizontal bar with label and percentage.
 */

import { status } from '../../../lib/tokens.js';

const styles = {
  wrapper: { marginBottom: 12 } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } as React.CSSProperties,
  label: { fontSize: 13, color: 'rgba(232, 220, 200, 0.75)' } as React.CSSProperties,
  pct: { fontSize: 13, fontWeight: 600, color: 'rgba(232, 220, 200, 0.9)' } as React.CSSProperties,
  track: {
    height: 6, borderRadius: 3,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  } as React.CSSProperties,
};

interface ProgressBarProps {
  label: string;
  value: number;
  color?: string;
}

export default function ProgressBar({ label, value, color = status.good }: ProgressBarProps) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.label}>{label}</span>
        <span style={styles.pct}>{value}%</span>
      </div>
      <div style={styles.track}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, borderRadius: 3, background: color, transition: 'width 500ms ease' }} />
      </div>
    </div>
  );
}
