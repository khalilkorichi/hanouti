import api from './api';
import type { Sale } from './salesService';

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string | null;
    total_due: number;
    total_purchases: number;
    sales_count: number;
}

export interface CustomerCreate {
    name: string;
    phone?: string | null;
    notes?: string | null;
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}

export interface CustomerPayment {
    id: number;
    customer_id: number;
    amount: number;
    method: string;
    notes: string | null;
    created_at: string;
}

export interface CustomerPaymentCreate {
    amount: number;
    method?: string;
    notes?: string | null;
}

export interface CustomersDebtSummary {
    total_debt: number;
    customers_with_debt: number;
}

export const customerService = {
    list: async (params: { q?: string; only_with_debt?: boolean } = {}) => {
        const { data } = await api.get<Customer[]>('/customers/', { params });
        return data;
    },
    get: async (id: number) => {
        const { data } = await api.get<Customer>(`/customers/${id}`);
        return data;
    },
    create: async (payload: CustomerCreate) => {
        const { data } = await api.post<Customer>('/customers/', payload);
        return data;
    },
    update: async (id: number, payload: CustomerUpdate) => {
        const { data } = await api.put<Customer>(`/customers/${id}`, payload);
        return data;
    },
    remove: async (id: number) => {
        await api.delete(`/customers/${id}`);
    },
    sales: async (id: number) => {
        const { data } = await api.get<Sale[]>(`/customers/${id}/sales`);
        return data;
    },
    payments: async (id: number) => {
        const { data } = await api.get<CustomerPayment[]>(`/customers/${id}/payments`);
        return data;
    },
    recordPayment: async (id: number, payload: CustomerPaymentCreate) => {
        const { data } = await api.post<CustomerPayment>(`/customers/${id}/payments`, payload);
        return data;
    },
    debtSummary: async () => {
        const { data } = await api.get<CustomersDebtSummary>('/customers/debt-summary');
        return data;
    },
};
