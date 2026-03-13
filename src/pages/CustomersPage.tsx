import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { customerService } from '@/services/customer';
import type { Customer } from '@/types/api';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const customersQuery = useQuery({
    queryKey: ['customers', deferredSearch],
    queryFn: () => customerService.getAll({ per_page: 50, search: deferredSearch || undefined })
  });

  if (customersQuery.isLoading) {
    return <LoadingState label="Loading customers..." />;
  }

  if (customersQuery.isError) {
    return <ErrorState message={customersQuery.error.message} />;
  }

  const customers = (customersQuery.data?.data ?? []) as Customer[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Browse customer records, contact details, and account status."
      />

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
                    <p className="text-xs text-surface-500">{customer.code ?? 'No customer code'}</p>
                  </div>
                )
              },
              {
                header: 'Contact',
                cell: (customer) => customer.phone ?? customer.email ?? 'No contact info'
              },
              {
                header: 'Type',
                cell: (customer) => customer.customer_type ?? 'Individual'
              },
              {
                header: 'Credit Limit',
                cell: (customer) => customer.credit_limit?.toString() ?? '-'
              },
              {
                header: 'Status',
                cell: (customer) => (
                  <StatusBadge value={customer.is_active === false ? 'inactive' : 'active'} />
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
