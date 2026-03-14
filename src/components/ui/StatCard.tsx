import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'border-base-300 bg-base-100',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
  danger: 'border-error/30 bg-error/10'
};

export function StatCard({ label, value, description, tone = 'default' }: StatCardProps) {
  return (
    <div className={cn('stats w-full border shadow-sm', toneClasses[tone])}>
      <div className="stat p-5">
        <p className="stat-title text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/50">{label}</p>
        <p className="stat-value text-3xl text-base-content">{value}</p>
        {description ? <p className="stat-desc mt-2 text-sm text-base-content/60">{description}</p> : null}
      </div>
    </div>
  );
}
