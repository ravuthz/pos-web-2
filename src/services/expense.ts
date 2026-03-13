import { api } from '@/lib/api';
import type { Expense, ExpenseListQuery } from '@/types/api';

export const expenseService = {
  async getAll(params?: ExpenseListQuery) {
    const response = await api.get<{ data: Expense[]; meta?: any }>('/expenses', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Expense }>(`/expenses/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Expense>) {
    const response = await api.post<{ data: Expense }>('/expenses', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Expense>) {
    const response = await api.put<{ data: Expense }>(`/expenses/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/expenses/${id}`);
  },

  async approve(id: number) {
    const response = await api.post<{ data: Expense }>(`/expenses/${id}/approve`);
    return response.data.data;
  },

  async reject(id: number, data: { reason: string }) {
    const response = await api.post<{ data: Expense }>(`/expenses/${id}/reject`, data);
    return response.data.data;
  },

  async markAsPaid(id: number, data: { paid_at?: string }) {
    const response = await api.post<{ data: Expense }>(`/expenses/${id}/mark-as-paid`, data);
    return response.data.data;
  },

  async getSummary(params?: { branch_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get<{ data: any }>('/expenses-summary', { params });
    return response.data.data;
  }
};