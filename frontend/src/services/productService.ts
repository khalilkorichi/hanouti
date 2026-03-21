import api from './api';
import type { Category } from './categoryService';

export interface Product {
    id: number;
    name: string;
    sku?: string;
    barcode?: string;
    category_id?: number;
    category?: Category;
    purchase_price: number;
    sale_price: number;
    stock_qty: number;
    min_qty: number;
    unit: string;
    image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ProductCreate {
    name: string;
    sku?: string;
    barcode?: string;
    category_id?: number;
    purchase_price?: number;
    sale_price?: number;
    stock_qty?: number;
    min_qty?: number;
    unit?: string;
    image_url?: string;
    is_active?: boolean;
}

export interface ProductUpdate {
    name?: string;
    sku?: string;
    barcode?: string;
    category_id?: number;
    purchase_price?: number;
    sale_price?: number;
    stock_qty?: number;
    min_qty?: number;
    unit?: string;
    image_url?: string;
    is_active?: boolean;
}

export const productService = {
    getAll: async (params?: { skip?: number; limit?: number; query?: string; category_id?: number; sort?: string }) => {
        const response = await api.get<Product[]>('/products/', { params });
        return response.data;
    },
    getCount: async (params?: { query?: string; category_id?: number }) => {
        const response = await api.get<{ count: number }>('/products/count', { params });
        return response.data.count;
    },
    getOne: async (id: number) => {
        const response = await api.get<Product>(`/products/${id}`);
        return response.data;
    },
    create: async (data: ProductCreate) => {
        const response = await api.post<Product>('/products/', data);
        return response.data;
    },
    update: async (id: number, data: ProductUpdate) => {
        const response = await api.put<Product>(`/products/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/products/${id}`);
    },
    createBulk: async (data: ProductCreate[]) => {
        const response = await api.post<{ created_count: number; errors: { name: string; error: string }[] }>('/products/bulk', data);
        return response.data;
    }
};
