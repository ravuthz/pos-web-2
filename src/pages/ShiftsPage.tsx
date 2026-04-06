import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
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
  const inputClass = 'input input-bordered w-full';
  const textareaClass = 'textarea textarea-bordered min-h-24 w-full';

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
        title={
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span>Shifts</span>
            {currentShift ? (
              <>
                <StatusBadge value={currentShift.status} />
                <span className="badge badge-neutral px-3">{currentShift.shift_number}</span>
              </>
            ) : (
              <span className="badge badge-outline px-3">No active shift</span>
            )}
          </div>
        }
        subtitle="Open and close cashier shifts with actual cash reconciliation."
        actions={
          currentShift ? (
            <>
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
        <CrudEditorLayout
          title="Open shift"
          description="Record opening floats before the cashier starts transactions."
          onClose={() => setIsOpenEditorVisible(false)}
        >
          {!selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before opening a shift."
            />
          ) : (
            <form
              className={CRUD_EDITOR_FORM_GRID_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                openShiftMutation.mutate(openForm);
              }}
            >
              <div className="card border border-base-300 bg-base-200/50 md:col-span-2 xl:col-span-3">
                <div className="card-body flex-row items-start gap-3 p-4">
                  <div className="rounded-box border border-base-300 bg-base-100 p-2">
                    <BadgeDollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-base-content">Opening float</p>
                    <p className="text-sm text-base-content/65">
                      Set the drawer starting balance in both currencies before sales begin.
                    </p>
                  </div>
                </div>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Opening cash (USD)</legend>
                <input
                  id="opening-cash-usd"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={openForm.opening_cash_float}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_cash_float: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Opening cash (KHR)</legend>
                <input
                  id="opening-cash-khr"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={openForm.opening_cash_float_khr}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_cash_float_khr: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Opening notes</legend>
                <textarea
                  id="opening-notes"
                  className={textareaClass}
                  value={openForm.opening_notes}
                  onChange={(event) =>
                    setOpenForm((current) => ({ ...current, opening_notes: event.target.value }))
                  }
                />
              </fieldset>

              <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                <button type="submit" className="btn btn-primary" disabled={openShiftMutation.isPending}>
                  {openShiftMutation.isPending ? 'Opening...' : 'Open shift'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOpenEditorVisible(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </CrudEditorLayout>
      ) : null}

      {isCloseEditorVisible && currentShift ? (
        <CrudEditorLayout
          title="Close shift"
          description="Reconcile expected cash against actual drawer counts."
          onClose={() => setIsCloseEditorVisible(false)}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Expected USD" value={formatCurrency(currentShift.expected_cash ?? 0)} />
            <StatCard label="Expected KHR" value={formatNumber(currentShift.expected_cash_khr ?? 0)} />
            <StatCard label="Shift Sales" value={formatCurrency(currentShift.total_sales ?? 0)} />
          </div>

          <form
            className={CRUD_EDITOR_FORM_GRID_CLASS}
            onSubmit={(event) => {
              event.preventDefault();
              closeShiftMutation.mutate(closeForm);
            }}
          >
            <div className="card border border-base-300 bg-base-200/50 md:col-span-2 xl:col-span-3">
              <div className="card-body gap-2 p-4">
                <p className="font-medium text-base-content">Reconciliation guide</p>
                <p className="text-sm text-base-content/65">
                  Compare the expected drawer totals above with the counted cash below before closing this shift.
                </p>
              </div>
            </div>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Actual cash (USD)</legend>
              <input
                id="actual-cash-usd"
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={closeForm.actual_cash}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, actual_cash: event.target.value }))
                }
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Actual cash (KHR)</legend>
              <input
                id="actual-cash-khr"
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={closeForm.actual_cash_khr}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, actual_cash_khr: event.target.value }))
                }
              />
            </fieldset>

            <fieldset className="fieldset md:col-span-2 xl:col-span-3">
              <legend className="fieldset-legend">Closing notes</legend>
              <textarea
                id="closing-notes"
                className={textareaClass}
                value={closeForm.closing_notes}
                onChange={(event) =>
                  setCloseForm((current) => ({ ...current, closing_notes: event.target.value }))
                }
              />
            </fieldset>

            <div className={CRUD_EDITOR_ACTIONS_CLASS}>
              <button type="submit" className="btn btn-primary" disabled={closeShiftMutation.isPending}>
                {closeShiftMutation.isPending ? 'Closing...' : 'Close shift'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCloseEditorVisible(false)}>
                Cancel
              </button>
            </div>
          </form>
        </CrudEditorLayout>
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
