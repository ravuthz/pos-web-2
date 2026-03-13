import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { vendorService } from '@/services/vendor';
import type { Vendor } from '@/types/api';

export function VendorsPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const vendorsQuery = useQuery({
    queryKey: ['vendors', deferredSearch],
    queryFn: () => vendorService.getAll({ per_page: 50, search: deferredSearch || undefined })
  });

  if (vendorsQuery.isLoading) {
    return <LoadingState label="Loading vendors..." />;
  }

  if (vendorsQuery.isError) {
    return <ErrorState message={vendorsQuery.error.message} />;
  }

  const vendors = (vendorsQuery.data?.data ?? []) as Vendor[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Supplier directory for purchase orders and expense linking."
      />

      <div className="card">
        <input
          className="input"
          placeholder="Search vendors"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={vendors}
            keyExtractor={(vendor) => vendor.id}
            emptyMessage="No vendors matched the current search."
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
                header: 'Email',
                cell: (vendor) => vendor.email ?? '-'
              },
              {
                header: 'Status',
                cell: (vendor) => <StatusBadge value={vendor.is_active === false ? 'inactive' : 'active'} />
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
