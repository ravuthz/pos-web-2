import { api } from '@/lib/api';
import type { Product, ProductListQuery, ProductUnit } from '@/types/api';

export const productService = {
  async getAll(params?: ProductListQuery) {
    const response = await api.get<{ data: Product[]; meta?: any }>('/products', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Product }>(`/products/${id}`);
    return response.data.data;
  },

  async getLowStock() {
    const response = await api.get<{ data: Product[] }>('/products/low-stock');
    return response.data.data;
  },

  async searchByBarcode(barcode: string, branchId: number) {
    const response = await api.post<{ data: Product }>('/products/barcode', { barcode, branch_id: branchId });
    return response.data.data;
  },

  async create(data: Partial<Product>) {
    const response = await api.post<{ data: Product }>('/products', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Product>) {
    const response = await api.put<{ data: Product }>(`/products/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/products/${id}`);
  },

  // Product Units
  async getUnits(productId: number) {
    const response = await api.get<{ data: ProductUnit[] }>(`/products/${productId}/units`);
    return response.data.data;
  },

  async getSellableUnits(productId: number) {
    const response = await api.get<{ data: ProductUnit[] }>(`/products/${productId}/units/sellable`);
    return response.data.data;
  },

  async getPurchasableUnits(productId: number) {
    const response = await api.get<{ data: ProductUnit[] }>(`/products/${productId}/units/purchasable`);
    return response.data.data;
  },

  async createUnit(productId: number, data: Partial<ProductUnit>) {
    const response = await api.post<{ data: ProductUnit }>(`/products/${productId}/units`, data);
    return response.data.data;
  },

  async updateUnit(productId: number, unitId: number, data: Partial<ProductUnit>) {
    const response = await api.put<{ data: ProductUnit }>(`/products/${productId}/units/${unitId}`, data);
    return response.data.data;
  },

  async deleteUnit(productId: number, unitId: number) {
    await api.delete(`/products/${productId}/units/${unitId}`);
  }
};
