import { api } from '@/lib/api';
import type { Customer, ListQuery } from '@/types/api';

export const customerService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: Customer[]; meta?: any }>('/customers', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Customer }>(`/customers/${id}`);
    return response.data.data;
  },

  async search(data: { search: string; branch_id?: number }) {
    const response = await api.post<{ data: Customer[] }>('/customers/search', data);
    return response.data.data;
  },

  async create(data: Partial<Customer>) {
    const response = await api.post<{ data: Customer }>('/customers', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Customer>) {
    const response = await api.put<{ data: Customer }>(`/customers/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/customers/${id}`);
  }
};