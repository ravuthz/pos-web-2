import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const deferredSearch = useDeferredValue(search);

  const customersQuery = useQuery({
    queryKey: ['customers', deferredSearch],
    queryFn: () => customerService.getAll({ per_page: 50, search: deferredSearch || undefined })
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: CustomerFormState) => {
      const data = {
        name: payload.name.trim(),
        phone: payload.phone.trim() || undefined,
        email: payload.email.trim() || undefined,
        address: payload.address.trim() || undefined
      };

      if (editingCustomer) {
        return customerService.update(editingCustomer.id, data);
      }

      return customerService.create(data);
    },
    onSuccess: async () => {
      toast.success(editingCustomer ? 'Customer updated.' : 'Customer created.');
      resetEditor();
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

  function resetEditor() {
    setIsEditorOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  }

  function startEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? ''
    });
    setIsEditorOpen(true);
  }

  if (customersQuery.isLoading) {
    return <LoadingState label="Loading customers..." />;
  }

  if (customersQuery.isError) {
    return <ErrorState message={customersQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage customer records, contact details, and sales-linked accounts."
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            New customer
          </button>
        }
      />

      {isEditorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {editingCustomer ? 'Edit customer' : 'Create customer'}
              </h2>
              <p className="text-sm text-surface-500">
                {editingCustomer
                  ? 'Update customer contact information.'
                  : 'Create a new customer profile for POS and sales history.'}
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
              <label className="label" htmlFor="customer-name">
                Name
              </label>
              <input
                id="customer-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="customer-phone">
                Phone
              </label>
              <input
                id="customer-phone"
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="customer-email">
                Email
              </label>
              <input
                id="customer-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="customer-address">
                Address
              </label>
              <textarea
                id="customer-address"
                className="input min-h-28"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : editingCustomer
                    ? 'Update customer'
                    : 'Create customer'}
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
          placeholder="Search customers"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={customers}
            keyExtractor={(customer) => customer.id}
            emptyMessage="No customers matched the current search."
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
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => startEdit(customer)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
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
    </div>
  );
}
