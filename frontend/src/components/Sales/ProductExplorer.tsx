import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    CircularProgress,
    Tabs,
    Tab,
    Pagination,
    LinearProgress,
    Stack,
    useTheme,
} from '@mui/material';
import { productService, type Product } from '../../services/productService';
import { categoryService, type Category } from '../../services/categoryService';
import { useCartStore } from '../../store/cartStore';
import { useDraggable } from '@dnd-kit/core';
import { useNotification } from '../../contexts/NotificationContext';
import { SearchInput } from '../Common';

const PAGE_SIZE = 24;

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

export interface ProductExplorerHandle {
    focusSearch: () => void;
    clearSearch: () => void;
}

type ProductExplorerProps = Record<string, never>;

const ProductExplorer = forwardRef<ProductExplorerHandle, ProductExplorerProps>((_props, ref) => {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focusSearch: () => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        },
        clearSearch: () => setSearchQuery(''),
    }), []);

    // Reset to first page whenever the active search term or category changes
    // (debouncedSearch lags the input, so this also waits the debounce window).
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedCategory]);

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll()
    });

    const filterParams = {
        query: debouncedSearch || undefined,
        category_id: selectedCategory || undefined,
    };

    const { data: totalCount = 0, isLoading: isCountLoading } = useQuery({
        queryKey: ['products-count', debouncedSearch, selectedCategory],
        queryFn: () => productService.getCount(filterParams),
        placeholderData: keepPreviousData,
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    // Guard against page > totalPages (e.g. after a filter that shrinks results).
    const safePage = Math.min(page, totalPages);

    const { data: products, isLoading, isFetching } = useQuery({
        queryKey: ['products', debouncedSearch, selectedCategory, safePage],
        queryFn: () => productService.getAll({
            ...filterParams,
            skip: (safePage - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
        }),
        placeholderData: keepPreviousData,
    });

    // If the safe page diverged from the requested page, snap state into sync
    // so the Pagination control reflects reality.
    useEffect(() => {
        if (safePage !== page) setPage(safePage);
    }, [safePage, page]);

    const showInitialSpinner = (isLoading || isCountLoading) && !products;
    const showOverlayLoader = isFetching && !!products; // subtle loader for page changes

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Search & Filter */}
            <Box>
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="بحث عن منتج للإضافة للسلة... (F2)"
                    isLoading={isLoading}
                    sx={{ mb: 2 }}
                    inputRef={searchInputRef}
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
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1, position: 'relative' }}>
                {/* Subtle top progress bar while a new page is loading,
                    so the grid stays visible (no flash). */}
                {showOverlayLoader && (
                    <LinearProgress
                        sx={{
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 2,
                            mb: 1,
                            borderRadius: 1,
                            height: 3,
                        }}
                    />
                )}

                {showInitialSpinner ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2} sx={{ opacity: showOverlayLoader ? 0.7 : 1, transition: 'opacity 150ms' }}>
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

            {/* Pagination bar — hidden when there is nothing to paginate */}
            {totalCount > PAGE_SIZE && (
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        px: 1,
                        py: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                        flexWrap: 'wrap',
                        gap: 1,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        صفحة {safePage} من {totalPages} • {totalCount} منتج
                    </Typography>
                    <Pagination
                        // MUI Pagination is direction-agnostic: parent dir="rtl"
                        // (set on <html> in index.html) automatically mirrors the
                        // first/last/prev/next chevrons. We just render normally.
                        dir={theme.direction}
                        count={totalPages}
                        page={safePage}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        size="small"
                        showFirstButton
                        showLastButton
                        siblingCount={1}
                        boundaryCount={1}
                        disabled={isFetching}
                    />
                </Stack>
            )}
        </Box>
    );
});

ProductExplorer.displayName = 'ProductExplorer';

export default ProductExplorer;
