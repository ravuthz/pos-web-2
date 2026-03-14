interface StatusBadgeProps {
  value?: string | null;
}

const palette: Record<string, string> = {
  active: 'badge badge-success',
  completed: 'badge badge-success',
  received: 'badge badge-success',
  approved: 'badge badge-success',
  paid: 'badge badge-success',
  open: 'badge badge-info',
  draft: 'badge badge-neutral',
  pending: 'badge badge-warning',
  sent: 'badge badge-info',
  void: 'badge badge-error',
  refund: 'badge badge-warning',
  rejected: 'badge badge-error',
  cancelled: 'badge badge-error',
  closed: 'badge badge-neutral',
  inactive: 'badge badge-neutral',
  cash: 'badge badge-success',
  card: 'badge badge-info',
  transfer: 'badge badge-neutral',
  khqr: 'badge badge-warning'
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
  const toneClass = palette[normalized] ?? 'badge badge-neutral';

  return <span className={toneClass}>{toLabel(value)}</span>;
}
