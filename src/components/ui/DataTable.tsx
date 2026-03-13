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
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-surface-500">{emptyMessage}</div>;
  }

  return (
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
  );
}
