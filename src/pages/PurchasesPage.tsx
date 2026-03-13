import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { purchaseService } from '@/services/purchase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { PurchaseOrder } from '@/types/api';

export function PurchasesPage() {
  const purchaseQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseService.getAll({ per_page: 50 })
  });

  if (purchaseQuery.isLoading) {
    return <LoadingState label="Loading purchase orders..." />;
  }

  if (purchaseQuery.isError) {
    return <ErrorState message={purchaseQuery.error.message} />;
  }

  const purchases = (purchaseQuery.data?.data ?? []) as PurchaseOrder[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        subtitle="Track vendor purchase orders, totals, and fulfillment status."
      />

      <div className="card overflow-hidden">
        <DataTable
          data={purchases}
          keyExtractor={(purchase) => purchase.id}
          emptyMessage="No purchase orders found."
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
              cell: (purchase) => formatCurrency(purchase.total ?? 0)
            },
            {
              header: 'Status',
              cell: (purchase) => <StatusBadge value={purchase.status} />
            }
          ]}
        />
      </div>
    </div>
  );
}
