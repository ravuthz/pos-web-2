import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { categoryService } from '@/services/category';
import { productService } from '@/services/product';
import { vendorService } from '@/services/vendor';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Product } from '@/types/api';

interface ProductFormState {
  category_id: string;
  vendor_id: string;
  name: string;
  code: string;
  barcode: string;
  description: string;
  cost_price: string;
  selling_price: string;
  status: 'active' | 'inactive';
  track_expiry: boolean;
  expiry_date: string;
  low_stock_alert: string;
}

const emptyForm: ProductFormState = {
  category_id: '',
  vendor_id: '',
  name: '',
  code: '',
  barcode: '',
  description: '',
  cost_price: '0',
  selling_price: '0',
  status: 'active',
  track_expiry: false,
  expiry_date: '',
  low_stock_alert: '0'
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
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

  const categoriesQuery = useQuery({
    queryKey: ['product-form-categories'],
    queryFn: () => categoryService.getAll({ per_page: 200 })
  });

  const vendorsQuery = useQuery({
    queryKey: ['product-form-vendors'],
    queryFn: () => vendorService.getAll({ per_page: 200 })
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const data = {
        branch_id: selectedBranchId ?? undefined,
        category_id: Number(payload.category_id),
        vendor_id: payload.vendor_id ? Number(payload.vendor_id) : undefined,
        name: payload.name.trim(),
        code: payload.code.trim() || undefined,
        barcode: payload.barcode.trim() || undefined,
        description: payload.description.trim() || undefined,
        cost_price: Number(payload.cost_price),
        selling_price: Number(payload.selling_price),
        status: payload.status,
        track_expiry: payload.track_expiry,
        expiry_date: payload.track_expiry && payload.expiry_date ? payload.expiry_date : undefined,
        low_stock_alert: Number(payload.low_stock_alert || '0')
      };

      if (editingProduct) {
        return productService.update(editingProduct.id, data);
      }

      if (!selectedBranchId) {
        throw new Error('Select a branch before creating a product.');
      }

      return productService.create(data);
    },
    onSuccess: async () => {
      toast.success(editingProduct ? 'Product updated.' : 'Product created.');
      resetEditor();
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: async () => {
      toast.success('Product deleted.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const products = (productsQuery.data?.data ?? []) as Product[];
  const categories = categoriesQuery.data?.data ?? [];
  const vendors = vendorsQuery.data?.data ?? [];

  function resetEditor() {
    setIsEditorOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      category_id: String(product.category_id ?? ''),
      vendor_id: product.vendor_id ? String(product.vendor_id) : '',
      name: product.name ?? '',
      code: product.code ?? '',
      barcode: product.barcode ?? '',
      description: product.description ?? '',
      cost_price: String(product.cost_price ?? 0),
      selling_price: String(product.selling_price ?? 0),
      status: product.status === 'inactive' ? 'inactive' : 'active',
      track_expiry: Boolean(product.track_expiry),
      expiry_date: product.expiry_date ?? '',
      low_stock_alert: String(product.low_stock_alert ?? 0)
    });
    setIsEditorOpen(true);
  }

  if (productsQuery.isLoading || categoriesQuery.isLoading || vendorsQuery.isLoading) {
    return <LoadingState label="Loading products..." />;
  }

  if (productsQuery.isError) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  if (categoriesQuery.isError) {
    return <ErrorState message={categoriesQuery.error.message} />;
  }

  if (vendorsQuery.isError) {
    return <ErrorState message={vendorsQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Catalog, pricing, stock thresholds, and branch-linked product records."
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            New product
          </button>
        }
      />

      {isEditorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {editingProduct ? 'Edit product' : 'Create product'}
              </h2>
              <p className="text-sm text-surface-500">
                {editingProduct
                  ? 'Update pricing, status, and stock rules.'
                  : 'Create a product for the selected branch inventory.'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={resetEditor}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!editingProduct && !selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before creating a product."
            />
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div>
                <label className="label" htmlFor="product-category">
                  Category
                </label>
                <select
                  id="product-category"
                  className="input"
                  value={form.category_id}
                  onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="product-vendor">
                  Vendor
                </label>
                <select
                  id="product-vendor"
                  className="input"
                  value={form.vendor_id}
                  onChange={(event) => setForm((current) => ({ ...current, vendor_id: event.target.value }))}
                >
                  <option value="">No vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="product-status">
                  Status
                </label>
                <select
                  id="product-status"
                  className="input"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as 'active' | 'inactive'
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className="label" htmlFor="product-name">
                  Product name
                </label>
                <input
                  id="product-name"
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="product-code">
                  Code
                </label>
                <input
                  id="product-code"
                  className="input"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                />
              </div>

              <div>
                <label className="label" htmlFor="product-barcode">
                  Barcode
                </label>
                <input
                  id="product-barcode"
                  className="input"
                  value={form.barcode}
                  onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                />
              </div>

              <div>
                <label className="label" htmlFor="product-cost">
                  Cost price
                </label>
                <input
                  id="product-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.cost_price}
                  onChange={(event) => setForm((current) => ({ ...current, cost_price: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="product-selling">
                  Selling price
                </label>
                <input
                  id="product-selling"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.selling_price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, selling_price: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="product-low-stock">
                  Low stock alert
                </label>
                <input
                  id="product-low-stock"
                  type="number"
                  min="0"
                  className="input"
                  value={form.low_stock_alert}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, low_stock_alert: event.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-surface-200 px-4 py-3">
                <input
                  id="product-expiry-toggle"
                  type="checkbox"
                  checked={form.track_expiry}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      track_expiry: event.target.checked,
                      expiry_date: event.target.checked ? current.expiry_date : ''
                    }))
                  }
                />
                <label htmlFor="product-expiry-toggle" className="text-sm text-surface-700">
                  Track expiry
                </label>
              </div>

              <div>
                <label className="label" htmlFor="product-expiry-date">
                  Expiry date
                </label>
                <input
                  id="product-expiry-date"
                  type="date"
                  className="input"
                  value={form.expiry_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expiry_date: event.target.value }))
                  }
                  disabled={!form.track_expiry}
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="label" htmlFor="product-description">
                  Description
                </label>
                <textarea
                  id="product-description"
                  className="input min-h-28"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? 'Saving...'
                    : editingProduct
                      ? 'Update product'
                      : 'Create product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetEditor}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

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
                cell: (product) => <p className="font-medium text-surface-900">{product.name}</p>
              },
              {
                header: 'Code',
                cell: (product) => (
                  <span className="font-mono text-xs text-surface-600">{product.code ?? '-'}</span>
                )
              },
              {
                header: 'Barcode',
                cell: (product) => (
                  <span className="font-mono text-xs text-surface-600">{product.barcode ?? '-'}</span>
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
                cell: (product) => (
                  <StatusBadge value={product.status ?? (product.is_active ? 'active' : 'inactive')} />
                )
              },
              {
                header: 'Actions',
                cell: (product) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => startEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => {
                        if (window.confirm(`Delete product "${product.name}"?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
