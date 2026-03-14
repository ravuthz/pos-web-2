import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
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
  const deferredSearch = useDeferredValue(search);
  const crudTabs = useCrudTabs<VendorFormState, Vendor>({
    createEmptyForm: () => ({ ...emptyForm }),
    getEditForm: (vendor) => ({
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
    })
  });

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
    mutationFn: async (tab: CrudEditorTab<VendorFormState>) => {
      const payload = tab.form;
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

      if (tab.type === 'edit' && tab.entityId) {
        return vendorService.update(tab.entityId, data);
      }

      return vendorService.create({
        ...data,
        code: payload.code.trim()
      });
    },
    onSuccess: async (_data, tab) => {
      toast.success(tab.type === 'edit' ? 'Vendor updated.' : 'Vendor created.');
      crudTabs.closeTab(tab.id);
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
  const activeEditorTab = crudTabs.activeEditorTab;
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Vendors' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];

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
              <h2 className="text-lg font-semibold text-surface-900">
                {activeEditorTab.type === 'edit' ? 'Edit vendor' : 'Create vendor'}
              </h2>
              <p className="text-sm text-surface-500">
                {activeEditorTab.type === 'edit'
                  ? 'Update supplier contact and payment details.'
                  : 'Add a supplier for purchase orders and cost tracking.'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(activeEditorTab);
            }}
          >
            <div>
              <label className="label" htmlFor="vendor-code">
                Code
              </label>
              <input
                id="vendor-code"
                className="input"
                value={activeEditorTab.form.code}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, code: event.target.value }))
                }
                disabled={activeEditorTab.type === 'edit'}
                required={activeEditorTab.type === 'create'}
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-name">
                Name
              </label>
              <input
                id="vendor-name"
                className="input"
                value={activeEditorTab.form.name}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, name: event.target.value }))
                }
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
                value={activeEditorTab.form.contact_person}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, contact_person: event.target.value }))
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
                value={activeEditorTab.form.email}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-phone">
                Phone
              </label>
              <input
                id="vendor-phone"
                className="input"
                value={activeEditorTab.form.phone}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-terms">
                Payment terms
              </label>
              <input
                id="vendor-terms"
                className="input"
                value={activeEditorTab.form.payment_terms}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, payment_terms: event.target.value }))
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
                value={activeEditorTab.form.credit_days}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, credit_days: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="vendor-status">
                Status
              </label>
              <select
                id="vendor-status"
                className="input"
                value={activeEditorTab.form.status}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
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
                value={activeEditorTab.form.address}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="vendor-notes">
                Notes
              </label>
              <textarea
                id="vendor-notes"
                className="input min-h-28"
                value={activeEditorTab.form.notes}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : activeEditorTab.type === 'edit'
                    ? 'Update vendor'
                    : 'Create vendor'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
        ) : (
          <div className="space-y-4">
        <input
          className="input"
          placeholder="Search vendors"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="overflow-hidden rounded-2xl border border-surface-200">
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
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => crudTabs.openEditTab(vendor)}>
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
        )}
      </CrudTabs>
    </div>
  );
}
