import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
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
}

interface PurchaseFormState {
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

const emptyForm: PurchaseFormState = {
  vendor_id: '',
  order_date: new Date().toISOString().slice(0, 10),
  expected_date: '',
  notes: '',
  products: [{ ...emptyItem }]
};

export function PurchasesPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<number | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, string>>({});
  const [form, setForm] = useState<PurchaseFormState>(emptyForm);

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

  const createMutation = useMutation({
    mutationFn: async (payload: PurchaseFormState) => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before creating a purchase order.');
      }

      const data: PurchaseOrderPayload = {
        branch_id: selectedBranchId,
        vendor_id: Number(payload.vendor_id),
        order_date: payload.order_date,
        expected_date: payload.expected_date || undefined,
        notes: payload.notes.trim() || undefined,
        products: payload.products.map((item) => ({
          product_id: Number(item.product_id),
          quantity_ordered: Number(item.quantity_ordered),
          unit_cost: Number(item.unit_cost)
        }))
      };

      return purchaseService.create(data);
    },
    onSuccess: async () => {
      toast.success('Purchase order created.');
      setIsCreatorOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => purchaseService.send(id),
    onSuccess: async () => {
      toast.success('Purchase order sent.');
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => purchaseService.cancel(id),
    onSuccess: async () => {
      toast.success('Purchase order cancelled.');
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const receiveMutation = useMutation({
    mutationFn: async (purchase: PurchaseOrder) => {
      const products = (purchase.products ?? [])
        .map((item) => ({
          product_id: item.product_id,
          quantity_received: Number(receiveQuantities[item.product_id] ?? '0')
        }))
        .filter((item) => item.quantity_received > 0);

      if (products.length === 0) {
        throw new Error('Enter at least one received quantity.');
      }

      return purchaseService.receive(purchase.id, { products });
    },
    onSuccess: async () => {
      toast.success('Purchase order received.');
      setReceivingPurchaseId(null);
      setReceiveQuantities({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const purchases = (purchaseQuery.data?.data ?? []) as PurchaseOrder[];
  const purchasesMeta = getPaginationMeta(purchaseQuery.data?.meta);
  const vendors = vendorsQuery.data?.data ?? [];
  const products = ((productsQuery.data?.data ?? []) as Product[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const receivingPurchase = useMemo(
    () => purchases.find((purchase) => purchase.id === receivingPurchaseId) ?? null,
    [purchases, receivingPurchaseId]
  );

  if (purchaseQuery.isLoading || vendorsQuery.isLoading || productsQuery.isLoading) {
    return <LoadingState label="Loading purchase orders..." />;
  }

  if (purchaseQuery.isError) {
    return <ErrorState message={purchaseQuery.error.message} />;
  }

  if (vendorsQuery.isError) {
    return <ErrorState message={vendorsQuery.error.message} />;
  }

  if (productsQuery.isError) {
    return <ErrorState message={productsQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        subtitle="Create purchase orders and progress them through send and receive workflows."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setIsCreatorOpen(true)}>
            <Plus className="h-4 w-4" />
            New purchase order
          </button>
        }
      />

      {isCreatorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Create purchase order</h2>
              <p className="text-sm text-surface-500">
                Add vendor, schedule, and product lines for a new PO.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setIsCreatorOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before creating a purchase order."
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="label" htmlFor="purchase-vendor">
                    Vendor
                  </label>
                  <select
                    id="purchase-vendor"
                    className="input"
                    value={form.vendor_id}
                    onChange={(event) => setForm((current) => ({ ...current, vendor_id: event.target.value }))}
                    required
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="purchase-order-date">
                    Order date
                  </label>
                  <input
                    id="purchase-order-date"
                    type="date"
                    className="input"
                    value={form.order_date}
                    onChange={(event) => setForm((current) => ({ ...current, order_date: event.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="purchase-expected-date">
                    Expected date
                  </label>
                  <input
                    id="purchase-expected-date"
                    type="date"
                    className="input"
                    value={form.expected_date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expected_date: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-900">Products</p>
                    <p className="text-sm text-surface-500">At least one product line is required.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        products: [...current.products, { ...emptyItem }]
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add line
                  </button>
                </div>

                {form.products.map((item, index) => (
                  <div key={`${index}-${item.product_id}`} className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto]">
                    <select
                      className="input"
                      value={item.product_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          products: current.products.map((productLine, productIndex) =>
                            productIndex === index
                              ? { ...productLine, product_id: event.target.value }
                              : productLine
                          )
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
                      className="input"
                      placeholder="Qty"
                      value={item.quantity_ordered}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          products: current.products.map((productLine, productIndex) =>
                            productIndex === index
                              ? { ...productLine, quantity_ordered: event.target.value }
                              : productLine
                          )
                        }))
                      }
                      required
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      placeholder="Unit cost"
                      value={item.unit_cost}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          products: current.products.map((productLine, productIndex) =>
                            productIndex === index
                              ? { ...productLine, unit_cost: event.target.value }
                              : productLine
                          )
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          products:
                            current.products.length === 1
                              ? current.products
                              : current.products.filter((_, productIndex) => productIndex !== index)
                        }))
                      }
                      disabled={form.products.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="label" htmlFor="purchase-notes">
                  Notes
                </label>
                <textarea
                  id="purchase-notes"
                  className="input min-h-24"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create purchase order'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatorOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {receivingPurchase ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Receive purchase order</h2>
              <p className="text-sm text-surface-500">
                Enter the quantity received for each line on {receivingPurchase.po_number}.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setReceivingPurchaseId(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              receiveMutation.mutate(receivingPurchase);
            }}
          >
            {(receivingPurchase.products ?? []).map((item) => (
              <div key={item.product_id} className="grid gap-3 rounded-2xl border border-surface-200 p-4 md:grid-cols-[1fr_140px_140px]">
                <div>
                  <p className="font-medium text-surface-900">{item.product_name}</p>
                  <p className="text-sm text-surface-500">
                    Pending: {formatNumber(item.pending_quantity ?? 0)} | Ordered:{' '}
                    {formatNumber(item.quantity_ordered ?? 0)}
                  </p>
                </div>

                <div className="text-sm text-surface-600">
                  <p>Unit cost</p>
                  <p className="font-medium text-surface-900">{formatCurrency(item.unit_cost ?? 0)}</p>
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={receiveQuantities[item.product_id] ?? String(item.pending_quantity ?? 0)}
                  onChange={(event) =>
                    setReceiveQuantities((current) => ({
                      ...current,
                      [item.product_id]: event.target.value
                    }))
                  }
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={receiveMutation.isPending}>
                {receiveMutation.isPending ? 'Receiving...' : 'Confirm receipt'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setReceivingPurchaseId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="card overflow-hidden">
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
                      onClick={() => {
                        setReceiveQuantities(
                          Object.fromEntries(
                            (purchase.products ?? []).map((item) => [
                              item.product_id,
                              String(item.pending_quantity ?? 0)
                            ])
                          )
                        );
                        setReceivingPurchaseId(purchase.id);
                      }}
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
    </div>
  );
}
