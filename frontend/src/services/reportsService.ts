import axios from 'axios';

const API_URL = 'http://localhost:8000/reports';

export interface KPIResponse {
    total_sales: number;
    total_orders: number;
    avg_order_value: number;
    net_profit: number;
    low_stock_count: number;
    out_of_stock_count: number;
}

export interface SalesOverTimeData {
    date: string;
    total: number;
    count: number;
}

export interface TopProductData {
    id: number;
    name: string;
    total_qty: number;
    total_revenue: number;
}

export interface StockStatusData {
    ok: number;
    low: number;
    out: number;
}

export interface ProfitMarginData {
    revenue: number;
    cost: number;
    profit: number;
    margin_percentage: number;
}

export const reportsService = {
    getKPIs: async (period: string = 'last_30') => {
        const response = await axios.get<KPIResponse>(`${API_URL}/kpis`, { params: { period } });
        return response.data;
    },

    getSalesOverTime: async (period: string = 'last_30') => {
        const response = await axios.get<SalesOverTimeData[]>(`${API_URL}/sales-over-time`, { params: { period } });
        return response.data;
    },

    getTopProducts: async (period: string = 'last_30', limit: number = 10) => {
        const response = await axios.get<TopProductData[]>(`${API_URL}/top-products`, { params: { period, limit } });
        return response.data;
    },

    getStockStatus: async () => {
        const response = await axios.get<StockStatusData>(`${API_URL}/stock-status`);
        return response.data;
    },

    getProfitMargin: async (period: string = 'last_30') => {
        const response = await axios.get<ProfitMarginData>(`${API_URL}/profit-margin`, { params: { period } });
        return response.data;
    }
};
