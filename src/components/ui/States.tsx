import { AlertCircle, Inbox } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

interface EmptyStateProps {
  title: string;
  message: string;
}

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <div className="card flex min-h-40 items-center justify-center gap-3 text-base-content/70">
      <span className="loading loading-spinner loading-md" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="alert alert-error shadow-sm">
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
      <Inbox className="h-8 w-8 text-base-content/35" />
      <p className="mt-3 font-medium text-base-content/80">{title}</p>
      <p className="mt-1 max-w-md text-sm text-base-content/55">{message}</p>
    </div>
  );
}
