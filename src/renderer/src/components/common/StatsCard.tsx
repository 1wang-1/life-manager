
import { clsx } from 'clsx';
import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatsCard({ title, value, subtitle, icon, trend, trendValue }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-header">
        <span className="stats-title">{title}</span>
        {icon && <span className="stats-icon">{icon}</span>}
      </div>
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        {subtitle && <div className="stats-subtitle">{subtitle}</div>}
      </div>
      {trend && (
        <div className={clsx('stats-trend', trend)}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'} {trendValue}
        </div>
      )}
    </div>
  );
}
