import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { categoryService } from '@/services/category';
import type { Category } from '@/types/api';

export function CategoriesPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const categoriesQuery = useQuery({
    queryKey: ['categories', deferredSearch],
    queryFn: () => categoryService.getAll({ per_page: 100, search: deferredSearch || undefined })
  });

  if (categoriesQuery.isLoading) {
    return <LoadingState label="Loading categories..." />;
  }

  if (categoriesQuery.isError) {
    return <ErrorState message={categoriesQuery.error.message} />;
  }

  const categories = (categoriesQuery.data?.data ?? []) as Category[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Organize catalog structure and track parent-child category relationships."
      />

      <div className="card">
        <input
          className="input"
          placeholder="Search categories"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={categories}
            keyExtractor={(category) => category.id}
            emptyMessage="No categories matched the current search."
            columns={[
              {
                header: 'Category',
                cell: (category) => (
                  <div>
                    <p className="font-medium text-surface-900">{category.name}</p>
                    <p className="text-xs text-surface-500">{category.code ?? 'No code'}</p>
                  </div>
                )
              },
              {
                header: 'Parent',
                cell: (category) => {
                  const parent = categories.find((item) => item.id === category.parent_id);
                  return parent?.name ?? 'Top level';
                }
              },
              {
                header: 'Children',
                cell: (category) => String(category.children?.length ?? 0)
              },
              {
                header: 'Status',
                cell: (category) => (
                  <StatusBadge value={category.is_active === false ? 'inactive' : 'active'} />
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
