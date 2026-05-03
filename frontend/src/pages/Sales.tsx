import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useRef, useState } from 'react';
import ProductExplorer, { type ProductExplorerHandle } from '../components/Sales/ProductExplorer';
import CartPanel, { type CartPanelHandle } from '../components/Sales/CartPanel';
import { BarcodeQuickAdd, type BarcodeQuickAddHandle } from '../components/Sales/BarcodeQuickAdd';
import { ShortcutsHelpDialog } from '../components/Sales/ShortcutsHelpDialog';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../services/productService';
import { useNotification } from '../contexts/NotificationContext';
import { useKeyboardShortcuts, type Shortcut } from '../hooks/useKeyboardShortcuts';

const DragItemOverlay = ({ product }: { product: Product | null }) => {
    if (!product) return null;
    return (
        <Card sx={{ width: 200, opacity: 0.85, boxShadow: 10, cursor: 'grabbing' }}>
            <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">{product.name}</Typography>
                <Typography variant="body2">{product.sale_price} دج</Typography>
            </CardContent>
        </Card>
    );
};

export default function Sales() {
    const addItem = useCartStore(state => state.addItem);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const { showNotification } = useNotification();

    const explorerRef = useRef<ProductExplorerHandle>(null);
    const cartRef = useRef<CartPanelHandle>(null);
    const barcodeRef = useRef<BarcodeQuickAddHandle>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveProduct(event.active.data.current as Product);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;
        if (over && over.id === 'cart-droppable') {
            const product = active.data.current as Product;
            const result = addItem(product);
            if (result.success) {
                showNotification(`تم إضافة "${product.name}" إلى السلة`, 'success');
            } else {
                showNotification(result.message || 'حدث خطأ', 'error');
            }
        }
        setActiveProduct(null);
    };

    /**
     * +/- shortcuts adjust the LAST cart item by reading the current store state
     * inside the handler (so we always act on the latest snapshot rather than a
     * stale closure capture). updateQty enforces stock bounds itself.
     */
    const adjustLastItemQty = (delta: number) => {
        const state = useCartStore.getState();
        const last = state.items[state.items.length - 1];
        if (!last) {
            showNotification('السلة فارغة', 'info');
            return;
        }
        const result = state.updateQty(last.id, last.qty + delta);
        if (!result.success && result.message) {
            showNotification(result.message, 'warning');
        }
    };

    const shortcuts = useMemo<Shortcut[]>(() => [
        { key: 'F1', label: 'مساعدة', handler: () => setShowHelp(true), allowInInputs: true },
        { key: 'F2', label: 'باركود', handler: () => barcodeRef.current?.focus(), allowInInputs: true },
        { key: 'F3', label: 'بحث', handler: () => explorerRef.current?.focusSearch(), allowInInputs: true },
        { key: 'F4', label: 'خصم', handler: () => cartRef.current?.focusDiscount(), allowInInputs: true },
        { key: 'F8', label: 'تبديل دفع', handler: () => cartRef.current?.togglePayment(), allowInInputs: true },
        { key: 'F9', label: 'إتمام البيع', handler: () => cartRef.current?.triggerCheckout(), allowInInputs: true },
        { key: 'F10', label: 'تفريغ السلة', handler: () => cartRef.current?.clearCart(), allowInInputs: true },
        { key: 'plus', label: 'كمية +', handler: () => adjustLastItemQty(1) },
        { key: 'minus', label: 'كمية -', handler: () => adjustLastItemQty(-1) },
        { key: '?', shift: true, label: 'مساعدة', handler: () => setShowHelp(true) },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    useKeyboardShortcuts(shortcuts);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box sx={{ height: 'calc(100vh - 100px)', p: 2, display: 'flex', flexDirection: 'column' }}>
                <BarcodeQuickAdd ref={barcodeRef} onShowHelp={() => setShowHelp(true)} />

                <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                    <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
                        <ProductExplorer ref={explorerRef} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
                        <CartPanel ref={cartRef} />
                    </Grid>
                </Grid>

                <DragOverlay>
                    <DragItemOverlay product={activeProduct} />
                </DragOverlay>
            </Box>

            <ShortcutsHelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
        </DndContext>
    );
}
