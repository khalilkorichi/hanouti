import api from './api';

export interface Category {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface CategoryCreate {
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface CategoryUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
}

export const categoryService = {
    getAll: async () => {
        const response = await api.get<Category[]>('/categories/');
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
    }
};
