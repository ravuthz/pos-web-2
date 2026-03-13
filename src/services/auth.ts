import { api } from '@/lib/api';
import type { ApiResponse, LoginPayload, LoginResponse, User } from '@/types/api';

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/login', payload);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
  },

  async getUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/user');
    return response.data.data;
  }
};
