import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const crudTabs = useCrudTabs<AdjustmentFormState, StockMovement>({
    createEmptyForm: () => ({ ...emptyForm }),
    getEditForm: () => ({ ...emptyForm })
  });

  const stockQuery = useQuery({
    queryKey: ['stock-movements', selectedBranchId, page, pageSize],
    queryFn: () =>
      stockMovementService.getAll({
        branch_id: selectedBranchId ?? undefined,
        page,
        per_page: pageSize
      }),
    placeholderData: (previousData) => previousData
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

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const adjustMutation = useMutation({
    mutationFn: async (tab: CrudEditorTab<AdjustmentFormState>) => {
      const payload = tab.form;

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
    onSuccess: async (_data, tab) => {
      toast.success('Stock adjusted.');
      crudTabs.closeTab(tab.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const isInitialLoad =
    (stockQuery.isLoading && !stockQuery.data) ||
    (Boolean(selectedBranchId) && productsQuery.isLoading && !productsQuery.data);

  if (isInitialLoad) {
    return <LoadingState label="Loading stock movements..." />;
  }

  if (stockQuery.isError && !stockQuery.data) {
    return <ErrorState message={stockQuery.error.message} />;
  }

  if (productsQuery.isError && !productsQuery.data) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  const movements = (stockQuery.data?.data ?? []) as StockMovement[];
  const stockMeta = getPaginationMeta(stockQuery.data?.meta);
  const products = ((productsQuery.data?.data ?? []) as Product[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const activeEditorTab = crudTabs.activeEditorTab;
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Stock Movements' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Monitor and adjust branch inventory levels."
      />

      <CrudTabs
        activeTabId={crudTabs.activeTabId}
        tabs={tabItems}
        onSelectTab={crudTabs.setActiveTabId}
        onCloseTab={crudTabs.closeTab}
        onCreateTab={crudTabs.openCreateTab}
      >
        {activeEditorTab ? (
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
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => crudTabs.closeTab(activeEditorTab.id)}
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
                  adjustMutation.mutate(activeEditorTab);
                }}
              >
                <div className="md:col-span-2">
                  <label className="label" htmlFor="stock-product">
                    Product
                  </label>
                  <select
                    id="stock-product"
                    className="input"
                    value={activeEditorTab.form.product_id}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        product_id: event.target.value
                      }))
                    }
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
                    value={activeEditorTab.form.quantity_change}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        quantity_change: event.target.value
                      }))
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
                    value={activeEditorTab.form.notes}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        notes: event.target.value
                      }))
                    }
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
                    onClick={() => crudTabs.closeTab(activeEditorTab.id)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <div className="app-table-shell">
            <DataTable
              data={movements}
              keyExtractor={(movement) => movement.id}
              emptyMessage="No stock movements found."
              isUpdating={stockQuery.isFetching}
              updateLabel="Refreshing stock movements..."
              pagination={{
                page,
                pageSize,
                totalItems: stockMeta.totalItems,
                totalPages: stockMeta.totalPages,
                pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
                onPageChange: setPage,
                onPageSizeChange: (nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }
              }}
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
        )}
      </CrudTabs>
    </div>
  );
}
