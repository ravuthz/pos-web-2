import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { productService } from '@/services/product';
import { stockMovementService } from '@/services/stockMovement';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/utils';
import type { Product, StockMovement } from '@/types/api';

interface AdjustmentFormState {
  product_id: string;
  quantity_change: string;
  notes: string;
}

const emptyForm: AdjustmentFormState = {
  product_id: '',
  quantity_change: '',
  notes: ''
};

export function StockMovementsPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<AdjustmentFormState>(emptyForm);

  const stockQuery = useQuery({
    queryKey: ['stock-movements', selectedBranchId],
    queryFn: () =>
      stockMovementService.getAll({
        branch_id: selectedBranchId ?? undefined,
        per_page: 50
      })
  });

  const productsQuery = useQuery({
    queryKey: ['stock-adjust-products', selectedBranchId],
    queryFn: () =>
      productService.getAll({
        per_page: 200,
        is_active: true
      }),
    enabled: Boolean(selectedBranchId)
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: AdjustmentFormState) => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before adjusting stock.');
      }

      return stockMovementService.adjustStock({
        product_id: Number(payload.product_id),
        branch_id: selectedBranchId,
        quantity_change: Number(payload.quantity_change),
        notes: payload.notes.trim()
      });
    },
    onSuccess: async () => {
      toast.success('Stock adjusted.');
      setForm(emptyForm);
      setIsEditorOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  if (stockQuery.isLoading || productsQuery.isLoading) {
    return <LoadingState label="Loading stock movements..." />;
  }

  if (stockQuery.isError) {
    return <ErrorState message={stockQuery.error.message} />;
  }

  if (productsQuery.isError) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  const movements = (stockQuery.data?.data ?? []) as StockMovement[];
  const products = ((productsQuery.data?.data ?? []) as Product[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Monitor and adjust branch inventory levels."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setIsEditorOpen(true)}>
            <Plus className="h-4 w-4" />
            Adjust stock
          </button>
        }
      />

      {isEditorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Stock adjustment</h2>
              <p className="text-sm text-surface-500">
                Increase stock with a positive value or reduce stock with a negative value.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => {
                setIsEditorOpen(false);
                setForm(emptyForm);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before adjusting stock."
            />
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                adjustMutation.mutate(form);
              }}
            >
              <div className="md:col-span-2">
                <label className="label" htmlFor="stock-product">
                  Product
                </label>
                <select
                  id="stock-product"
                  className="input"
                  value={form.product_id}
                  onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code ?? product.barcode ?? 'No code'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="stock-quantity-change">
                  Quantity change
                </label>
                <input
                  id="stock-quantity-change"
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.quantity_change}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity_change: event.target.value }))
                  }
                  placeholder="Use negative values to reduce stock"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="stock-notes">
                  Notes
                </label>
                <input
                  id="stock-notes"
                  className="input"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  required
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Saving...' : 'Save adjustment'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      <div className="card overflow-hidden">
        <DataTable
          data={movements}
          keyExtractor={(movement) => movement.id}
          emptyMessage="No stock movements found."
          columns={[
            {
              header: 'Product',
              cell: (movement) => movement.product_name ?? movement.product?.name ?? 'Unknown product'
            },
            {
              header: 'Code',
              cell: (movement) => movement.product_code ?? movement.product?.code ?? '-'
            },
            {
              header: 'Type',
              cell: (movement) => (
                <StatusBadge value={movement.movement_type_label ?? movement.movement_type} />
              )
            },
            {
              header: 'Change',
              cell: (movement) => formatNumber(movement.quantity_change ?? movement.quantity ?? 0)
            },
            {
              header: 'Before / After',
              cell: (movement) =>
                `${formatNumber(movement.quantity_before ?? 0)} -> ${formatNumber(movement.quantity_after ?? 0)}`
            },
            {
              header: 'Date',
              cell: (movement) => formatDateTime(movement.movement_date ?? movement.created_at)
            }
          ]}
        />
      </div>
    </div>
  );
}
