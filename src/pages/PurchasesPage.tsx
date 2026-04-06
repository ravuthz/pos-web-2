import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { productService } from '@/services/product';
import { purchaseService, type PurchaseOrderPayload } from '@/services/purchase';
import { vendorService } from '@/services/vendor';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Product, PurchaseOrder } from '@/types/api';

interface PurchaseItemForm {
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
  quantity_received?: string;
  pending_quantity?: number;
  product_name?: string;
  product_code?: string;
}

interface PurchaseFormState {
  mode: 'draft' | 'receive';
  vendor_id: string;
  order_date: string;
  expected_date: string;
  notes: string;
  products: PurchaseItemForm[];
}

const emptyItem: PurchaseItemForm = {
  product_id: '',
  quantity_ordered: '1',
  unit_cost: '0'
};

function createEmptyForm(): PurchaseFormState {
  return {
    mode: 'draft',
    vendor_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    notes: '',
    products: [{ ...emptyItem }]
  };
}

export function PurchasesPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const crudTabs = useCrudTabs<PurchaseFormState, PurchaseOrder>({
    createEmptyForm,
    getEditForm: (purchase) => {
      const purchaseLines =
        (purchase.products ?? []).map((item) => ({
          product_id: String(item.product_id),
          quantity_ordered: String(item.quantity_ordered ?? item.quantity ?? 0),
          unit_cost: String(item.unit_cost ?? item.unit_price ?? 0),
          quantity_received: String(item.pending_quantity ?? 0),
          pending_quantity: Number(item.pending_quantity ?? 0),
          product_name: item.product_name,
          product_code: item.product_code
        })) || [];

      return {
        mode: purchase.is_receivable ? 'receive' : 'draft',
        vendor_id: String(purchase.vendor_id ?? ''),
        order_date: purchase.order_date ?? new Date().toISOString().slice(0, 10),
        expected_date: purchase.expected_date ?? '',
        notes: purchase.notes ?? '',
        products: purchaseLines.length > 0 ? purchaseLines : [{ ...emptyItem }]
      };
    },
    getEditTitle: (purchase) => (purchase.is_receivable ? `Receive #${purchase.id}` : `Edit #${purchase.id}`)
  });

  const purchaseQuery = useQuery({
    queryKey: ['purchase-orders', selectedBranchId, page, pageSize],
    queryFn: () =>
      purchaseService.getAll({
        branch_id: selectedBranchId ?? undefined,
        page,
        per_page: pageSize
      }),
    placeholderData: (previousData) => previousData
  });

  const vendorsQuery = useQuery({
    queryKey: ['purchase-form-vendors'],
    queryFn: () => vendorService.getAll({ per_page: 200 })
  });

  const productsQuery = useQuery({
    queryKey: ['purchase-form-products'],
    queryFn: () => productService.getAll({ per_page: 200, is_active: true })
  });

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  function updateProductLine(
    tabId: string,
    index: number,
    updater: (line: PurchaseItemForm) => PurchaseItemForm
  ) {
    crudTabs.updateTabForm(tabId, (current) => ({
      ...current,
      products: current.products.map((line, lineIndex) => (lineIndex === index ? updater(line) : line))
    }));
  }

  function buildDraftPayload(form: PurchaseFormState) {
    return {
      vendor_id: Number(form.vendor_id),
      order_date: form.order_date,
      expected_date: form.expected_date || undefined,
      notes: form.notes.trim() || undefined,
      products: form.products.map((item) => ({
        product_id: Number(item.product_id),
        quantity_ordered: Number(item.quantity_ordered),
        unit_cost: Number(item.unit_cost)
      }))
    };
  }

  const saveMutation = useMutation({
    mutationFn: async (tab: CrudEditorTab<PurchaseFormState>) => {
      const payload = tab.form;

      if (tab.type === 'edit' && tab.entityId && payload.mode === 'receive') {
        const products = payload.products
          .map((item) => ({
            product_id: Number(item.product_id),
            quantity_received: Number(item.quantity_received ?? '0')
          }))
          .filter((item) => item.quantity_received > 0);

        if (products.length === 0) {
          throw new Error('Enter at least one received quantity.');
        }

        return purchaseService.receive(tab.entityId, { products });
      }

      const draftPayload = buildDraftPayload(payload);

      if (tab.type === 'edit' && tab.entityId) {
        return purchaseService.update(tab.entityId, draftPayload);
      }

      if (!selectedBranchId) {
        throw new Error('Select a branch before creating a purchase order.');
      }

      return purchaseService.create({
        branch_id: selectedBranchId,
        ...draftPayload
      } satisfies PurchaseOrderPayload);
    },
    onSuccess: async (_data, tab) => {
      const message =
        tab.type === 'create'
          ? 'Purchase order created.'
          : tab.form.mode === 'receive'
            ? 'Purchase order received.'
            : 'Purchase order updated.';

      toast.success(message);
      crudTabs.closeTab(tab.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => purchaseService.send(id),
    onSuccess: async (_data, id) => {
      toast.success('Purchase order sent.');
      crudTabs.closeTab(`edit-${id}`);
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => purchaseService.cancel(id),
    onSuccess: async (_data, id) => {
      toast.success('Purchase order cancelled.');
      crudTabs.closeTab(`edit-${id}`);
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const isInitialLoad =
    (purchaseQuery.isLoading && !purchaseQuery.data) ||
    (vendorsQuery.isLoading && !vendorsQuery.data) ||
    (productsQuery.isLoading && !productsQuery.data);

  if (isInitialLoad) {
    return <LoadingState label="Loading purchase orders..." />;
  }

  if (purchaseQuery.isError && !purchaseQuery.data) {
    return <ErrorState message={purchaseQuery.error.message} />;
  }

  if (vendorsQuery.isError && !vendorsQuery.data) {
    return <ErrorState message={vendorsQuery.error.message} />;
  }

  if (productsQuery.isError && !productsQuery.data) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  const purchases = (purchaseQuery.data?.data ?? []) as PurchaseOrder[];
  const purchasesMeta = getPaginationMeta(purchaseQuery.data?.meta);
  const vendors = vendorsQuery.data?.data ?? [];
  const products = ((productsQuery.data?.data ?? []) as Product[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const activeEditorTab = crudTabs.activeEditorTab;
  const isReceiveTab = activeEditorTab?.type === 'edit' && activeEditorTab.form.mode === 'receive';
  const inputClass = 'input input-bordered w-full';
  const selectClass = 'select select-bordered w-full';
  const textareaClass = 'textarea textarea-bordered min-h-24 w-full';
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Purchases' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        subtitle="Create purchase orders and progress them through send and receive workflows."
      />

      <CrudTabs
        activeTabId={crudTabs.activeTabId}
        tabs={tabItems}
        onSelectTab={crudTabs.setActiveTabId}
        onCloseTab={crudTabs.closeTab}
        onCreateTab={crudTabs.openCreateTab}
      >
        {activeEditorTab ? (
          <CrudEditorLayout
            title={
              activeEditorTab.type === 'create'
                ? 'Create purchase order'
                : isReceiveTab
                  ? 'Receive purchase order'
                  : 'Edit purchase order'
            }
            description={
              activeEditorTab.type === 'create'
                ? 'Add vendor, schedule, and product lines for a new PO.'
                : isReceiveTab
                  ? 'Enter the quantity received for each purchase line.'
                  : 'Update vendor, schedule, notes, and product lines for this draft PO.'
            }
            onClose={() => crudTabs.closeTab(activeEditorTab.id)}
          >
            {activeEditorTab.type === 'create' && !selectedBranchId ? (
              <EmptyState
                title="Branch required"
                message="Pick a branch from the header before creating a purchase order."
              />
            ) : isReceiveTab ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveMutation.mutate(activeEditorTab);
                }}
              >
                {activeEditorTab.form.products.map((item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="card grid gap-3 border border-base-300 bg-base-100 p-4 shadow-sm md:grid-cols-[1fr_140px_140px]"
                  >
                    <div>
                      <p className="font-medium text-surface-900">
                        {item.product_name ?? products.find((product) => String(product.id) === item.product_id)?.name ?? 'Unknown product'}
                      </p>
                      <p className="text-sm text-surface-500">
                        Pending: {formatNumber(item.pending_quantity ?? 0)} | Ordered:{' '}
                        {formatNumber(Number(item.quantity_ordered ?? 0))}
                      </p>
                    </div>

                    <div className="text-sm text-surface-600">
                      <p>Unit cost</p>
                      <p className="font-medium text-surface-900">{formatCurrency(Number(item.unit_cost ?? 0))}</p>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={item.quantity_received ?? '0'}
                      onChange={(event) =>
                        updateProductLine(activeEditorTab.id, index, (current) => ({
                          ...current,
                          quantity_received: event.target.value
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Receiving...' : 'Confirm receipt'}
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
            ) : (
              <form
                className={CRUD_EDITOR_FORM_GRID_CLASS}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveMutation.mutate(activeEditorTab);
                }}
              >
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Vendor</legend>
                  <select
                    id="purchase-vendor"
                    className={selectClass}
                    value={activeEditorTab.form.vendor_id}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        vendor_id: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Order date</legend>
                  <input
                    id="purchase-order-date"
                    type="date"
                    className={inputClass}
                    value={activeEditorTab.form.order_date}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        order_date: event.target.value
                      }))
                    }
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Expected date</legend>
                  <input
                    id="purchase-expected-date"
                    type="date"
                    className={inputClass}
                    value={activeEditorTab.form.expected_date}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        expected_date: event.target.value
                      }))
                    }
                  />
                </fieldset>

                <div className="card border border-base-300 bg-base-100 shadow-sm md:col-span-2 xl:col-span-3">
                  <div className="card-body gap-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-surface-900">Products</p>
                        <p className="text-sm text-surface-500">At least one product line is required.</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                            ...current,
                            products: [...current.products, { ...emptyItem }]
                          }))
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add line
                      </button>
                    </div>

                    {activeEditorTab.form.products.map((item, index) => (
                      <div
                        key={`${index}-${item.product_id}`}
                        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_140px_140px_auto]"
                      >
                        <select
                          className={selectClass}
                          value={item.product_id}
                          onChange={(event) =>
                            updateProductLine(activeEditorTab.id, index, (current) => ({
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

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={inputClass}
                          placeholder="Qty"
                          value={item.quantity_ordered}
                          onChange={(event) =>
                            updateProductLine(activeEditorTab.id, index, (current) => ({
                              ...current,
                              quantity_ordered: event.target.value
                            }))
                          }
                          required
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          placeholder="Unit cost"
                          value={item.unit_cost}
                          onChange={(event) =>
                            updateProductLine(activeEditorTab.id, index, (current) => ({
                              ...current,
                              unit_cost: event.target.value
                            }))
                          }
                          required
                        />

                        <button
                          type="button"
                          className="btn btn-error btn-sm btn-square self-start xl:self-center"
                          title="Delete line"
                          onClick={() =>
                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                              ...current,
                              products:
                                current.products.length === 1
                                  ? current.products
                                  : current.products.filter((_, productIndex) => productIndex !== index)
                            }))
                          }
                          disabled={activeEditorTab.form.products.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                  <legend className="fieldset-legend">Notes</legend>
                  <textarea
                    id="purchase-notes"
                    className={textareaClass}
                    value={activeEditorTab.form.notes}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        notes: event.target.value
                      }))
                    }
                  />
                </fieldset>

                <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending
                      ? activeEditorTab.type === 'create'
                        ? 'Creating...'
                        : 'Saving...'
                      : activeEditorTab.type === 'create'
                        ? 'Create purchase order'
                        : 'Update purchase order'}
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
          </CrudEditorLayout>
        ) : (
          <div className="app-table-shell">
            <DataTable
              data={purchases}
              keyExtractor={(purchase) => purchase.id}
              emptyMessage="No purchase orders found."
              isUpdating={purchaseQuery.isFetching}
              updateLabel="Refreshing purchase orders..."
              pagination={{
                page,
                pageSize,
                totalItems: purchasesMeta.totalItems,
                totalPages: purchasesMeta.totalPages,
                pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
                onPageChange: setPage,
                onPageSizeChange: (nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }
              }}
              columns={[
                {
                  header: 'PO',
                  cell: (purchase) => (
                    <div>
                      <p className="font-medium text-surface-900">{purchase.po_number}</p>
                      <p className="text-xs text-surface-500">{formatDateTime(purchase.order_date)}</p>
                    </div>
                  )
                },
                {
                  header: 'Vendor',
                  cell: (purchase) => purchase.vendor?.name ?? 'Unknown'
                },
                {
                  header: 'Branch',
                  cell: (purchase) => purchase.branch?.name ?? 'Unknown'
                },
                {
                  header: 'Total',
                  cell: (purchase) => formatCurrency(purchase.total_amount ?? purchase.total ?? 0)
                },
                {
                  header: 'Status',
                  cell: (purchase) => <StatusBadge value={purchase.status_label ?? purchase.status} />
                },
                {
                  header: 'Actions',
                  cell: (purchase) => (
                    <div className="flex flex-wrap items-center gap-2">
                      {purchase.is_editable ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-square"
                          title="Edit"
                          onClick={() => crudTabs.openEditTab(purchase)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {purchase.status === 'draft' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => sendMutation.mutate(purchase.id)}
                          disabled={sendMutation.isPending}
                        >
                          Send
                        </button>
                      ) : null}
                      {purchase.is_receivable ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => crudTabs.openEditTab(purchase)}
                        >
                          Receive
                        </button>
                      ) : null}
                      {purchase.is_cancellable ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm(`Cancel purchase order "${purchase.po_number}"?`)) {
                              cancelMutation.mutate(purchase.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </CrudTabs>
    </div>
  );
}
