import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../services/productService';
import { qtyMin, roundQty } from '../utils/units';

export interface CartItem extends Product {
    qty: number;
}

interface CartState {
    items: CartItem[];
    addItem: (product: Product) => { success: boolean; message?: string };
    addWeighedItem: (product: Product, qtyKg: number) => { success: boolean; message?: string };
    removeItem: (productId: number) => void;
    updateQty: (productId: number, qty: number) => { success: boolean; message?: string };
    updateItemPrice: (productId: number, price: number) => void;
    clearCart: () => void;

    discountValue: number;
    discountType: 'fixed' | 'percentage';
    setDiscount: (value: number, type: 'fixed' | 'percentage') => void;

    taxRate: number; // Global tax rate for simplicity, or per item

    getTotal: () => number;
    getSubtotal: () => number;
    getTax: () => number;
    getDiscount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            discountValue: 0,
            discountType: 'fixed',
            taxRate: 0, // Default 0 tax

            addItem: (product) => {
                const state = get();
                const existing = state.items.find(i => i.id === product.id);
                if (existing) {
                    // Check if we can add more based on stock
                    const newQty = existing.qty + 1;
                    if (newQty > product.stock_qty) {
                        return { success: false, message: `لا يمكن إضافة المزيد. المخزون المتاح: ${product.stock_qty}` };
                    }
                    set({
                        items: state.items.map(i =>
                            i.id === product.id
                                ? { ...i, qty: newQty }
                                : i
                        )
                    });
                    return { success: true };
                }
                // Check stock for new item
                if (product.stock_qty < 1) {
                    return { success: false, message: 'المنتج غير متوفر في المخزون' };
                }
                set({ items: [...state.items, { ...product, qty: 1 }] });
                return { success: true };
            },

            addWeighedItem: (product, qtyKg) => {
                const state = get();
                const existing = state.items.find(i => i.id === product.id);
                const targetQty = Math.round(((existing?.qty ?? 0) + qtyKg) * 1000) / 1000;
                if (targetQty > product.stock_qty) {
                    return { success: false, message: `الكمية المطلوبة أكبر من المخزون (${product.stock_qty} ${product.unit})` };
                }
                if (existing) {
                    set({
                        items: state.items.map(i =>
                            i.id === product.id ? { ...i, qty: targetQty } : i
                        )
                    });
                } else {
                    set({ items: [...state.items, { ...product, qty: targetQty }] });
                }
                return { success: true };
            },

            removeItem: (productId) => set((state) => ({
                items: state.items.filter(i => i.id !== productId)
            })),

            updateQty: (productId, qty) => {
                const state = get();
                const item = state.items.find(i => i.id === productId);
                if (!item) return { success: false, message: 'المنتج غير موجود' };

                const min = qtyMin(item.unit);
                const validatedQty = roundQty(
                    Math.max(min, Math.min(qty, item.stock_qty)),
                    item.unit,
                );

                if (qty > item.stock_qty) {
                    set({
                        items: state.items.map(i =>
                            i.id === productId
                                ? { ...i, qty: validatedQty }
                                : i
                        )
                    });
                    return { success: false, message: `الكمية المطلوبة أكبر من المخزون المتاح (${item.stock_qty})` };
                }

                set({
                    items: state.items.map(i =>
                        i.id === productId
                            ? { ...i, qty: validatedQty }
                            : i
                    )
                });
                return { success: true };
            },

            updateItemPrice: (productId: number, price: number) => set((state) => ({
                items: state.items.map(i =>
                    i.id === productId
                        ? { ...i, sale_price: price }
                        : i
                )
            })),

            clearCart: () => set({ items: [], discountValue: 0, discountType: 'fixed' }),

            setDiscount: (value, type) => set({ discountValue: value, discountType: type }),

            getSubtotal: () => {
                const { items } = get();
                return items.reduce((sum, item) => sum + (item.sale_price * item.qty), 0);
            },

            getTax: () => {
                // Simplified tax calculation on subtotal
                // In real world, tax might be per item
                return 0;
            },

            getDiscount: () => {
                const { discountValue, discountType } = get();
                const subtotal = get().getSubtotal();
                if (discountType === 'percentage') {
                    return subtotal * (discountValue / 100);
                }
                return discountValue;
            },

            getTotal: () => {
                const subtotal = get().getSubtotal();
                const discount = get().getDiscount();
                const tax = get().getTax();
                return Math.max(0, subtotal + tax - discount);
            }
        }),
        {
            name: 'hanouti-cart-storage',
        }
    )
);
