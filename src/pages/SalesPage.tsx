import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saleService } from '@/services/sale';
import { useBranchStore } from '@/store/branch';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Sale } from '@/types/api';

export function SalesPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const salesQuery = useQuery({
    queryKey: ['sales', selectedBranchId, page, pageSize],
    queryFn: () =>
      saleService.getAll({
        branch_id: selectedBranchId ?? undefined,
        page,
        per_page: pageSize
      }),
    placeholderData: (previousData) => previousData
  });

  const summaryQuery = useQuery({
    queryKey: ['sales-summary', selectedBranchId],
    queryFn: () => saleService.getSummary({ branch_id: selectedBranchId ?? undefined })
  });

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  if (salesQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState label="Loading sales..." />;
  }

  if (salesQuery.isError) {
    return <ErrorState message={salesQuery.error.message} />;
  }

  if (summaryQuery.isError) {
    return <ErrorState message={summaryQuery.error.message} />;
  }

  const sales = (salesQuery.data?.data ?? []) as Sale[];
  const salesMeta = getPaginationMeta(salesQuery.data?.meta);
  const summary = (summaryQuery.data ?? {}) as {
    today?: { total?: number; count?: number; average?: number };
    this_month?: { total?: number; count?: number; average?: number };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle="Recent transactions and performance across the selected branch scope."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Today Sales"
          value={formatCurrency(summary.today?.total ?? 0)}
          description={`${formatNumber(summary.today?.count ?? 0)} completed sales`}
          tone="success"
        />
        <StatCard
          label="Today Average"
          value={formatCurrency(summary.today?.average ?? 0)}
          description="Average completed sale value today"
        />
        <StatCard
          label="Month Sales"
          value={formatCurrency(summary.this_month?.total ?? 0)}
          description={`${formatNumber(summary.this_month?.count ?? 0)} completed sales this month`}
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          data={sales}
          keyExtractor={(sale) => sale.id}
          emptyMessage="No sales found for the current branch scope."
          isUpdating={salesQuery.isFetching}
          updateLabel="Refreshing sales..."
          pagination={{
            page,
            pageSize,
            totalItems: salesMeta.totalItems,
            totalPages: salesMeta.totalPages,
            pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
            onPageChange: setPage,
            onPageSizeChange: (nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }
          }}
          columns={[
            {
              header: 'Invoice',
              cell: (sale) => (
                <div>
                  <p className="font-medium text-surface-900">{sale.invoice_number ?? sale.sale_number ?? `#${sale.id}`}</p>
                  <p className="text-xs text-surface-500">{formatDateTime(sale.sale_date)}</p>
                </div>
              )
            },
            {
              header: 'Cashier',
              cell: (sale) => sale.cashier?.name ?? sale.user?.name ?? 'Unknown'
            },
            {
              header: 'Customer',
              cell: (sale) => sale.customer?.name ?? 'Walk-in'
            },
            {
              header: 'Payment',
              cell: (sale) => <StatusBadge value={sale.payment_method} />
            },
            {
              header: 'Total',
              cell: (sale) => formatCurrency(sale.total_amount ?? sale.total ?? 0)
            },
            {
              header: 'Status',
              cell: (sale) => <StatusBadge value={sale.status} />
            }
          ]}
        />
      </div>
    </div>
  );
}
