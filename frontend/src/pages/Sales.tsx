import { Box, Grid } from '@mui/material';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import ProductExplorer from '../components/Sales/ProductExplorer';
import CartPanel from '../components/Sales/CartPanel';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../services/productService';
import { Card, CardContent, Typography } from '@mui/material';

// Overlay Component for Dragging Visual
const DragItemOverlay = ({ product }: { product: Product | null }) => {
    if (!product) return null;
    return (
        <Card sx={{ width: 200, opacity: 0.8, boxShadow: 10, cursor: 'grabbing' }}>
            <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">{product.name}</Typography>
                <Typography variant="body2">{product.sale_price} دج</Typography>
            </CardContent>
        </Card>
    );
};

import { useNotification } from '../contexts/NotificationContext';

export default function Sales() {
    const addItem = useCartStore(state => state.addItem);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const { showNotification } = useNotification();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
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

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Box sx={{ height: 'calc(100vh - 100px)', p: 2 }} dir="rtl">
                <Grid container spacing={2} sx={{ height: '100%' }}>
                    {/* Product Explorer (Left/Right depending on RTL) */}
                    <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
                        <ProductExplorer />
                    </Grid>

                    {/* Cart Panel */}
                    <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
                        <CartPanel />
                    </Grid>
                </Grid>

                <DragOverlay>
                    <DragItemOverlay product={activeProduct} />
                </DragOverlay>
            </Box>
        </DndContext>
    );
}
