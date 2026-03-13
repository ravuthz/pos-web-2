import { api } from '@/lib/api';
import type { ProfitLoss } from '@/types/api';

export const reportService = {
  async getProfitLoss(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: ProfitLoss }>('/reports/pnl', { params });
    return response.data.data;
  },

  async getTopSellingProducts(params?: { branch_id?: number; start_date?: string; end_date?: string; limit?: number }) {
    const response = await api.get<{ data: any[] }>('/reports/top-selling-products', { params });
    return response.data.data;
  },

  async getTopSellingByCategory(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: any[] }>('/reports/top-selling-by-category', { params });
    return response.data.data;
  },

  async getProductSales(params?: { branch_id?: number; start_date?: string; end_date?: string; product_id?: number }) {
    const response = await api.get<{ data: any[] }>('/reports/product-sales', { params });
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