import { api } from '@/lib/api';
import type { ApiResponse, Branch, ListQuery } from '@/types/api';

export const branchService = {
  async getAll(params?: ListQuery): Promise<ApiResponse<Branch[]>> {
    const response = await api.get<ApiResponse<Branch[]>>('/branches', { params });
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Branch>> {
    const response = await api.get<ApiResponse<Branch>>(`/branches/${id}`);
    return response.data;
  },

  async create(data: Partial<Branch>): Promise<ApiResponse<Branch>> {
    const response = await api.post<ApiResponse<Branch>>('/branches', data);
    return response.data;
  },

  async update(id: number, data: Partial<Branch>): Promise<ApiResponse<Branch>> {
    const response = await api.put<ApiResponse<Branch>>(`/branches/${id}`, data);
    return response.data;
  }
};