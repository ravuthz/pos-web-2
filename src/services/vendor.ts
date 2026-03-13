import { api } from '@/lib/api';
import type { Vendor, ListQuery } from '@/types/api';

export const vendorService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: Vendor[]; meta?: any }>('/vendors', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Vendor }>(`/vendors/${id}`);
    return response.data.data;
  },

  async search(data: { search: string }) {
    const response = await api.post<{ data: Vendor[] }>('/vendors/search', data);
    return response.data.data;
  },

  async create(data: Partial<Vendor>) {
    const response = await api.post<{ data: Vendor }>('/vendors', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Vendor>) {
    const response = await api.put<{ data: Vendor }>(`/vendors/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/vendors/${id}`);
  }
};