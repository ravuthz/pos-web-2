import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { shiftService } from '@/services/shift';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Shift } from '@/types/api';

interface OpenShiftFormState {
  opening_cash_float: string;
  opening_cash_float_khr: string;
  opening_notes: string;
}

interface CloseShiftFormState {
  actual_cash: string;
  actual_cash_khr: string;
  closing_notes: string;
}

const emptyOpenForm: OpenShiftFormState = {
  opening_cash_float: '0',
  opening_cash_float_khr: '0',
  opening_notes: ''
};

const emptyCloseForm: CloseShiftFormState = {
  actual_cash: '0',
  actual_cash_khr: '0',
  closing_notes: ''
};

export function ShiftsPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isOpenEditorVisible, setIsOpenEditorVisible] = useState(false);
  const [isCloseEditorVisible, setIsCloseEditorVisible] = useState(false);
  const [openForm, setOpenForm] = useState<OpenShiftFormState>(emptyOpenForm);
  const [closeForm, setCloseForm] = useState<CloseShiftFormState>(emptyCloseForm);

  const shiftsQuery = useQuery({
    queryKey: ['shifts', selectedBranchId, page, pageSize],
    queryFn: () =>
      shiftService.getAll({
        branch_id: selectedBranchId ?? undefined,
        page,
        per_page: pageSize
      }),
    placeholderData: (previousData) => previousData
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

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const openShiftMutation = useMutation({
    mutationFn: async (payload: OpenShiftFormState) => {
      if (!selectedBranchId) {
        throw new Error('Select a branch before opening a shift.');
      }

      return shiftService.open({
        branch_id: selectedBranchId,
        opening_cash_float: Number(payload.opening_cash_float),
        opening_cash_float_khr: Number(payload.opening_cash_float_khr || '0'),
        opening_notes: payload.opening_notes.trim() || undefined
      });
    },
    onSuccess: async () => {
      toast.success('Shift opened.');
      setIsOpenEditorVisible(false);
      setOpenForm(emptyOpenForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shifts', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['current-shift', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-summary', selectedBranchId] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const closeShiftMutation = useMutation({
    mutationFn: async (payload: CloseShiftFormState) => {
      if (!currentShiftQuery.data) {
        throw new Error('There is no active shift to close.');
      }

      return shiftService.close(currentShiftQuery.data.id, {
        actual_cash: Number(payload.actual_cash || '0'),
        actual_cash_khr: Number(payload.actual_cash_khr || '0'),
        closing_notes: payload.closing_notes.trim() || undefined
      });
    },
    onSuccess: async () => {
      toast.success('Shift closed.');
      setIsCloseEditorVisible(false);
      setCloseForm(emptyCloseForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shifts', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['current-shift', selectedBranchId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-summary', selectedBranchId] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
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
  const shiftsMeta = getPaginationMeta(shiftsQuery.data?.meta);
  const currentShift = currentShiftQuery.data;
  const summary = (summaryQuery.data ?? {}) as {
    total_shifts?: number;
    total_sales?: number;
    average_sales_per_shift?: number;
    open_shifts?: number;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        subtitle="Open and close cashier shifts with actual cash reconciliation."
        actions={
          currentShift ? (
            <>
              <StatusBadge value={currentShift.status} />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCloseForm({
                    actual_cash: String(currentShift.expected_cash ?? 0),
                    actual_cash_khr: String(currentShift.expected_cash_khr ?? 0),
                    closing_notes: ''
                  });
                  setIsCloseEditorVisible(true);
                }}
              >
                Close shift
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsOpenEditorVisible(true)}
            >
              <Plus className="h-4 w-4" />
              Open shift
            </button>
          )
        }
      />

      {isOpenEditorVisible ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Open shift</h2>
              <p className="text-sm text-surface-500">
                Record opening floats before the cashier starts transactions.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={() => setIsOpenEditorVisible(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before opening a shift."
            />
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                openShiftMutation.mutate(openForm);
              }}
            >
              <div>
                <label className="label" htmlFor="opening-cash-usd">
                  Opening cash (USD)
                </label>
                <input
                  id="opening-cash-usd"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={openForm.opening_cash_float}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_cash_float: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="label" htmlFor="opening-cash-khr">
                  Opening cash (KHR)
                </label>
                <input
                  id="opening-cash-khr"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={openForm.opening_cash_float_khr}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_cash_float_khr: event.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="opening-notes">
                  Opening notes
                </label>
                <textarea
                  id="opening-notes"
                  className="input min-h-24"
                  value={openForm.opening_notes}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_notes: event.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={openShiftMutation.isPending}>
                  {openShiftMutation.isPending ? 'Opening...' : 'Open shift'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOpenEditorVisible(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {isCloseEditorVisible && currentShift ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Close shift</h2>
              <p className="text-sm text-surface-500">
                Reconcile expected cash against actual drawer counts.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={() => setIsCloseEditorVisible(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Expected USD" value={formatCurrency(currentShift.expected_cash ?? 0)} />
            <StatCard label="Expected KHR" value={formatNumber(currentShift.expected_cash_khr ?? 0)} />
            <StatCard label="Shift Sales" value={formatCurrency(currentShift.total_sales ?? 0)} />
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              closeShiftMutation.mutate(closeForm);
            }}
          >
            <div>
              <label className="label" htmlFor="actual-cash-usd">
                Actual cash (USD)
              </label>
              <input
                id="actual-cash-usd"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={closeForm.actual_cash}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, actual_cash: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="actual-cash-khr">
                Actual cash (KHR)
              </label>
              <input
                id="actual-cash-khr"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={closeForm.actual_cash_khr}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, actual_cash_khr: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="closing-notes">
                Closing notes
              </label>
              <textarea
                id="closing-notes"
                className="input min-h-24"
                value={closeForm.closing_notes}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, closing_notes: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={closeShiftMutation.isPending}>
                {closeShiftMutation.isPending ? 'Closing...' : 'Close shift'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCloseEditorVisible(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active Shift"
          value={currentShift?.shift_number ?? 'None'}
          description={currentShift ? formatDateTime(currentShift.opened_at) : 'No active shift'}
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
        <StatCard
          label="Open Shifts"
          value={formatNumber(summary.open_shifts ?? 0)}
          description="Open shifts within current filters"
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          data={shifts}
          keyExtractor={(shift) => shift.id}
          emptyMessage="No shifts found."
          isUpdating={shiftsQuery.isFetching}
          updateLabel="Refreshing shifts..."
          pagination={{
            page,
            pageSize,
            totalItems: shiftsMeta.totalItems,
            totalPages: shiftsMeta.totalPages,
            pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
            onPageChange: setPage,
            onPageSizeChange: (nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }
          }}
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
