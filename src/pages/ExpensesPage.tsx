import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { expenseService } from '@/services/expense';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Expense } from '@/types/api';

const expenseCategories = [
  'rent',
  'utilities',
  'salaries',
  'supplies',
  'maintenance',
  'marketing',
  'purchase_order',
  'other'
] as const;

interface ExpenseFormState {
  category: (typeof expenseCategories)[number];
  amount: string;
  expense_number: string;
  receipt_number: string;
  expense_date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'check';
  description: string;
  notes: string;
}

const emptyForm: ExpenseFormState = {
  category: 'other',
  amount: '0',
  expense_number: '',
  receipt_number: '',
  expense_date: new Date().toISOString().slice(0, 10),
  payment_method: 'cash',
  description: '',
  notes: ''
};

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const crudTabs = useCrudTabs<ExpenseFormState, Expense>({
    createEmptyForm: () => ({
      ...emptyForm,
      expense_number: `EXP-${Date.now()}`
    }),
    getEditForm: (expense) => ({
      category: expense.category as ExpenseFormState['category'],
      amount: String(expense.amount ?? 0),
      expense_number: expense.expense_number ?? '',
      receipt_number: expense.receipt_number ?? '',
      expense_date: expense.expense_date ?? new Date().toISOString().slice(0, 10),
      payment_method: expense.payment_method ?? 'cash',
      description: expense.description ?? '',
      notes: expense.notes ?? ''
    })
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', selectedBranchId, page, pageSize],
    queryFn: () =>
      expenseService.getAll({
        branch_id: selectedBranchId ?? undefined,
        page,
        per_page: pageSize
      }),
    placeholderData: (previousData) => previousData
  });

  const summaryQuery = useQuery({
    queryKey: ['expenses-summary', selectedBranchId],
    queryFn: () => expenseService.getSummary({ branch_id: selectedBranchId ?? undefined })
  });

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const saveMutation = useMutation({
    mutationFn: async (tab: CrudEditorTab<ExpenseFormState>) => {
      const payload = tab.form;
      if (!selectedBranchId) {
        throw new Error('Select a branch before creating an expense.');
      }

      const data = {
        branch_id: selectedBranchId,
        category: payload.category,
        amount: Number(payload.amount),
        expense_number: payload.expense_number.trim(),
        receipt_number: payload.receipt_number.trim() || undefined,
        expense_date: payload.expense_date,
        payment_method: payload.payment_method,
        description: payload.description.trim() || undefined,
        notes: payload.notes.trim() || undefined
      };

      if (tab.type === 'edit' && tab.entityId) {
        return expenseService.update(tab.entityId, data);
      }

      return expenseService.create(data);
    },
    onSuccess: async (_data, tab) => {
      toast.success(tab.type === 'edit' ? 'Expense updated.' : 'Expense created.');
      crudTabs.closeTab(tab.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => expenseService.approve(id),
    onSuccess: async () => {
      toast.success('Expense approved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => expenseService.markAsPaid(id, {}),
    onSuccess: async () => {
      toast.success('Expense marked as paid.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: async () => {
      toast.success('Expense deleted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      ]);
    },
    onError: (error) => toast.error(extractApiError(error))
  });

  if (expensesQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState label="Loading expenses..." />;
  }

  if (expensesQuery.isError) {
    return <ErrorState message={expensesQuery.error.message} />;
  }

  if (summaryQuery.isError) {
    return <ErrorState message={summaryQuery.error.message} />;
  }

  const expenses = (expensesQuery.data?.data ?? []) as Expense[];
  const expensesMeta = getPaginationMeta(expensesQuery.data?.meta);
  const activeEditorTab = crudTabs.activeEditorTab;
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Expenses' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];
  const summary = (summaryQuery.data ?? {}) as {
    today?: { total?: number; count?: number };
    this_month?: { total?: number; count?: number };
    pending?: { total?: number; count?: number };
  };
  const inputClass = 'input input-bordered w-full';
  const selectClass = 'select select-bordered w-full';
  const textareaClass = 'textarea textarea-bordered min-h-24 w-full';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Create, review, approve, and settle branch expenses."
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
            title={activeEditorTab.type === 'edit' ? 'Edit expense' : 'Create expense'}
            description={
              activeEditorTab.type === 'edit'
                ? 'Only pending expenses can be updated.'
                : 'Create a new expense for the selected branch.'
            }
            onClose={() => crudTabs.closeTab(activeEditorTab.id)}
          >
            {!selectedBranchId ? (
              <EmptyState
                title="Branch required"
                message="Pick a branch from the header before creating an expense."
              />
            ) : (
              <form
                className={CRUD_EDITOR_FORM_GRID_CLASS}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveMutation.mutate(activeEditorTab);
                }}
              >
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Expense number</legend>
                  <input
                    id="expense-number"
                    className={inputClass}
                    value={activeEditorTab.form.expense_number}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, expense_number: event.target.value }))
                    }
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Category</legend>
                  <select
                    id="expense-category"
                    className={selectClass}
                    value={activeEditorTab.form.category}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        category: event.target.value as ExpenseFormState['category']
                      }))
                    }
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Amount</legend>
                  <input
                    id="expense-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={activeEditorTab.form.amount}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, amount: event.target.value }))
                    }
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Expense date</legend>
                  <input
                    id="expense-date"
                    type="date"
                    className={inputClass}
                    value={activeEditorTab.form.expense_date}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, expense_date: event.target.value }))
                    }
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Payment method</legend>
                  <select
                    id="expense-payment-method"
                    className={selectClass}
                    value={activeEditorTab.form.payment_method}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                        ...current,
                        payment_method: event.target.value as ExpenseFormState['payment_method']
                      }))
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Receipt number</legend>
                  <input
                    id="expense-receipt"
                    className={inputClass}
                    value={activeEditorTab.form.receipt_number}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, receipt_number: event.target.value }))
                    }
                  />
                </fieldset>

                <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                  <legend className="fieldset-legend">Description</legend>
                  <textarea
                    id="expense-description"
                    className={textareaClass}
                    value={activeEditorTab.form.description}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </fieldset>

                <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                  <legend className="fieldset-legend">Notes</legend>
                  <textarea
                    id="expense-notes"
                    className={textareaClass}
                    value={activeEditorTab.form.notes}
                    onChange={(event) =>
                      crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </fieldset>

                <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending
                      ? 'Saving...'
                      : activeEditorTab.type === 'edit'
                        ? 'Update expense'
                        : 'Create expense'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </CrudEditorLayout>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Today Paid"
                value={formatCurrency(summary.today?.total ?? 0)}
                description={`${formatNumber(summary.today?.count ?? 0)} expenses paid today`}
                tone="warning"
              />
              <StatCard
                label="Month Paid"
                value={formatCurrency(summary.this_month?.total ?? 0)}
                description={`${formatNumber(summary.this_month?.count ?? 0)} expenses paid this month`}
              />
              <StatCard
                label="Pending"
                value={formatCurrency(summary.pending?.total ?? 0)}
                description={`${formatNumber(summary.pending?.count ?? 0)} expenses awaiting approval`}
                tone="danger"
              />
            </div>

            <div className="app-table-shell">
              <DataTable
                data={expenses}
                keyExtractor={(expense) => expense.id}
                emptyMessage="No expenses found."
                isUpdating={expensesQuery.isFetching}
                updateLabel="Refreshing expenses..."
                pagination={{
                  page,
                  pageSize,
                  totalItems: expensesMeta.totalItems,
                  totalPages: expensesMeta.totalPages,
                  pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
                  onPageChange: setPage,
                  onPageSizeChange: (nextPageSize) => {
                    setPageSize(nextPageSize);
                    setPage(1);
                  }
                }}
                columns={[
                  {
                    header: 'Expense',
                    cell: (expense) => (
                      <div>
                        <p className="font-medium text-surface-900">{expense.expense_number}</p>
                        <p className="text-xs text-surface-500">{expense.category_label ?? expense.category}</p>
                      </div>
                    )
                  },
                  {
                    header: 'Amount',
                    cell: (expense) => formatCurrency(expense.amount ?? 0)
                  },
                  {
                    header: 'Payment',
                    cell: (expense) => expense.payment_method_label ?? expense.payment_method ?? '-'
                  },
                  {
                    header: 'Date',
                    cell: (expense) => formatDateTime(expense.expense_date)
                  },
                  {
                    header: 'Status',
                    cell: (expense) => <StatusBadge value={expense.status} />
                  },
                  {
                    header: 'Actions',
                    cell: (expense) => (
                      <div className="flex flex-wrap items-center gap-2">
                        {expense.is_editable ? (
                          <button type="button" className="btn btn-secondary btn-sm btn-square" title="Edit" onClick={() => crudTabs.openEditTab(expense)}>
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {expense.is_approvable ? (
                          <button
                            type="button"
                            className="btn btn-info btn-sm btn-square"
                            onClick={() => approveMutation.mutate(expense.id)}
                            disabled={approveMutation.isPending}
                            aria-label="Approve expense"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : null}
                        {expense.can_mark_as_paid ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm btn-square"
                            onClick={() => payMutation.mutate(expense.id)}
                            disabled={payMutation.isPending}
                            aria-label="Mark expense as paid"
                            title="Mark paid"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        ) : null}
                        {expense.is_editable ? (
                          <button
                            type="button"
                            className="btn btn-error btn-sm btn-square"
                            title="Delete"
                            onClick={() => {
                              if (window.confirm(`Delete expense "${expense.expense_number}"?`)) {
                                deleteMutation.mutate(expense.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
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
