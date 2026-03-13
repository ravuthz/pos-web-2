import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { stockMovementService } from '@/services/stockMovement';
import { useBranchStore } from '@/store/branch';
import { formatDateTime, formatNumber } from '@/lib/utils';
import type { StockMovement } from '@/types/api';

export function StockMovementsPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const stockQuery = useQuery({
    queryKey: ['stock-movements', selectedBranchId],
    queryFn: () =>
      stockMovementService.getAll({
        branch_id: selectedBranchId ?? undefined,
        per_page: 50
      })
  });

  if (stockQuery.isLoading) {
    return <LoadingState label="Loading stock movements..." />;
  }

  if (stockQuery.isError) {
    return <ErrorState message={stockQuery.error.message} />;
  }

  const movements = (stockQuery.data?.data ?? []) as StockMovement[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Monitor stock adjustments, purchase receipts, transfers, and sale deductions."
      />

      <div className="card overflow-hidden">
        <DataTable
          data={movements}
          keyExtractor={(movement) => movement.id}
          emptyMessage="No stock movements found."
          columns={[
            {
              header: 'Product',
              cell: (movement) => movement.product?.name ?? 'Unknown product'
            },
            {
              header: 'Branch',
              cell: (movement) => movement.branch?.name ?? 'Unknown'
            },
            {
              header: 'Type',
              cell: (movement) => <StatusBadge value={movement.movement_type} />
            },
            {
              header: 'Quantity',
              cell: (movement) => formatNumber(movement.quantity ?? 0)
            },
            {
              header: 'Before / After',
              cell: (movement) =>
                `${formatNumber(movement.quantity_before ?? 0)} -> ${formatNumber(movement.quantity_after ?? 0)}`
            },
            {
              header: 'Date',
              cell: (movement) => formatDateTime(movement.created_at)
            }
          ]}
        />
      </div>
    </div>
  );
}
