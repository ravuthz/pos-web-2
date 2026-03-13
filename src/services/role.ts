import { api } from '@/lib/api';
import type { Role } from '@/types/api';

export const roleService = {
  async getAll() {
    const response = await api.get<{ data: Role[] }>('/roles');
    return response.data.data;
  }
};
