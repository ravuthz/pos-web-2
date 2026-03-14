import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { reportService } from '@/services/report';
import { useBranchStore } from '@/store/branch';
import { formatCurrency, formatNumber } from '@/lib/utils';

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

export function ReportsPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [range, setRange] = useState(defaultDateRange);

  const profitQuery = useQuery({
    queryKey: ['reports', 'pnl', selectedBranchId, range.startDate, range.endDate],
    queryFn: () =>
      reportService.getProfitLoss({
        branch_id: selectedBranchId ?? undefined,
        start_date: range.startDate,
        end_date: range.endDate
      })
  });

  const topProductsQuery = useQuery({
    queryKey: ['reports', 'top-products', selectedBranchId, range.startDate, range.endDate],
    queryFn: () =>
      reportService.getTopSellingProducts({
        branch_id: selectedBranchId ?? undefined,
        start_date: range.startDate,
        end_date: range.endDate,
        limit: 8
      })
  });

  const topCategoriesQuery = useQuery({
    queryKey: ['reports', 'top-categories', selectedBranchId, range.startDate, range.endDate],
    queryFn: () =>
      reportService.getTopSellingByCategory({
        branch_id: selectedBranchId ?? undefined,
        start_date: range.startDate,
        end_date: range.endDate
      })
  });

  if (profitQuery.isLoading || topProductsQuery.isLoading || topCategoriesQuery.isLoading) {
    return <LoadingState label="Loading reports..." />;
  }

  if (profitQuery.isError) {
    return <ErrorState message={profitQuery.error.message} />;
  }

  if (topProductsQuery.isError) {
    return <ErrorState message={topProductsQuery.error.message} />;
  }

  if (topCategoriesQuery.isError) {
    return <ErrorState message={topCategoriesQuery.error.message} />;
  }

  const profit = profitQuery.data ?? {
    total_sales: 0,
    total_cost: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0
  };
  const topProducts = topProductsQuery.data ?? [];
  const topCategories = topCategoriesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Profitability and top-selling analysis for the selected date range."
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
            <input
              type="date"
              className="input"
              value={range.startDate}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  startDate: event.target.value
                }))
              }
            />
            <input
              type="date"
              className="input"
              value={range.endDate}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  endDate: event.target.value
                }))
              }
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Sales" value={formatCurrency(profit.total_sales ?? 0)} />
        <StatCard label="Cost" value={formatCurrency(profit.total_cost ?? 0)} />
        <StatCard label="Gross Profit" value={formatCurrency(profit.gross_profit ?? 0)} tone="success" />
        <StatCard label="Expenses" value={formatCurrency(profit.total_expenses ?? 0)} tone="warning" />
        <StatCard label="Net Profit" value={formatCurrency(profit.net_profit ?? 0)} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Top products</h2>
              <p className="text-sm text-surface-500">Best performers by quantity and sales value.</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <EmptyState
              title="No product sales yet"
              message="Once sales are recorded in the selected date range, product rankings will appear here."
            />
          ) : (
            <div className="space-y-3">
              {topProducts.map((item: any, index) => (
                <div
                  key={`${item.product_id ?? item.product_name}-${index}`}
                  className="card border border-base-300 bg-base-100 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-surface-900">
                        {item.product_name ?? item.name ?? 'Unnamed product'}
                      </p>
                      <p className="text-sm text-surface-500">
                        {formatNumber(item.total_quantity ?? item.quantity ?? 0)} units sold
                      </p>
                    </div>
                    <p className="font-semibold text-primary-700">
                      {formatCurrency(item.total_amount ?? item.total ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">By category</h2>
              <p className="text-sm text-surface-500">Category contribution during the selected period.</p>
            </div>
          </div>

          {topCategories.length === 0 ? (
            <EmptyState
              title="No category sales yet"
              message="Category breakdown will populate after sales are recorded in the selected range."
            />
          ) : (
            <div className="space-y-3">
              {topCategories.map((item: any, index) => (
                <div
                  key={`${item.category_id ?? item.category_name}-${index}`}
                  className="card border border-base-300 bg-base-100 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-surface-900">
                        {item.category_name ?? item.name ?? 'Uncategorized'}
                      </p>
                      <p className="text-sm text-surface-500">
                        {formatNumber(item.total_quantity ?? item.quantity ?? 0)} items
                      </p>
                    </div>
                    <p className="font-semibold text-primary-700">
                      {formatCurrency(item.total_amount ?? item.total ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
