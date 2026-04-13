/**
 * SimpleBarChart — pure SVG vertical bar chart with earth-tone colors.
 */

import { status } from '../../../lib/tokens.js';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  height?: number;
  barColor?: string;
}

export default function SimpleBarChart({ data, height = 180, barColor = status.good }: SimpleBarChartProps) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 32;
  const gap = 16;
  const chartWidth = data.length * (barWidth + gap) - gap;
  const paddingBottom = 28;
  const chartHeight = height - paddingBottom;

  return (
    <svg width={chartWidth + 20} height={height} viewBox={`0 0 ${chartWidth + 20} ${height}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * (chartHeight - 10);
        const x = 10 + i * (barWidth + gap);
        const y = chartHeight - barH;
        const fill = d.color ?? barColor;

        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={fill} opacity={0.85} />
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(180,165,140,0.5)"
              fontWeight={500}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
