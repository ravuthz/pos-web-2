import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, ScanLine, Trash2, UserRound, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { customerService } from '@/services/customer';
import { saleService } from '@/services/sale';
import { shiftService } from '@/services/shift';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Customer, StoreSalePayload } from '@/types/api';

interface PosProduct {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  selling_price: number;
  quantity_on_hand?: number;
  category?: {
    id: number;
    name: string;
  } | null;
}

interface CartItem {
  product_id: number;
  name: string;
  code?: string;
  quantity: number;
  unit_price: number;
  max_stock: number;
}

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PosPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [customerSearch, setCustomerSearch] = useState('');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'khqr'>('cash');
  const [paymentReceived, setPaymentReceived] = useState('0');
  const [notes, setNotes] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const currentShiftQuery = useQuery({
    queryKey: ['current-shift', selectedBranchId],
    queryFn: () => shiftService.getCurrent(selectedBranchId ?? undefined),
    enabled: Boolean(selectedBranchId)
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before searching.');
      }

      return saleService.searchProducts(selectedBranchId, query);
    },
    onSuccess: (products: PosProduct[]) => {
      setSearchResults(products);
      setMessage(null);
    },
    onError: (error) => {
      setMessage(extractApiError(error));
    }
  });

  const customerSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      return customerService.search(query.trim());
    },
    onSuccess: (customers: Customer[]) => {
      setCustomerResults(customers);
      setMessage(null);
    },
    onError: (error) => {
      setCustomerResults([]);
      setMessage(extractApiError(error));
    }
  });

  const barcodeMutation = useMutation({
    mutationFn: async (value: string) => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before scanning.');
      }

      return saleService.searchByBarcode(value, selectedBranchId);
    },
    onSuccess: (product: PosProduct) => {
      addToCart(product);
      setBarcode('');
      setMessage(null);
    },
    onError: (error) => {
      setMessage(extractApiError(error));
    }
  });

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before opening a shift.');
      }

      return shiftService.open({
        branch_id: selectedBranchId,
        opening_cash_float: 0,
        opening_cash_float_khr: 0
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-shift', selectedBranchId] });
      setMessage('Shift opened successfully.');
    },
    onError: (error) => {
      setMessage(extractApiError(error));
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before checkout.');
      }

      if (!currentShiftQuery.data) {
        throw new Error('Open a shift before checkout.');
      }

      if (cart.length === 0) {
        throw new Error('Add products to the cart before checkout.');
      }

      const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const received = Number(paymentReceived || '0');

      const payload: StoreSalePayload = {
        branch_id: selectedBranchId,
        customer_id: selectedCustomer?.id,
        payment_method: paymentMethod,
        payment_received: received,
        payment_received_usd: paymentMethod === 'cash' ? received : undefined,
        total_amount: subtotal,
        notes: notes || undefined,
        idempotency_key: makeIdempotencyKey(),
        products: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      return saleService.create(payload);
    },
    onSuccess: async (response) => {
      setCart([]);
      setCustomerResults([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setSearchResults([]);
      setSearch('');
      setPaymentMethod('cash');
      setPaymentReceived('0');
      setNotes('');
      setMessage(response.message || 'Sale completed successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => {
      setMessage(extractApiError(error));
    }
  });

  function addToCart(product: PosProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.id);

      if (existing) {
        return current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.max_stock || item.quantity + 1)
              }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          code: product.code,
          quantity: 1,
          unit_price: Number(product.selling_price),
          max_stock: Number(product.quantity_on_hand ?? 9999)
        }
      ];
    });
  }

  function updateQuantity(productId: number, nextQuantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: Math.max(0, Math.min(nextQuantity, item.max_stock || nextQuantity))
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const receivedAmount = Number(paymentReceived || '0');
  const change = Math.max(0, receivedAmount - subtotal);
  const remaining = Math.max(0, subtotal - receivedAmount);

  if (!selectedBranchId) {
    return (
      <EmptyState
        title="Select a branch first"
        message="Use the branch selector in the header to pick a branch before opening POS."
      />
    );
  }

  if (currentShiftQuery.isLoading) {
    return <LoadingState label="Loading current shift..." />;
  }

  if (currentShiftQuery.isError) {
    return <ErrorState message={currentShiftQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS"
        subtitle="Search, scan, and check out products from the selected branch."
        actions={
          currentShiftQuery.data ? (
            <StatusBadge value={currentShiftQuery.data.status} />
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openShiftMutation.mutate()}
              disabled={openShiftMutation.isPending}
            >
              {openShiftMutation.isPending ? 'Opening shift...' : 'Open shift'}
            </button>
          )
        }
      />

      {message ? (
        <div role="alert" className="alert border border-base-300 bg-base-100 text-sm text-base-content shadow-sm">
          <span>{message}</span>
        </div>
      ) : null}

      {!currentShiftQuery.data ? (
        <EmptyState
          title="No active shift"
          message="Open a shift to enable product search and checkout for this branch."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            <div className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">Customer</h2>
                    <p className="text-sm text-surface-500">Search by name or phone and attach the sale.</p>
                  </div>
                  <div className="badge badge-outline badge-primary">
                    {selectedCustomer ? 'Customer attached' : 'Walk-in sale'}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label" htmlFor="customer-search">
                      Search customers
                    </label>
                    <input
                      id="customer-search"
                      className="input input-bordered w-full"
                      placeholder="Search by name or phone"
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && customerSearch.trim()) {
                          event.preventDefault();
                          customerSearchMutation.mutate(customerSearch);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary self-end"
                    onClick={() => customerSearchMutation.mutate(customerSearch)}
                    disabled={customerSearchMutation.isPending || customerSearch.trim().length === 0}
                  >
                    {customerSearchMutation.isPending ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="card border border-base-300 bg-base-200/60 shadow-sm">
                  <div className="card-body flex-row items-start justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-box bg-primary/10 p-2 text-primary shadow-sm">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-surface-900">
                          {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                        </p>
                        <p className="text-sm text-surface-500">
                          {selectedCustomer
                            ? selectedCustomer.phone ?? selectedCustomer.email ?? 'No contact info'
                            : 'No customer selected for this sale.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="badge badge-ghost badge-sm">
                        {selectedCustomer ? 'Selected' : 'Default'}
                      </div>
                      {selectedCustomer ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
                          onClick={() => setSelectedCustomer(null)}
                          aria-label="Clear selected customer"
                          title="Clear customer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {customerResults.length > 0 ? (
                  <div className="grid gap-3">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="card w-full border border-base-300 bg-base-100 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-md"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerResults([]);
                          setCustomerSearch(customer.display_name ?? customer.name);
                        }}
                      >
                        <div className="card-body gap-2 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-surface-900">{customer.name}</p>
                              <p className="mt-1 text-sm text-surface-500">
                                {customer.phone ?? customer.email ?? 'No contact info'}
                              </p>
                            </div>
                            <span className="badge badge-primary badge-outline badge-sm">Select</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {customerSearchMutation.isSuccess && customerSearch.trim() && customerResults.length === 0 ? (
                  <p className="text-sm text-surface-500">No customers matched that search.</p>
                ) : null}
              </div>
            </div>

            <div className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-5 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900">Search and scan</h2>
                  <p className="text-sm text-surface-500">Find products quickly by keyword, product code, or barcode.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label" htmlFor="product-search">
                      Search products
                    </label>
                    <input
                      id="product-search"
                      className="input input-bordered w-full"
                      placeholder="Search by name, code, or barcode"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary self-end"
                    onClick={() => searchMutation.mutate(search)}
                    disabled={searchMutation.isPending || search.trim().length === 0}
                  >
                    {searchMutation.isPending ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label" htmlFor="barcode">
                      Scan barcode
                    </label>
                    <input
                      id="barcode"
                      className="input input-bordered w-full"
                      placeholder="Enter or scan a barcode"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && barcode.trim()) {
                          event.preventDefault();
                          barcodeMutation.mutate(barcode);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary self-end"
                    onClick={() => barcodeMutation.mutate(barcode)}
                    disabled={barcodeMutation.isPending || barcode.trim().length === 0}
                  >
                    <ScanLine className="h-4 w-4" />
                    {barcodeMutation.isPending ? 'Scanning...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">Search results</h2>
                    <p className="text-sm text-surface-500">Tap a product card to move it into the cart.</p>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="badge badge-outline badge-primary">{searchResults.length} products</div>
                  ) : null}
                </div>

                {searchResults.length === 0 ? (
                  <EmptyState
                    title="No products loaded"
                    message="Search by name or scan a barcode to pull products into the POS cart."
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        className="card border border-base-300 bg-base-100 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-md"
                      >
                        <div className="card-body gap-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-surface-900">{product.name}</p>
                              <p className="mt-1 text-sm text-surface-500">
                                {product.code ?? product.barcode ?? 'No code'}
                              </p>
                            </div>
                            <p className="shrink-0 font-semibold text-primary-700">
                              {formatCurrency(Number(product.selling_price))}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="badge badge-outline">
                              {product.category?.name ?? 'Uncategorized'}
                            </span>
                            <span className="badge badge-ghost">Stock {product.quantity_on_hand ?? 0}</span>
                            {product.barcode ? <span className="badge badge-ghost">Barcode</span> : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-lg">
            <div className="card-body gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900">Cart</h2>
                  <p className="text-sm text-surface-500">Adjust quantities, then complete checkout.</p>
                </div>
                {cart.length > 0 ? (
                  <div className="badge badge-outline badge-primary">{totalItems} items</div>
                ) : null}
              </div>

              {cart.length === 0 ? (
                <EmptyState
                  title="Your cart is empty"
                  message="Products added from search or barcode scan will appear here."
                />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.product_id}
                        className="card border border-base-300 bg-base-200/60 shadow-sm"
                      >
                        <div className="card-body gap-4 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-surface-900">{item.name}</p>
                              <p className="text-sm text-surface-500">{item.code ?? 'No code'}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-surface-400">
                                Unit {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-square"
                              onClick={() => updateQuantity(item.product_id, 0)}
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 rounded-box border border-base-300 bg-base-100 p-1 shadow-sm">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm btn-square"
                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="flex h-8 min-w-10 items-center justify-center rounded-box bg-base-200 px-3 text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm btn-square"
                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-right font-semibold text-surface-900">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card border border-primary/20 bg-primary/5 shadow-md">
                    <div className="card-body gap-4 p-5">
                      <div className="grid gap-3">
                        <div>
                          <label className="label" htmlFor="payment-method">
                            Payment method
                          </label>
                          <select
                            id="payment-method"
                            className="select select-bordered w-full"
                            value={paymentMethod}
                            onChange={(event) =>
                              setPaymentMethod(event.target.value as 'cash' | 'card' | 'transfer' | 'khqr')
                            }
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="transfer">Transfer</option>
                            <option value="khqr">KHQR</option>
                          </select>
                        </div>
                        <div>
                          <label className="label" htmlFor="payment-received">
                            Payment received
                          </label>
                          <input
                            id="payment-received"
                            className="input input-bordered w-full"
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentReceived}
                            onChange={(event) => setPaymentReceived(event.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="notes">
                            Notes
                          </label>
                          <textarea
                            id="notes"
                            className="textarea textarea-bordered min-h-24 w-full"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Optional notes for this sale"
                          />
                        </div>
                      </div>

                      <div className="rounded-[calc(var(--radius-box)*1.1)] border border-base-300 bg-base-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-surface-600">
                          <span>Items</span>
                          <span>{totalItems}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-surface-600">
                          <span>Total</span>
                          <span className="text-lg font-semibold text-surface-900">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-surface-600">
                          <span>{remaining > 0 ? 'Remaining' : 'Change'}</span>
                          <span className={remaining > 0 ? 'font-semibold text-error' : 'font-semibold text-success'}>
                            {formatCurrency(remaining > 0 ? remaining : change)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-lg w-full"
                        onClick={() => checkoutMutation.mutate()}
                        disabled={checkoutMutation.isPending}
                      >
                        {checkoutMutation.isPending
                          ? 'Processing sale...'
                          : `Complete checkout • ${formatCurrency(subtotal)}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
