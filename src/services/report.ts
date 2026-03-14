import { api } from '@/lib/api';
import type { ProfitLoss } from '@/types/api';

interface ReportDateParams {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
}

function normalizeDateParams<T extends ReportDateParams & Record<string, unknown>>(params?: T) {
  if (!params) {
    return undefined;
  }

  const { start_date, end_date, date_from, date_to, ...rest } = params;

  return {
    ...rest,
    date_from: date_from ?? start_date,
    date_to: date_to ?? end_date
  };
}

export const reportService = {
  async getProfitLoss(params?: { branch_id?: number; start_date?: string; end_date?: string; type?: string }) {
    const response = await api.get<{ data: Record<string, number> }>('/reports/pnl', {
      params: {
        type: params?.type ?? 'monthly',
        ...normalizeDateParams(params)
      }
    });
    const data = response.data.data;

    return {
      total_sales: Number(data.total_sales ?? data.revenue ?? 0),
      total_cost: Number(data.total_cost ?? data.cogs ?? 0),
      gross_profit: Number(data.gross_profit ?? 0),
      total_expenses: Number(data.total_expenses ?? data.expenses ?? 0),
      net_profit: Number(data.net_profit ?? 0)
    } satisfies ProfitLoss;
  },

  async getTopSellingProducts(params?: { branch_id?: number; start_date?: string; end_date?: string; limit?: number }) {
    const response = await api.get<{ data: any[] }>('/reports/top-selling-products', {
      params: normalizeDateParams(params)
    });
    return response.data.data.map((item) => ({
      ...item,
      total_amount: Number(item.total_amount ?? item.total_revenue ?? item.total ?? 0)
    }));
  },

  async getTopSellingByCategory(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: any[] }>('/reports/top-selling-by-category', {
      params: normalizeDateParams(params)
    });
    return response.data.data.map((item) => {
      const products = Array.isArray(item.products) ? item.products : [];
      const totalQuantity = Number(
        item.total_quantity ??
          products.reduce((sum: number, product: any) => sum + Number(product.total_quantity ?? product.quantity ?? 0), 0)
      );
      const totalAmount = Number(
        item.total_amount ??
          item.total_revenue ??
          products.reduce((sum: number, product: any) => sum + Number(product.total_amount ?? product.total_revenue ?? 0), 0)
      );

      return {
        ...item,
        total_quantity: totalQuantity,
        total_amount: totalAmount
      };
    });
  },

  async getProductSales(params?: { branch_id?: number; start_date?: string; end_date?: string; product_id?: number }) {
    const response = await api.get<{ data: any[] }>('/reports/product-sales', {
      params: normalizeDateParams(params)
    });
    return response.data.data;
  },

  async exportSales(data: { start_date?: string; end_date?: string; branch_id?: number }) {
    const response = await api.post('/reports/export/sales', data, { responseType: 'blob' });
    return response.data;
  },

  async exportShifts(data: { start_date?: string; end_date?: string; branch_id?: number }) {
    const response = await api.post('/reports/export/shifts', data, { responseType: 'blob' });
    return response.data;
  },

  async exportProducts(data: { category_id?: number }) {
    const response = await api.post('/reports/export/products', data, { responseType: 'blob' });
    return response.data;
  },

  async exportStock(data: { branch_id?: number; low_stock?: boolean }) {
    const response = await api.post('/reports/export/stock', data, { responseType: 'blob' });
    return response.data;
  }
};
