import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, TextField, InputAdornment, Grid, Card, CardContent, Typography, Chip, CircularProgress, Tabs, Tab } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { productService, type Product } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { useCartStore } from '../../store/cartStore';
import { useDraggable } from '@dnd-kit/core';
import { useNotification } from '../../contexts/NotificationContext';

// Draggable Product Card
const ProductCard = ({ product }: { product: Product }) => {
    const addItem = useCartStore(state => state.addItem);
    const { showNotification } = useNotification();
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `product-${product.id}`,
        data: product
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const handleAdd = () => {
        const result = addItem(product);
        if (result.success) {
            showNotification(`تم إضافة "${product.name}" إلى السلة`, 'success');
        } else {
            showNotification(result.message || 'حدث خطأ', 'error');
        }
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            sx={{
                height: '100%',
                cursor: 'grab',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                },
                position: 'relative'
            }}
            onClick={handleAdd}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap title={product.name}>
                        {product.name}
                    </Typography>
                    <Chip
                        label={`${product.sale_price} دج`}
                        color="primary"
                        size="small"
                        variant="outlined"
                    />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        المخزون: {product.stock_qty}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {product.category?.name}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default function ProductExplorer() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll
    });

    const { data: products, isLoading } = useQuery({
        queryKey: ['products', searchQuery, selectedCategory],
        queryFn: () => productService.getAll({
            query: searchQuery || undefined,
            category_id: selectedCategory || undefined,
            limit: 50 // Load 50 items for now
        })
    });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Search & Filter */}
            <Box>
                <TextField
                    fullWidth
                    placeholder="بحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                <Tabs
                    value={selectedCategory}
                    onChange={(_, val) => setSelectedCategory(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="الكل" value={null} />
                    {categories?.map(cat => (
                        <Tab key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                </Tabs>
            </Box>

            {/* Product Grid */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {products?.map(product => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                                <ProductCard product={product} />
                            </Grid>
                        ))}
                        {products?.length === 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
                                    لا توجد منتجات مطابقة
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>
        </Box>
    );
}
