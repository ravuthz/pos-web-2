import { api } from '@/lib/api';
import type { DashboardData, SalesTrend, TopProduct } from '@/types/api';

export const dashboardService = {
  async getData(branchId?: number) {
    const response = await api.get<{ data: DashboardData }>('/dashboard', { params: { branch_id: branchId } });
    return response.data.data;
  },

  async getSalesTrends(branchId?: number, startDate?: string, endDate?: string) {
    const response = await api.get<{ data: SalesTrend[] }>('/dashboard/sales-trends', {
      params: { branch_id: branchId, start_date: startDate, end_date: endDate }
    });
    return response.data.data;
  },

  async getHotHourTrends(branchId?: number, date?: string) {
    const response = await api.get<{ data: any[] }>('/dashboard/hot-hour-trends', {
      params: { branch_id: branchId, date }
    });
    return response.data.data;
  },

  async getTopProducts(branchId?: number, limit?: number) {
    const response = await api.get<{ data: TopProduct[] }>('/dashboard/top-products', {
      params: { branch_id: branchId, limit }
    });
    return response.data.data;
  },

  async getBranchComparison(startDate?: string, endDate?: string) {
    const response = await api.get<{ data: any[] }>('/dashboard/branch-comparison', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data.data;
  }
};