import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';
import { useBranchStore } from '@/store/branch';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';

interface DashboardOverview {
  today?: {
    total_sales?: number;
    transaction_count?: number;
    total_expenses?: number;
    profit?: number;
  };
  this_month?: {
    total_sales?: number;
    total_expenses?: number;
    profit?: number;
  };
  quick_stats?: {
    low_stock_products?: number;
    total_customers?: number;
    total_products?: number;
    total_sales_count?: number;
    pending_expenses?: number;
  };
  low_stock_alerts?: Array<{
    id: number;
    name: string;
    code?: string;
    stock_quantity?: number;
    quantity_on_hand?: number;
  }>;
  recent_activities?: Array<{
    type?: string;
    title?: string;
    description?: string;
    created_at?: string;
  }>;
}

export function DashboardPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', selectedBranchId],
    queryFn: () => dashboardService.getData(selectedBranchId ?? undefined)
  });

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading dashboard..." />;
  }

  if (dashboardQuery.isError) {
    return <ErrorState message={dashboardQuery.error.message} />;
  }

  const dashboard = (dashboardQuery.data ?? {}) as DashboardOverview;
  const lowStockAlerts = dashboard.low_stock_alerts ?? [];
  const activities = dashboard.recent_activities ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Live operational snapshot across sales, stock, and expenses."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today Sales"
          value={formatCurrency(dashboard.today?.total_sales ?? 0)}
          description={`${formatNumber(dashboard.today?.transaction_count ?? 0)} transactions`}
          tone="success"
        />
        <StatCard
          label="Today Expenses"
          value={formatCurrency(dashboard.today?.total_expenses ?? 0)}
          description="Paid expenses recorded today"
          tone="warning"
        />
        <StatCard
          label="Today Profit"
          value={formatCurrency(dashboard.today?.profit ?? 0)}
          description="Sales minus expenses for the current day"
        />
        <StatCard
          label="Low Stock Alerts"
          value={formatNumber(dashboard.quick_stats?.low_stock_products ?? lowStockAlerts.length)}
          description="Products that need replenishment soon"
          tone={lowStockAlerts.length > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Recent activity</h2>
              <p className="text-sm text-surface-500">Latest operational events from the selected branch scope.</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <EmptyState
              title="No recent activity"
              message="New sales, stock changes, and expense activity will appear here."
            />
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((activity, index) => (
                <div
                  key={`${activity.title ?? 'activity'}-${index}`}
                  className="rounded-2xl border border-surface-200 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-surface-900">
                        {activity.title ?? activity.type ?? 'Activity'}
                      </p>
                      <p className="mt-1 text-sm text-surface-600">
                        {activity.description ?? 'Operational update'}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.14em] text-surface-400">
                      {activity.created_at ? formatDateTime(activity.created_at) : 'Just now'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Stock watch</h2>
              <p className="text-sm text-surface-500">Items at risk of running out.</p>
            </div>
          </div>

          {lowStockAlerts.length === 0 ? (
            <EmptyState
              title="Stock looks healthy"
              message="No low stock alerts are currently reported for this branch scope."
            />
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-surface-900">{product.name}</p>
                      <p className="text-sm text-surface-600">{product.code ?? 'No product code'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-surface-500">On hand</p>
                      <p className="text-lg font-semibold text-amber-700">
                        {formatNumber(product.quantity_on_hand ?? product.stock_quantity ?? 0)}
                      </p>
                    </div>
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
