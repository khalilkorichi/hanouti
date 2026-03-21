import api from './api';
import type { Product } from './productService';

export interface SaleItem {
    id?: number;
    product_id: number;
    qty: number;
    unit_price: number;
    tax_rate: number;
    line_total?: number;
    product?: Product;
}

export interface SaleCreate {
    items: {
        product_id: number;
        qty: number;
        unit_price: number;
        tax_rate: number;
    }[];
    payment_method: string;
    discount_value: number;
    discount_type: 'fixed' | 'percentage';
    tax_value: number;
}

export interface Sale {
    id: number;
    invoice_no: string;
    status: string;
    payment_method: string;
    subtotal: number;
    total: number;
    paid_amount: number;
    due_amount: number;
    tax_value: number;
    discount_value: number;
    discount_type: string;
    created_at: string;
    items: SaleItem[];
}

export interface SalesKPIs {
    total_sales: number;
    total_orders: number;
    avg_order_value: number;
    completed_sales: number;
    cancelled_sales: number;
    cash_sales: number;
    card_sales: number;
}

export interface SalesFilters {
    query?: string;
    status?: string;
    payment_method?: string;
    from_date?: string;
    to_date?: string;
    skip?: number;
    limit?: number;
}

export const salesService = {
    create: async (data: SaleCreate) => {
        const response = await api.post<Sale>('/sales/', data);
        return response.data;
    },
    complete: async (id: number) => {
        const response = await api.post<Sale>(`/sales/${id}/complete`);
        return response.data;
    },
    cancel: async (id: number, reason: string) => {
        const response = await api.post<Sale>(`/sales/${id}/cancel`, { reason });
        return response.data;
    },
    getOne: async (id: number) => {
        const response = await api.get<Sale>(`/sales/${id}`);
        return response.data;
    },
    getAll: async (filters: SalesFilters = {}) => {
        const response = await api.get<Sale[]>('/sales/', { params: filters });
        return response.data;
    },
    getKPIs: async (filters: { from_date?: string; to_date?: string } = {}) => {
        const response = await api.get<SalesKPIs>('/sales/kpis/summary', { params: filters });
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/sales/${id}`);
    }
};

