import { api } from '@/lib/api';
import type { Promotion, ListQuery } from '@/types/api';

export const promotionService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: Promotion[]; meta?: any }>('/promotions', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Promotion }>(`/promotions/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Promotion>) {
    const response = await api.post<{ data: Promotion }>('/promotions', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Promotion>) {
    const response = await api.put<{ data: Promotion }>(`/promotions/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/promotions/${id}`);
  },

  async calculate(data: {
    products: { product_id: number; quantity: number; unit_price: number }[];
    subtotal: number;
  }) {
    const response = await api.post<{ data: any }>('/promotions/calculate', data);
    return response.data.data;
  }
};