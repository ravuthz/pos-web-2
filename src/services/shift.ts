import { api } from '@/lib/api';
import type { Shift } from '@/types/api';

export const shiftService = {
  async getAll(params?: { branch_id?: number; status?: string }) {
    const response = await api.get<{ data: Shift[]; meta?: any }>('/shifts', { params });
    return response.data;
  },

  async getCurrent(branchId?: number) {
    const response = await api.get<{ data: Shift | null }>('/shifts/current', { params: { branch_id: branchId } });
    return response.data.data;
  },

  async getSummary(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: any }>('/shifts/summary', { params });
    return response.data.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Shift }>(`/shifts/${id}`);
    return response.data.data;
  },

  async open(data: {
    branch_id: number;
    opening_cash_float: number;
    opening_cash_float_khr?: number;
    opening_notes?: string;
  }) {
    const response = await api.post<{ data: Shift }>('/shifts/open', data);
    return response.data.data;
  },

  async close(id: number, data: {
    actual_cash?: number;
    actual_cash_khr?: number;
    closing_notes?: string;
  }) {
    const response = await api.post<{ data: Shift }>(`/shifts/${id}/close`, data);
    return response.data.data;
  }
};
