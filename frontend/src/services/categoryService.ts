import api from './api';

export interface Category {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    color?: string;
    icon?: string;
    display_order: number;
    created_at: string;
    product_count?: number;
}

export interface CategoryCreate {
    name: string;
    description?: string;
    is_active?: boolean;
    color?: string;
    icon?: string;
    display_order?: number;
}

export interface CategoryUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
    color?: string;
    icon?: string;
    display_order?: number;
}

export interface CategoryListParams {
    skip?: number;
    limit?: number;
    q?: string;
    is_active?: boolean;
    sort?: 'display_order' | 'name' | 'name_desc' | 'created_at' | 'product_count';
}

export interface CategoryReorderItem {
    id: number;
    display_order: number;
}

export interface CategoryBulkActionResult {
    success_count: number;
    failed_count: number;
    errors: Array<{ id?: number; name?: string; error: string }>;
}

export const categoryService = {
    getAll: async (params?: CategoryListParams) => {
        const response = await api.get<Category[]>('/categories/', { params });
        return response.data;
    },
    getOne: async (id: number) => {
        const response = await api.get<Category>(`/categories/${id}`);
        return response.data;
    },
    create: async (data: CategoryCreate) => {
        const response = await api.post<Category>('/categories/', data);
        return response.data;
    },
    update: async (id: number, data: CategoryUpdate) => {
        const response = await api.put<Category>(`/categories/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/categories/${id}`);
    },
    reorder: async (items: CategoryReorderItem[]) => {
        const response = await api.put<{ updated: number }>('/categories/reorder', { items });
        return response.data;
    },
    bulkAction: async (ids: number[], action: 'activate' | 'deactivate' | 'delete') => {
        const response = await api.post<CategoryBulkActionResult>(
            '/categories/bulk-action',
            { ids, action }
        );
        return response.data;
    },
};
