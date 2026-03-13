import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { productService } from '@/services/product';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Product } from '@/types/api';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const productsQuery = useQuery({
    queryKey: ['products', deferredSearch, lowStockOnly],
    queryFn: () =>
      productService.getAll({
        per_page: 50,
        search: deferredSearch || undefined,
        low_stock: lowStockOnly || undefined
      })
  });

  if (productsQuery.isLoading) {
    return <LoadingState label="Loading products..." />;
  }

  if (productsQuery.isError) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  const products = (productsQuery.data?.data ?? []) as Product[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Catalog, pricing, and stock visibility for the POS inventory."
      />

      <div className="card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="Search by name, code, or barcode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-surface-200 px-4 py-2.5 text-sm text-surface-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
            />
            Low stock only
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={products}
            keyExtractor={(product) => product.id}
            emptyMessage="No products matched the current filters."
            columns={[
              {
                header: 'Product',
                cell: (product) => (
                  <p className="font-medium text-surface-900">{product.name}</p>
                )
              },
              {
                header: 'Code',
                cell: (product) => (
                  <span className="font-mono text-xs text-surface-600">
                    {product.code ?? '-'}
                  </span>
                )
              },
              {
                header: 'Barcode',
                cell: (product) => (
                  <span className="font-mono text-xs text-surface-600">
                    {product.barcode ?? '-'}
                  </span>
                )
              },
              {
                header: 'Category',
                cell: (product) => product.category?.name ?? 'Uncategorized'
              },
              {
                header: 'Price',
                cell: (product) => formatCurrency(Number(product.selling_price ?? 0))
              },
              {
                header: 'Stock',
                cell: (product) => formatNumber(product.stock?.quantity_on_hand ?? 0)
              },
              {
                header: 'Status',
                cell: (product) => <StatusBadge value={product.status ?? (product.is_active ? 'active' : 'inactive')} />
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
