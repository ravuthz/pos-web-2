import { api } from '@/lib/api';
import type { Category, ListQuery } from '@/types/api';

export const categoryService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: Category[]; meta?: any }>('/categories', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Category }>(`/categories/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Category>) {
    const response = await api.post<{ data: Category }>('/categories', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Category>) {
    const response = await api.put<{ data: Category }>(`/categories/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/categories/${id}`);
  }
};