import { api } from '@/lib/api';
import type { User, ListQuery } from '@/types/api';

export interface UserPayload extends Partial<User> {
  password?: string;
  password_confirmation?: string;
  branch_ids?: number[];
}

export const userService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: User[]; meta?: any }>('/users', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: User }>(`/users/${id}`);
    return response.data.data;
  },

  async create(data: UserPayload & { password: string }) {
    const response = await api.post<{ data: User }>('/users', data);
    return response.data.data;
  },

  async update(id: number, data: UserPayload) {
    const response = await api.put<{ data: User }>(`/users/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/users/${id}`);
  }
};
