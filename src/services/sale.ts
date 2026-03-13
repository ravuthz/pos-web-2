import { api } from '@/lib/api';
import type { Sale, SaleListQuery, StoreSalePayload } from '@/types/api';

export const saleService = {
  async getAll(params?: SaleListQuery) {
    const response = await api.get<{ data: Sale[]; meta?: any }>('/sales', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Sale }>(`/sales/${id}`);
    return response.data.data;
  },

  async searchProducts(branchId: number, search: string) {
    const response = await api.post<{ data: any[] }>('/pos/search-products', {
      branch_id: branchId,
      branchId,
      query: search
    });
    return response.data.data;
  },

  async searchByBarcode(barcode: string, branchId: number) {
    const response = await api.post<{ data: any }>('/products/barcode', {
      barcode,
      branch_id: branchId
    });
    return response.data.data;
  },

  async create(data: StoreSalePayload) {
    const response = await api.post<{ data: Sale; message: string }>('/sales', data);
    return response.data;
  },

  async update(id: number, data: Partial<Sale>) {
    const response = await api.put<{ data: Sale }>(`/sales/${id}`, data);
    return response.data.data;
  },

  async refund(id: number, data: { reason: string; items: { product_id: number; quantity: number }[] }) {
    const response = await api.post<{ data: Sale }>(`/sales/${id}/refund`, data);
    return response.data.data;
  },

  async void(id: number, data: { reason: string }) {
    const response = await api.post<{ data: Sale }>(`/sales/${id}/void`, data);
    return response.data.data;
  },

  async getSummary(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: any }>('/sales-summary', { params });
    return response.data.data;
  }
};
