/**
 * MetricCard — large serif number + unit + description.
 * Used in dashboard metrics sidebars.
 */

import css from './MetricCard.module.css';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: React.ReactNode;
}

export default function MetricCard({ label, value, unit, description, trend, trendPositive, icon }: MetricCardProps) {
  return (
    <div className={css.card}>
      <div className={css.header}>
        <span className={css.label}>{label}</span>
        {icon && <span className={css.icon}>{icon}</span>}
      </div>
      <div className={css.valueRow}>
        <span className={css.value}>{value}</span>
        {unit && <span className={css.unit}>{unit}</span>}
        {trend && (
          <span className={`${css.trend} ${trendPositive ? css.trendUp : css.trendDown}`}>
            {trend}
          </span>
        )}
      </div>
      {description && <p className={css.desc}>{description}</p>}
    </div>
  );
}
