import { api } from '@/lib/api';
import type { StockMovement, ListQuery } from '@/types/api';

export const stockService = {
  async getAll(params?: ListQuery) {
    const response = await api.get<{ data: StockMovement[]; meta?: any }>('/stock-movements', { params });
    return response.data;
  },

  async getProductHistory(productId: number) {
    const response = await api.get<{ data: StockMovement[] }>(`/stock-movements/product/${productId}`);
    return response.data.data;
  },

  async adjustStock(data: {
    product_id: number;
    branch_id: number;
    quantity: number;
    movement_type: 'adjustment' | 'sale' | 'return' | 'transfer' | 'purchase';
    notes?: string;
  }) {
    const response = await api.post<{ data: StockMovement }>('/stock-movements/adjust', data);
    return response.data.data;
  }
};