import { api } from '@/lib/api';
import type { PurchaseOrder, ListQuery } from '@/types/api';

export interface PurchaseOrderPayload {
  branch_id: number;
  vendor_id: number;
  order_date: string;
  expected_date?: string;
  notes?: string;
  products: Array<{
    product_id: number;
    quantity_ordered: number;
    unit_cost: number;
    product_unit_id?: number;
  }>;
}

export const purchaseService = {
  async getAll(params?: ListQuery & { branch_id?: number; vendor_id?: number; status?: string }) {
    const response = await api.get<{ data: PurchaseOrder[]; meta?: any }>('/purchase-orders', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`);
    return response.data.data;
  },

  async create(data: PurchaseOrderPayload) {
    const response = await api.post<{ data: PurchaseOrder }>('/purchase-orders', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<PurchaseOrderPayload>) {
    const response = await api.put<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, data);
    return response.data.data;
  },

  async send(id: number) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/send`);
    return response.data.data;
  },

  async receive(id: number, data: { products: Array<{ product_id: number; quantity_received: number }> }) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/receive`, data);
    return response.data.data;
  },

  async cancel(id: number) {
    const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`);
    return response.data.data;
  }
};
