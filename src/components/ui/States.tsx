import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

interface EmptyStateProps {
  title: string;
  message: string;
}

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <div className="card flex min-h-40 items-center justify-center gap-3 text-surface-600">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="card border border-rose-200 bg-rose-50 text-rose-700">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="card flex min-h-40 flex-col items-center justify-center text-center">
      <Inbox className="h-8 w-8 text-surface-400" />
      <p className="mt-3 font-medium text-surface-700">{title}</p>
      <p className="mt-1 max-w-md text-sm text-surface-500">{message}</p>
    </div>
  );
}
