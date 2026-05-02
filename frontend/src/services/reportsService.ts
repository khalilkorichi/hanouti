import api from './api';

const PATH = '/reports';

export interface KPIResponse {
    total_sales: number;
    total_orders: number;
    avg_order_value: number;
    net_profit: number;
    low_stock_count: number;
    out_of_stock_count: number;
    previous?: {
        total_sales: number;
        total_orders: number;
        avg_order_value: number;
        net_profit: number;
    };
    growth?: {
        total_sales: number;
        total_orders: number;
        avg_order_value: number;
        net_profit: number;
    };
}

export interface SalesOverTimeData { date: string; total: number; count: number; }
export interface TopProductData { id: number; name: string; total_qty: number; total_revenue: number; }
export interface StockStatusData { ok: number; low: number; out: number; }
export interface ProfitMarginData { revenue: number; cost: number; profit: number; margin_percentage: number; }
export interface CategorySalesData { id: number; name: string; revenue: number; qty: number; items: number; }
export interface PaymentMethodData { method: string; count: number; total: number; }
export interface WeekdaySalesData { weekday: number; name: string; count: number; total: number; }
export interface HourSalesData { hour: number; label: string; count: number; total: number; }
export interface InventoryValueData {
    cost_value: number; retail_value: number; potential_profit: number;
    total_units: number; total_skus: number;
}

export const reportsService = {
    getKPIs: async (period: string = 'last_30') =>
        (await api.get<KPIResponse>(`${PATH}/kpis`, { params: { period } })).data,
    getSalesOverTime: async (period: string = 'last_30') =>
        (await api.get<SalesOverTimeData[]>(`${PATH}/sales-over-time`, { params: { period } })).data,
    getTopProducts: async (period: string = 'last_30', limit: number = 10) =>
        (await api.get<TopProductData[]>(`${PATH}/top-products`, { params: { period, limit } })).data,
    getStockStatus: async () =>
        (await api.get<StockStatusData>(`${PATH}/stock-status`)).data,
    getProfitMargin: async (period: string = 'last_30') =>
        (await api.get<ProfitMarginData>(`${PATH}/profit-margin`, { params: { period } })).data,
    getSalesByCategory: async (period: string = 'last_30') =>
        (await api.get<CategorySalesData[]>(`${PATH}/sales-by-category`, { params: { period } })).data,
    getPaymentMethods: async (period: string = 'last_30') =>
        (await api.get<PaymentMethodData[]>(`${PATH}/payment-methods`, { params: { period } })).data,
    getSalesByWeekday: async (period: string = 'last_30') =>
        (await api.get<WeekdaySalesData[]>(`${PATH}/sales-by-weekday`, { params: { period } })).data,
    getSalesByHour: async (period: string = 'last_30') =>
        (await api.get<HourSalesData[]>(`${PATH}/sales-by-hour`, { params: { period } })).data,
    getInventoryValue: async () =>
        (await api.get<InventoryValueData>(`${PATH}/inventory-value`)).data,
};
