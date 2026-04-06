import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { customerService } from '@/services/customer';
import { extractApiError } from '@/lib/api';
import type { Customer } from '@/types/api';

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
}

const emptyForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: ''
};

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);
  const crudTabs = useCrudTabs<CustomerFormState, Customer>({
    createEmptyForm: () => ({ ...emptyForm }),
    getEditForm: (customer) => ({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? ''
    })
  });

  const customersQuery = useQuery({
    queryKey: ['customers', deferredSearch, page, pageSize],
    queryFn: () =>
      customerService.getAll({
        page,
        per_page: pageSize,
        search: deferredSearch || undefined
      }),
    placeholderData: (previousData) => previousData
  });

  const saveMutation = useMutation({
    mutationFn: async (tab: CrudEditorTab<CustomerFormState>) => {
      const payload = tab.form;
      const data = {
        name: payload.name.trim(),
        phone: payload.phone.trim() || undefined,
        email: payload.email.trim() || undefined,
        address: payload.address.trim() || undefined
      };

      if (tab.type === 'edit' && tab.entityId) {
        return customerService.update(tab.entityId, data);
      }

      return customerService.create(data);
    },
    onSuccess: async (_data, tab) => {
      toast.success(tab.type === 'edit' ? 'Customer updated.' : 'Customer created.');
      crudTabs.closeTab(tab.id);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: async () => {
      toast.success('Customer deleted.');
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const customers = (customersQuery.data?.data ?? []) as Customer[];
  const customersMeta = getPaginationMeta(customersQuery.data?.meta);
  const isCustomersInitialLoad = customersQuery.isLoading && !customersQuery.data;
  const activeEditorTab = crudTabs.activeEditorTab;
  const inputClass = 'input input-bordered w-full';
  const textareaClass = 'textarea textarea-bordered min-h-24 w-full';
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Customers' },
    ...crudTabs.tabs.map((tab) => ({
      id: tab.id,
      type: tab.type,
      title: tab.title
    }))
  ];

  if (isCustomersInitialLoad) {
    return <LoadingState label="Loading customers..." />;
  }

  if (customersQuery.isError && !customersQuery.data) {
    return <ErrorState message={customersQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage customer records, contact details, and sales-linked accounts."
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
            title={activeEditorTab.type === 'edit' ? 'Edit customer' : 'Create customer'}
            description={
              activeEditorTab.type === 'edit'
                ? 'Update customer contact information.'
                : 'Create a new customer profile for POS and sales history.'
            }
            onClose={() => crudTabs.closeTab(activeEditorTab.id)}
          >
            <form
              className={CRUD_EDITOR_FORM_GRID_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(activeEditorTab);
              }}
            >
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Name</legend>
                <input
                  id="customer-name"
                  className={inputClass}
                  value={activeEditorTab.form.name}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Phone</legend>
                <input
                  id="customer-phone"
                  className={inputClass}
                  value={activeEditorTab.form.phone}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Email</legend>
                <input
                  id="customer-email"
                  type="email"
                  className={inputClass}
                  value={activeEditorTab.form.email}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, email: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Address</legend>
                <textarea
                  id="customer-address"
                  className={textareaClass}
                  value={activeEditorTab.form.address}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, address: event.target.value }))
                  }
                />
              </fieldset>

              <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? 'Saving...'
                    : activeEditorTab.type === 'edit'
                      ? 'Update customer'
                      : 'Create customer'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                  Cancel
                </button>
              </div>
            </form>
          </CrudEditorLayout>
        ) : (
          <div className="space-y-4">
        <input
          className="input"
          placeholder="Search customers"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="app-table-shell">
          <DataTable
            data={customers}
            keyExtractor={(customer) => customer.id}
            emptyMessage="No customers matched the current search."
            isUpdating={customersQuery.isFetching}
            updateLabel="Refreshing customers..."
            pagination={{
              page,
              pageSize,
              totalItems: customersMeta.totalItems,
              totalPages: customersMeta.totalPages,
              pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }
            }}
            columns={[
              {
                header: 'Customer',
                cell: (customer) => (
                  <div>
                    <p className="font-medium text-surface-900">{customer.name}</p>
                    <p className="text-xs text-surface-500">{customer.display_name ?? customer.code ?? 'Customer'}</p>
                  </div>
                )
              },
              {
                header: 'Contact',
                cell: (customer) => customer.phone ?? customer.email ?? 'No contact info'
              },
              {
                header: 'Address',
                cell: (customer) => customer.address ?? '-'
              },
              {
                header: 'Sales',
                cell: (customer) => String(customer.sales_count ?? 0)
              },
              {
                header: 'Actions',
                cell: (customer) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-sm btn-square" title="Edit" onClick={() => crudTabs.openEditTab(customer)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-error btn-sm btn-square"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete customer "${customer.name}"?`)) {
                          deleteMutation.mutate(customer.id);
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
