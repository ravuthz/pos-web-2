import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage: string;
  isUpdating?: boolean;
  updateLabel?: string;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    pageSizeOptions: readonly number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage,
  isUpdating = false,
  updateLabel = 'Updating results...',
  pagination
}: DataTableProps<T>) {
  const shouldShowPagination = Boolean(pagination && pagination.totalItems > pagination.pageSize);
  const startItem =
    pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const endItem =
    pagination && pagination.totalItems > 0
      ? Math.min(pagination.page * pagination.pageSize, pagination.totalItems)
      : 0;

  return (
    <div className="relative">
      {isUpdating ? (
        <div className="pointer-events-none absolute right-4 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white/95 px-3 py-1 text-xs font-medium text-surface-600 shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{updateLabel}</span>
        </div>
      ) : null}

      {data.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-surface-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 text-sm">
            <thead className="bg-surface-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-surface-500"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 bg-white">
              {data.map((row, index) => (
                <tr key={keyExtractor(row, index)} className="align-top">
                  {columns.map((column) => (
                    <td key={column.header} className={`px-4 py-3 text-surface-700 ${column.className ?? ''}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shouldShowPagination && pagination ? (
        <div className="flex flex-col gap-3 border-t border-surface-200 bg-surface-50/80 px-4 py-3 text-sm text-surface-600 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {startItem}-{endItem} of {pagination.totalItems}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-surface-500" htmlFor="table-page-size">
              Rows
            </label>
            <select
              id="table-page-size"
              className="input min-h-10 w-auto py-0"
              value={pagination.pageSize}
              onChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
            >
              {pagination.pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <span className="px-2 text-sm text-surface-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isUpdating}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isUpdating}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
