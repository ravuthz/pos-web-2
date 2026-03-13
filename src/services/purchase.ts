import { api } from '@/lib/api';
import type { PurchaseOrder, ListQuery } from '@/types/api';

export const purchaseService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: PurchaseOrder[]; meta?: any }>('/purchase-orders', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`);
    return response.data.data;
  },

  async create(data: Partial<PurchaseOrder>) {
    const response = await api.post<{ data: PurchaseOrder }>('/purchase-orders', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<PurchaseOrder>) {
    const response = await api.put<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, data);
    return response.data.data;
  },

  async send(id: number) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/send`);
    return response.data.data;
  },

  async receive(id: number) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/receive`);
    return response.data.data;
  },

  async cancel(id: number, data: { reason: string }) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`, data);
    return response.data.data;
  }
};