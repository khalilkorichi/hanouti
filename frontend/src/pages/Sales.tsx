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
import { useShortcutCombo } from '../store/shortcutsStore';

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

    const help        = useShortcutCombo('pos.help');
    const barcode     = useShortcutCombo('pos.barcode');
    const search      = useShortcutCombo('pos.search');
    const discount    = useShortcutCombo('pos.discount');
    const toggleTools = useShortcutCombo('pos.toggleTools');
    const togglePay   = useShortcutCombo('pos.togglePayment');
    const checkout    = useShortcutCombo('pos.checkout');
    const clearCart   = useShortcutCombo('pos.clearCart');
    const qtyPlus     = useShortcutCombo('pos.qtyPlus');
    const qtyMinus    = useShortcutCombo('pos.qtyMinus');

    const shortcuts = useMemo<Shortcut[]>(() => [
        { ...help,        label: 'مساعدة',                    handler: () => setShowHelp(true),                  allowInInputs: true },
        { ...barcode,     label: 'باركود',                    handler: () => barcodeRef.current?.focus(),        allowInInputs: true },
        { ...search,      label: 'بحث',                       handler: () => explorerRef.current?.focusSearch(), allowInInputs: true },
        { ...discount,    label: 'خصم',                       handler: () => cartRef.current?.focusDiscount(),   allowInInputs: true },
        { ...toggleTools, label: 'إخفاء/إظهار أدوات السلة',   handler: () => cartRef.current?.togglePosTools(),  allowInInputs: true },
        { ...togglePay,   label: 'تبديل دفع',                 handler: () => cartRef.current?.togglePayment(),   allowInInputs: true },
        { ...checkout,    label: 'إتمام البيع',               handler: () => cartRef.current?.triggerCheckout(), allowInInputs: true },
        { ...clearCart,   label: 'تفريغ السلة',               handler: () => cartRef.current?.clearCart(),       allowInInputs: true },
        { ...qtyPlus,     label: 'كمية +',                    handler: () => adjustLastItemQty(1) },
        { ...qtyMinus,    label: 'كمية -',                    handler: () => adjustLastItemQty(-1) },
        { key: '?', shift: true, label: 'مساعدة', handler: () => setShowHelp(true) },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [help, barcode, search, discount, toggleTools, togglePay, checkout, clearCart, qtyPlus, qtyMinus]);

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
