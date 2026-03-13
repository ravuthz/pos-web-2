import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  value?: string | null;
}

const palette: Record<string, string> = {
  active: 'badge-success',
  completed: 'badge-success',
  received: 'badge-success',
  approved: 'badge-success',
  paid: 'badge-success',
  open: 'badge-info',
  draft: 'badge-neutral',
  pending: 'badge-warning',
  sent: 'badge-info',
  void: 'badge-danger',
  refund: 'badge-warning',
  rejected: 'badge-danger',
  cancelled: 'badge-danger',
  closed: 'badge-neutral',
  inactive: 'badge-neutral',
  cash: 'badge-success',
  card: 'badge-info',
  transfer: 'badge-neutral',
  khqr: 'badge-warning'
};

function toLabel(value?: string | null) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value?.toLowerCase() ?? 'unknown';
  const toneClass = palette[normalized] ?? 'badge-neutral';

  return <span className={cn('badge', toneClass)}>{toLabel(value)}</span>;
}
