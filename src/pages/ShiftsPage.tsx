import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { shiftService } from '@/services/shift';
import { useBranchStore } from '@/store/branch';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Shift } from '@/types/api';

export function ShiftsPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const shiftsQuery = useQuery({
    queryKey: ['shifts', selectedBranchId],
    queryFn: () => shiftService.getAll({ branch_id: selectedBranchId ?? undefined })
  });

  const currentShiftQuery = useQuery({
    queryKey: ['current-shift', selectedBranchId],
    queryFn: () => shiftService.getCurrent(selectedBranchId ?? undefined),
    enabled: Boolean(selectedBranchId)
  });

  const summaryQuery = useQuery({
    queryKey: ['shift-summary', selectedBranchId],
    queryFn: () => shiftService.getSummary({ branch_id: selectedBranchId ?? undefined })
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shifts', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['current-shift', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-summary', selectedBranchId] })
      ]);
    }
  });

  if (shiftsQuery.isLoading || currentShiftQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState label="Loading shifts..." />;
  }

  if (shiftsQuery.isError) {
    return <ErrorState message={shiftsQuery.error.message} />;
  }

  if (currentShiftQuery.isError) {
    return <ErrorState message={currentShiftQuery.error.message} />;
  }

  if (summaryQuery.isError) {
    return <ErrorState message={summaryQuery.error.message} />;
  }

  const shifts = (shiftsQuery.data?.data ?? []) as Shift[];
  const currentShift = currentShiftQuery.data;
  const summary = (summaryQuery.data ?? {}) as {
    total_shifts?: number;
    total_sales?: number;
    average_sales_per_shift?: number;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        subtitle="Track active cashier shifts and day-level cash performance."
        actions={
          !currentShift ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openShiftMutation.mutate()}
              disabled={openShiftMutation.isPending || !selectedBranchId}
            >
              {openShiftMutation.isPending ? 'Opening shift...' : 'Open shift'}
            </button>
          ) : (
            <StatusBadge value={currentShift.status} />
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Active Shift"
          value={currentShift?.shift_number ?? 'None'}
          description={currentShift ? formatDateTime(currentShift.opened_at) : 'No active shift for this branch'}
          tone={currentShift ? 'success' : 'warning'}
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(summary.total_sales ?? 0)}
          description={`${formatNumber(summary.total_shifts ?? 0)} shifts in current scope`}
        />
        <StatCard
          label="Average / Shift"
          value={formatCurrency(summary.average_sales_per_shift ?? 0)}
          description="Average shift sales performance"
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          data={shifts}
          keyExtractor={(shift) => shift.id}
          emptyMessage="No shifts found."
          columns={[
            {
              header: 'Shift',
              cell: (shift) => (
                <div>
                  <p className="font-medium text-surface-900">{shift.shift_number}</p>
                  <p className="text-xs text-surface-500">{shift.branch?.name ?? 'Unknown branch'}</p>
                </div>
              )
            },
            {
              header: 'Cashier',
              cell: (shift) => shift.cashier?.name ?? shift.user?.name ?? 'Unknown'
            },
            {
              header: 'Opened',
              cell: (shift) => formatDateTime(shift.opened_at)
            },
            {
              header: 'Sales',
              cell: (shift) => formatCurrency(shift.total_sales ?? 0)
            },
            {
              header: 'Transactions',
              cell: (shift) => formatNumber(shift.total_transactions ?? 0)
            },
            {
              header: 'Status',
              cell: (shift) => <StatusBadge value={shift.status} />
            }
          ]}
        />
      </div>
    </div>
  );
}
