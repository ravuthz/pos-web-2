import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export const CRUD_EDITOR_FORM_GRID_CLASS = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';
export const CRUD_EDITOR_ACTIONS_CLASS = 'md:col-span-2 xl:col-span-3 flex flex-wrap gap-3';

interface CrudEditorLayoutProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

export function CrudEditorLayout({ title, description, onClose, children }: CrudEditorLayoutProps) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="card-title text-xl">{title}</h2>
            <p className="text-sm text-base-content/65">{description}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </section>
  );
}
