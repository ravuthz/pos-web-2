import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { vendorService } from '@/services/vendor';
import { extractApiError } from '@/lib/api';
import type { Vendor } from '@/types/api';

interface VendorFormState {
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  credit_days: string;
  notes: string;
  status: 'active' | 'inactive';
}

const emptyForm: VendorFormState = {
  code: '',
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  payment_terms: '',
  credit_days: '',
  notes: '',
  status: 'active'
};

export function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorFormState>(emptyForm);
  const deferredSearch = useDeferredValue(search);

  const vendorsQuery = useQuery({
    queryKey: ['vendors', deferredSearch, page, pageSize],
    queryFn: () =>
      vendorService.getAll({
        page,
        per_page: pageSize,
        search: deferredSearch || undefined
      }),
    placeholderData: (previousData) => previousData
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: VendorFormState) => {
      const data = {
        name: payload.name.trim(),
        contact_person: payload.contact_person.trim() || undefined,
        email: payload.email.trim() || undefined,
        phone: payload.phone.trim() || undefined,
        address: payload.address.trim() || undefined,
        payment_terms: payload.payment_terms.trim() || undefined,
        credit_days: payload.credit_days ? Number(payload.credit_days) : undefined,
        notes: payload.notes.trim() || undefined,
        status: payload.status
      };

      if (editingVendor) {
        return vendorService.update(editingVendor.id, data);
      }

      return vendorService.create({
        ...data,
        code: payload.code.trim()
      });
    },
    onSuccess: async () => {
      toast.success(editingVendor ? 'Vendor updated.' : 'Vendor created.');
      resetEditor();
      await queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorService.delete(id),
    onSuccess: async () => {
      toast.success('Vendor deleted.');
      await queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const vendors = (vendorsQuery.data?.data ?? []) as Vendor[];
  const vendorsMeta = getPaginationMeta(vendorsQuery.data?.meta);
  const isVendorsInitialLoad = vendorsQuery.isLoading && !vendorsQuery.data;

  function resetEditor() {
    setIsEditorOpen(false);
    setEditingVendor(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditingVendor(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  }

  function startEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setForm({
      code: vendor.code ?? '',
      name: vendor.name ?? '',
      contact_person: vendor.contact_person ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      payment_terms: vendor.payment_terms ?? '',
      credit_days: vendor.credit_days ? String(vendor.credit_days) : '',
      notes: vendor.notes ?? '',
      status: vendor.status === 'inactive' ? 'inactive' : 'active'
    });
    setIsEditorOpen(true);
  }

  if (isVendorsInitialLoad) {
    return <LoadingState label="Loading vendors..." />;
  }

  if (vendorsQuery.isError && !vendorsQuery.data) {
    return <ErrorState message={vendorsQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage suppliers used for purchases and expense association."
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            New vendor
          </button>
        }
      />

      {isEditorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {editingVendor ? 'Edit vendor' : 'Create vendor'}
              </h2>
              <p className="text-sm text-surface-500">
                {editingVendor
                  ? 'Update supplier contact and payment details.'
                  : 'Add a supplier for purchase orders and cost tracking.'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={resetEditor}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div>
              <label className="label" htmlFor="vendor-code">
                Code
              </label>
              <input
                id="vendor-code"
                className="input"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                disabled={Boolean(editingVendor)}
                required={!editingVendor}
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-name">
                Name
              </label>
              <input
                id="vendor-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-contact">
                Contact person
              </label>
              <input
                id="vendor-contact"
                className="input"
                value={form.contact_person}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contact_person: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-email">
                Email
              </label>
              <input
                id="vendor-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-phone">
                Phone
              </label>
              <input
                id="vendor-phone"
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-terms">
                Payment terms
              </label>
              <input
                id="vendor-terms"
                className="input"
                value={form.payment_terms}
                onChange={(event) =>
                  setForm((current) => ({ ...current, payment_terms: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-credit-days">
                Credit days
              </label>
              <input
                id="vendor-credit-days"
                type="number"
                min="0"
                className="input"
                value={form.credit_days}
                onChange={(event) => setForm((current) => ({ ...current, credit_days: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-status">
                Status
              </label>
              <select
                id="vendor-status"
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

            <div className="md:col-span-2">
              <label className="label" htmlFor="vendor-address">
                Address
              </label>
              <textarea
                id="vendor-address"
                className="input min-h-24"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="vendor-notes">
                Notes
              </label>
              <textarea
                id="vendor-notes"
                className="input min-h-28"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : editingVendor
                    ? 'Update vendor'
                    : 'Create vendor'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetEditor}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="card">
        <input
          className="input"
          placeholder="Search vendors"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={vendors}
            keyExtractor={(vendor) => vendor.id}
            emptyMessage="No vendors matched the current search."
            isUpdating={vendorsQuery.isFetching}
            updateLabel="Refreshing vendors..."
            pagination={{
              page,
              pageSize,
              totalItems: vendorsMeta.totalItems,
              totalPages: vendorsMeta.totalPages,
              pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }
            }}
            columns={[
              {
                header: 'Vendor',
                cell: (vendor) => (
                  <div>
                    <p className="font-medium text-surface-900">{vendor.name}</p>
                    <p className="text-xs text-surface-500">{vendor.code ?? 'No vendor code'}</p>
                  </div>
                )
              },
              {
                header: 'Contact',
                cell: (vendor) => vendor.contact_person ?? vendor.phone ?? 'No contact info'
              },
              {
                header: 'Payment',
                cell: (vendor) => vendor.payment_terms ?? '-'
              },
              {
                header: 'Status',
                cell: (vendor) => <StatusBadge value={vendor.status ?? 'active'} />
              },
              {
                header: 'Actions',
                cell: (vendor) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => startEdit(vendor)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => {
                        if (window.confirm(`Delete vendor "${vendor.name}"?`)) {
                          deleteMutation.mutate(vendor.id);
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
