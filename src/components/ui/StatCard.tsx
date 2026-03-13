import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'border-surface-200',
  success: 'border-emerald-200 bg-emerald-50/70',
  warning: 'border-amber-200 bg-amber-50/70',
  danger: 'border-rose-200 bg-rose-50/70'
};

export function StatCard({ label, value, description, tone = 'default' }: StatCardProps) {
  return (
    <div className={cn('card space-y-2 border', toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{label}</p>
      <p className="text-2xl font-semibold text-surface-900">{value}</p>
      {description ? <p className="text-sm text-surface-600">{description}</p> : null}
    </div>
  );
}
