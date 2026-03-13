import { api } from '@/lib/api';
import type { Branch, ListQuery } from '@/types/api';

export const branchService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: Branch[] }>('/branches', { params });
    return response.data.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Branch }>(`/branches/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Branch>) {
    const response = await api.post<{ data: Branch }>('/branches', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Branch>) {
    const response = await api.put<{ data: Branch }>(`/branches/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/branches/${id}`);
  }
};