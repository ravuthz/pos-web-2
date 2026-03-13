import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { expenseService } from '@/services/expense';
import { useBranchStore } from '@/store/branch';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Expense } from '@/types/api';

export function ExpensesPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const expensesQuery = useQuery({
    queryKey: ['expenses', selectedBranchId],
    queryFn: () => expenseService.getAll({ branch_id: selectedBranchId ?? undefined, per_page: 50 })
  });

  const summaryQuery = useQuery({
    queryKey: ['expenses-summary', selectedBranchId],
    queryFn: () => expenseService.getSummary({ branch_id: selectedBranchId ?? undefined })
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
  const summary = (summaryQuery.data ?? {}) as {
    today?: { total?: number; count?: number };
    this_month?: { total?: number; count?: number };
    pending?: { total?: number; count?: number };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Review paid, pending, and branch-level expense activity."
      />

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

      <div className="card overflow-hidden">
        <DataTable
          data={expenses}
          keyExtractor={(expense) => expense.id}
          emptyMessage="No expenses found."
          columns={[
            {
              header: 'Expense',
              cell: (expense) => (
                <div>
                  <p className="font-medium text-surface-900">{expense.expense_number}</p>
                  <p className="text-xs text-surface-500">{expense.category}</p>
                </div>
              )
            },
            {
              header: 'Vendor',
              cell: (expense) => expense.vendor?.name ?? '-'
            },
            {
              header: 'Amount',
              cell: (expense) => formatCurrency(expense.amount ?? 0)
            },
            {
              header: 'Date',
              cell: (expense) => formatDateTime(expense.expense_date)
            },
            {
              header: 'Status',
              cell: (expense) => <StatusBadge value={expense.status} />
            }
          ]}
        />
      </div>
    </div>
  );
}
