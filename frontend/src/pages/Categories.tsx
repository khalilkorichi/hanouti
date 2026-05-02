import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce';
import {
    Box,
    Typography,
    Chip,
    Tooltip,
    Alert,
    Switch,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Avatar,
    IconButton,
    alpha,
    useTheme,
    Grid,
    InputAdornment,
    Button,
} from '@mui/material';
import {
    DataGrid,
    useGridApiRef,
    type GridColDef,
    type GridRenderCellParams,
    type GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Category as CategoryIcon,
    ShoppingCart as ShoppingCartIcon,
    LocalCafe as LocalCafeIcon,
    Restaurant as RestaurantIcon,
    Checkroom as CheckroomIcon,
    Devices as DevicesIcon,
    LocalGroceryStore as LocalGroceryStoreIcon,
    LocalPharmacy as LocalPharmacyIcon,
    Cake as CakeIcon,
    LocalFlorist as LocalFloristIcon,
    Brush as BrushIcon,
    Build as BuildIcon,
    Toys as ToysIcon,
    SportsSoccer as SportsSoccerIcon,
    Pets as PetsIcon,
    Book as BookIcon,
    LocalLaundryService as LaundryIcon,
    Spa as SpaIcon,
    Kitchen as KitchenIcon,
    Chair as ChairIcon,
    Watch as WatchIcon,
    PhoneAndroid as PhoneIcon,
    Headphones as HeadphonesIcon,
    Camera as CameraIcon,
    DirectionsCar as CarIcon,
    LocalDrink as DrinkIcon,
    Fastfood as FastfoodIcon,
    Icecream as IcecreamIcon,
    FileDownload as ExportIcon,
    ViewModule as CardsViewIcon,
    ViewList as TableViewIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon,
    DragIndicator as DragIcon,
    DeleteSweepOutlined as BulkDeleteIcon,
    CheckCircleOutlined as ActivateIcon,
    HighlightOffOutlined as DeactivateIcon,
    Inventory2 as ProductsIcon,
    PowerSettingsNew as PowerIcon,
    BlockOutlined as BlockIcon,
    CategoryOutlined as TotalIcon,
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';
import {
    categoryService,
    type Category,
    type CategoryCreate,
    type CategoryUpdate,
    type CategoryReorderItem,
} from '../services/categoryService';
import {
    UnifiedModal,
    CustomButton,
    CustomInput,
    CustomIconButton,
    PageHeader,
    SearchInput,
    CustomSelect,
    BulkActionsBar,
    CustomCard,
} from '../components/Common';
import { useNotification } from '../contexts/NotificationContext';

/* ════════════════════════════════════════
   Icon registry — common Material icons
   ════════════════════════════════════════ */
type IconComp = typeof CategoryIcon;
export const CATEGORY_ICONS: Record<string, IconComp> = {
    Category: CategoryIcon,
    ShoppingCart: ShoppingCartIcon,
    LocalCafe: LocalCafeIcon,
    Restaurant: RestaurantIcon,
    Checkroom: CheckroomIcon,
    Devices: DevicesIcon,
    LocalGroceryStore: LocalGroceryStoreIcon,
    LocalPharmacy: LocalPharmacyIcon,
    Cake: CakeIcon,
    LocalFlorist: LocalFloristIcon,
    Brush: BrushIcon,
    Build: BuildIcon,
    Toys: ToysIcon,
    SportsSoccer: SportsSoccerIcon,
    Pets: PetsIcon,
    Book: BookIcon,
    LocalLaundryService: LaundryIcon,
    Spa: SpaIcon,
    Kitchen: KitchenIcon,
    Chair: ChairIcon,
    Watch: WatchIcon,
    PhoneAndroid: PhoneIcon,
    Headphones: HeadphonesIcon,
    Camera: CameraIcon,
    DirectionsCar: CarIcon,
    LocalDrink: DrinkIcon,
    Fastfood: FastfoodIcon,
    Icecream: IcecreamIcon,
};

const ICON_NAMES = Object.keys(CATEGORY_ICONS);

const PRESET_COLORS = [
    '#1976d2', '#1565C0', '#0288D1',
    '#388E3C', '#2E7D32', '#43A047',
    '#F57C00', '#EF6C00', '#FB8C00',
    '#D32F2F', '#C62828', '#E53935',
    '#7B1FA2', '#6A1B9A', '#8E24AA',
    '#5D4037', '#4E342E', '#6D4C41',
    '#455A64', '#37474F', '#546E7A',
    '#00796B', '#00695C', '#00897B',
];

/** Render a Material icon by its registry name, with a graceful fallback. */
export function CategoryIconRender({
    name,
    color,
    size = 22,
}: { name?: string; color?: string; size?: number }) {
    const Comp = (name && CATEGORY_ICONS[name]) || CategoryIcon;
    return <Comp sx={{ fontSize: size, color: color || 'inherit' }} />;
}

/* ════════════════════════════════════════
   KPI Card
   ════════════════════════════════════════ */
function KpiCard({
    label, value, icon, color,
}: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    return (
        <CustomCard
            sx={{
                p: 2.25,
                borderRadius: 3,
                border: `1px solid ${alpha(color, isLight ? 0.18 : 0.32)}`,
                background: isLight
                    ? `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha(color, 0.02)})`
                    : `linear-gradient(135deg, ${alpha(color, 0.18)}, ${alpha(color, 0.07)})`,
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 22px ${alpha(color, 0.18)}`,
                },
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                    sx={{
                        width: 48, height: 48, borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                        color: '#fff',
                        boxShadow: `0 6px 14px ${alpha(color, 0.3)}`,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        {value}
                    </Typography>
                </Box>
            </Stack>
        </CustomCard>
    );
}

/* ════════════════════════════════════════
   Sortable Card (cards view drag & drop)
   ════════════════════════════════════════ */
function SortableCategoryCard({
    category, selected, canReorder, onToggleSelect, onEdit, onDelete, onToggleActive,
}: {
    category: Category;
    selected: boolean;
    canReorder: boolean;
    onToggleSelect: (id: number) => void;
    onEdit: (c: Category) => void;
    onDelete: (c: Category) => void;
    onToggleActive: (c: Category) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: category.id, disabled: !canReorder });
    const theme = useTheme();
    const color = category.color || '#1976d2';

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 5 : 'auto',
    };

    return (
        <Box ref={setNodeRef} style={style}>
            <CustomCard
                sx={{
                    p: 0,
                    borderRadius: 3,
                    overflow: 'hidden',
                    borderTop: `4px solid ${color}`,
                    border: selected ? `2px solid ${theme.palette.primary.main}` : undefined,
                    transition: 'box-shadow 0.18s, transform 0.18s',
                    '&:hover': {
                        boxShadow: `0 10px 24px ${alpha(color, 0.18)}`,
                    },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box
                    sx={{
                        p: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        background: alpha(color, theme.palette.mode === 'light' ? 0.06 : 0.14),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    {/* drag handle */}
                    <Box
                        {...(canReorder ? attributes : {})}
                        {...(canReorder ? listeners : {})}
                        sx={{
                            cursor: canReorder ? 'grab' : 'not-allowed',
                            color: canReorder ? 'text.secondary' : 'text.disabled',
                            display: 'flex',
                            opacity: canReorder ? 1 : 0.4,
                            '&:active': canReorder ? { cursor: 'grabbing' } : undefined,
                        }}
                        title={canReorder
                            ? 'اسحب لإعادة الترتيب'
                            : 'إعادة الترتيب متاحة فقط مع الفرز اليدوي وبدون فلاتر'}
                    >
                        <DragIcon fontSize="small" />
                    </Box>
                    <Switch
                        size="small"
                        checked={selected}
                        onChange={() => onToggleSelect(category.id)}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Chip
                        size="small"
                        label={`#${category.display_order}`}
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                </Box>

                <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar
                            sx={{
                                width: 52, height: 52,
                                background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.75)})`,
                                color: '#fff',
                                boxShadow: `0 6px 14px ${alpha(color, 0.32)}`,
                            }}
                        >
                            <CategoryIconRender name={category.icon} size={26} color="#fff" />
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={800} noWrap>
                                {category.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap
                                sx={{ display: 'block' }}>
                                {category.description || 'بدون وصف'}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            icon={<ProductsIcon sx={{ fontSize: 16 }} />}
                            size="small"
                            label={`${category.product_count ?? 0} منتج`}
                            sx={{ fontWeight: 700 }}
                            color={(category.product_count ?? 0) > 0 ? 'primary' : 'default'}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={category.is_active ? 'نشطة' : 'معطّلة'}
                            color={category.is_active ? 'success' : 'default'}
                            variant={category.is_active ? 'filled' : 'outlined'}
                        />
                    </Stack>
                </Box>

                <Box
                    sx={{
                        px: 1.5, py: 1,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        background: alpha(theme.palette.action.hover, 0.5),
                    }}
                >
                    <Tooltip title={category.is_active ? 'تعطيل' : 'تفعيل'}>
                        <Switch
                            size="small"
                            checked={category.is_active}
                            onChange={() => onToggleActive(category)}
                            color="success"
                        />
                    </Tooltip>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="تعديل">
                        <CustomIconButton variant="info" onClick={() => onEdit(category)}>
                            <EditIcon fontSize="small" />
                        </CustomIconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                        <CustomIconButton variant="error" onClick={() => onDelete(category)}>
                            <DeleteIcon fontSize="small" />
                        </CustomIconButton>
                    </Tooltip>
                </Box>
            </CustomCard>
        </Box>
    );
}

/* ════════════════════════════════════════
   Empty State
   ════════════════════════════════════════ */
function EmptyState({
    isFiltered, onAdd, onReset,
}: { isFiltered: boolean; onAdd: () => void; onReset: () => void }) {
    return (
        <Box sx={{
            py: 8, px: 3, textAlign: 'center',
            border: '1.5px dashed', borderColor: 'divider', borderRadius: 3,
        }}>
            <Avatar sx={{
                width: 80, height: 80, mx: 'auto', mb: 2,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
            }}>
                <CategoryIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={800} gutterBottom>
                {isFiltered ? 'لا توجد نتائج مطابقة' : 'لا توجد فئات بعد'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                {isFiltered
                    ? 'جرّب تعديل البحث أو الفلاتر للعثور على ما تبحث عنه.'
                    : 'ابدأ بتنظيم منتجاتك بإضافة فئة جديدة.'}
            </Typography>
            {isFiltered ? (
                <CustomButton variant="outlined" onClick={onReset}>
                    إعادة تعيين الفلاتر
                </CustomButton>
            ) : (
                <CustomButton variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
                    إضافة فئة جديدة
                </CustomButton>
            )}
        </Box>
    );
}

/* ════════════════════════════════════════
   Categories Page
   ════════════════════════════════════════ */
export default function Categories() {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();
    const theme = useTheme();

    /* ── filters & view ── */
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sort, setSort] = useState<'display_order' | 'name' | 'name_desc' | 'created_at' | 'product_count'>('display_order');
    const [view, setView] = useState<'table' | 'cards'>('table');

    /* ── modal & form ── */
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryCreate>({
        name: '',
        description: '',
        is_active: true,
        color: '#1976d2',
        icon: 'Category',
        display_order: 0,
    });
    const [formNameError, setFormNameError] = useState<string>('');

    /* ── delete confirm ── */
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [bulkConfirm, setBulkConfirm] = useState<null | 'activate' | 'deactivate' | 'delete'>(null);

    /* ── selection (table view) ── */
    const apiRef = useGridApiRef();
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
        type: 'include', ids: new Set(),
    });
    const [gridKey, setGridKey] = useState(0);
    /* Cards-view selection set (mirrors table selection) */
    const [cardsSelection, setCardsSelection] = useState<Set<number>>(new Set());

    /* ── data ── */
    const isActiveParam = statusFilter === 'all' ? undefined : statusFilter === 'active';
    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories', debouncedSearch, isActiveParam, sort],
        queryFn: () => categoryService.getAll({
            q: debouncedSearch || undefined,
            is_active: isActiveParam,
            sort,
        }),
    });

    /* KPIs come from an unfiltered fetch so they reflect the whole dataset */
    const { data: allCategories } = useQuery({
        queryKey: ['categories', 'all-for-kpis'],
        queryFn: () => categoryService.getAll(),
    });

    const kpis = useMemo(() => {
        const list = allCategories || [];
        return {
            total: list.length,
            active: list.filter(c => c.is_active).length,
            inactive: list.filter(c => !c.is_active).length,
            products: list.reduce((sum, c) => sum + (c.product_count || 0), 0),
        };
    }, [allCategories]);

    /* ── selection helpers ── */
    const allAvailableIds = useMemo(() => (categories || []).map(c => c.id), [categories]);

    /**
     * MUI X DataGrid v8 selection model: { type: 'include' | 'exclude', ids: Set }
     * When the header checkbox is toggled, type becomes 'exclude' with an empty Set
     * (meaning "all rows EXCEPT the ones in ids"). We resolve to a concrete id list.
     */
    const selectedIds: number[] = useMemo(() => {
        if (view === 'cards') return Array.from(cardsSelection);
        const ids = rowSelectionModel.ids as Set<number | string>;
        if (rowSelectionModel.type === 'exclude') {
            return allAvailableIds.filter(id => !ids.has(id));
        }
        return Array.from(ids).map(Number);
    }, [rowSelectionModel, cardsSelection, view, allAvailableIds]);

    const isAllSelected = allAvailableIds.length > 0 && selectedIds.length === allAvailableIds.length;

    const handleClearSelection = () => {
        setRowSelectionModel({ type: 'include', ids: new Set() });
        setCardsSelection(new Set());
        setGridKey(k => k + 1);
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            handleClearSelection();
        } else {
            const ids = new Set(allAvailableIds);
            setRowSelectionModel({ type: 'include', ids });
            setCardsSelection(ids);
            setGridKey(k => k + 1);
        }
    };

    const handleToggleCardSelect = (id: number) => {
        setCardsSelection(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /* ── mutations ── */
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['products'] }); // category badges in products
    };

    const createMutation = useMutation({
        mutationFn: categoryService.create,
        onSuccess: () => {
            invalidateAll();
            showNotification('تمت إضافة الفئة بنجاح', 'success');
            handleCloseModal();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'فشل إضافة الفئة';
            if (typeof msg === 'string' && msg.includes('مستخدم')) {
                setFormNameError(msg);
            } else {
                showNotification(msg, 'error');
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) =>
            categoryService.update(id, data),
        onSuccess: () => {
            invalidateAll();
            showNotification('تم تحديث الفئة بنجاح', 'success');
            handleCloseModal();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'فشل تحديث الفئة';
            if (typeof msg === 'string' && msg.includes('مستخدم')) {
                setFormNameError(msg);
            } else {
                showNotification(msg, 'error');
            }
        },
    });

    /* Quick inline updates (status switch, single field) */
    const quickUpdateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) =>
            categoryService.update(id, data),
        onSuccess: () => invalidateAll(),
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'فشل تحديث الفئة';
            showNotification(msg, 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: categoryService.delete,
        onSuccess: () => {
            invalidateAll();
            showNotification('تم حذف الفئة بنجاح', 'success');
            setDeleteTarget(null);
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'فشل حذف الفئة';
            showNotification(msg, 'error');
            setDeleteTarget(null);
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (items: CategoryReorderItem[]) => categoryService.reorder(items),
        onSuccess: () => {
            invalidateAll();
            showNotification('تم حفظ الترتيب الجديد', 'success');
        },
        onError: () => showNotification('فشل حفظ الترتيب', 'error'),
    });

    const bulkMutation = useMutation({
        mutationFn: ({ ids, action }: { ids: number[]; action: 'activate' | 'deactivate' | 'delete' }) =>
            categoryService.bulkAction(ids, action),
        onSuccess: (res, vars) => {
            invalidateAll();
            handleClearSelection();
            setBulkConfirm(null);
            const total = vars.ids.length;
            if (res.failed_count === 0) {
                showNotification(`تم تنفيذ الإجراء على ${res.success_count} فئة`, 'success');
            } else {
                const msg = `${res.success_count} نجحت من أصل ${total}. ${res.failed_count} فشلت`;
                showNotification(msg, 'warning', {
                    title: 'إجراء جزئي',
                });
            }
        },
        onError: () => {
            showNotification('فشل تنفيذ الإجراء الجماعي', 'error');
            setBulkConfirm(null);
        },
    });

    /* ── form handlers ── */
    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                is_active: category.is_active,
                color: category.color || '#1976d2',
                icon: category.icon || 'Category',
                display_order: category.display_order || 0,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '', description: '', is_active: true,
                color: '#1976d2', icon: 'Category', display_order: 0,
            });
        }
        setFormNameError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormNameError('');
    };

    const handleSubmit = () => {
        const trimmedName = formData.name.trim();
        if (!trimmedName) {
            setFormNameError('اسم الفئة مطلوب');
            return;
        }
        const payload = { ...formData, name: trimmedName };
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    /**
     * Manual reordering only makes sense when we are looking at the canonical
     * full list — i.e. sorted by display_order with no search/status filter.
     * Otherwise, drag/up-down would mutate display_order based on a partial
     * or differently-sorted projection and corrupt the global order.
     */
    const canReorder =
        sort === 'display_order' &&
        !debouncedSearch &&
        statusFilter === 'all';

    /* ── reorder handlers ── */
    const moveRow = (id: number, direction: -1 | 1) => {
        if (!canReorder || !categories) return;
        const idx = categories.findIndex(c => c.id === id);
        const targetIdx = idx + direction;
        if (idx === -1 || targetIdx < 0 || targetIdx >= categories.length) return;
        const a = categories[idx];
        const b = categories[targetIdx];
        // Swap display_order of the two visible rows
        reorderMutation.mutate([
            { id: a.id, display_order: b.display_order },
            { id: b.id, display_order: a.display_order },
        ]);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        if (!canReorder) return;
        const { active, over } = event;
        if (!over || active.id === over.id || !categories) return;
        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(categories, oldIndex, newIndex);
        // Reassign display_order from 1..N
        const items: CategoryReorderItem[] = reordered.map((c, i) => ({
            id: c.id,
            display_order: i + 1,
        }));
        // Optimistic update for snappier UX
        queryClient.setQueryData(
            ['categories', debouncedSearch, isActiveParam, sort],
            reordered.map((c, i) => ({ ...c, display_order: i + 1 })),
        );
        reorderMutation.mutate(items);
    };

    /* ── export ── */
    const handleExport = () => {
        const rows = (categories || []).map(c => ({
            'المعرف': c.id,
            'الاسم': c.name,
            'الوصف': c.description || '',
            'الترتيب': c.display_order,
            'عدد المنتجات': c.product_count ?? 0,
            'اللون': c.color || '',
            'الأيقونة': c.icon || '',
            'الحالة': c.is_active ? 'نشطة' : 'معطّلة',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الفئات');
        XLSX.writeFile(wb, `الفئات_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.xlsx`);
        showNotification('تم تصدير الفئات إلى Excel', 'success');
    };

    /* Reset form-name error when user types */
    useEffect(() => { if (formNameError) setFormNameError(''); }, [formData.name]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── DataGrid columns ── */
    const columns: GridColDef[] = [
        {
            field: 'identity',
            headerName: 'الفئة',
            flex: 1,
            minWidth: 240,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => {
                const c = params.row as Category;
                const color = c.color || '#1976d2';
                return (
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ height: '100%' }}>
                        <Avatar
                            sx={{
                                width: 38, height: 38,
                                background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                                color: '#fff',
                                boxShadow: `0 4px 10px ${alpha(color, 0.32)}`,
                            }}
                        >
                            <CategoryIconRender name={c.icon} size={20} color="#fff" />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={700} noWrap>{c.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap
                                sx={{ display: 'block', maxWidth: 280 }}>
                                {c.description || '—'}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        },
        {
            field: 'product_count',
            headerName: 'المنتجات',
            width: 130,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    icon={<ProductsIcon sx={{ fontSize: 14 }} />}
                    label={params.value ?? 0}
                    size="small"
                    color={(params.value ?? 0) > 0 ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                />
            ),
        },
        {
            field: 'is_active',
            headerName: 'الحالة',
            width: 110,
            renderCell: (params: GridRenderCellParams) => (
                <Switch
                    checked={!!params.value}
                    onChange={(e) =>
                        quickUpdateMutation.mutate({
                            id: (params.row as Category).id,
                            data: { is_active: e.target.checked },
                        })
                    }
                    color="success"
                    size="small"
                />
            ),
        },
        {
            field: 'display_order',
            headerName: 'الترتيب',
            width: 140,
            renderCell: (params: GridRenderCellParams) => {
                const id = (params.row as Category).id;
                const reorderTip = canReorder
                    ? ''
                    : 'الترتيب اليدوي معطّل: اختر "الترتيب اليدوي" بدون فلاتر';
                return (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Chip
                            label={`#${params.value}`}
                            size="small"
                            sx={{ fontWeight: 700, minWidth: 44 }}
                        />
                        <Tooltip title={reorderTip}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => moveRow(id, -1)}
                                    disabled={!canReorder || reorderMutation.isPending}
                                >
                                    <ArrowUpIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={reorderTip}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => moveRow(id, 1)}
                                    disabled={!canReorder || reorderMutation.isPending}
                                >
                                    <ArrowDownIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            field: 'actions',
            headerName: 'الإجراءات',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Tooltip title="تعديل">
                        <span>
                            <CustomIconButton
                                variant="info"
                                onClick={() => handleOpenModal(params.row as Category)}
                                sx={{ ml: 0.5 }}
                            >
                                <EditIcon fontSize="small" />
                            </CustomIconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="حذف">
                        <span>
                            <CustomIconButton
                                variant="error"
                                onClick={() => setDeleteTarget(params.row as Category)}
                            >
                                <DeleteIcon fontSize="small" />
                            </CustomIconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    if (error) return <Alert severity="error">حدث خطأ أثناء تحميل البيانات</Alert>;

    const isFiltered = !!debouncedSearch || statusFilter !== 'all';
    const isEmpty = !isLoading && (categories?.length ?? 0) === 0;

    return (
        <Box sx={{ p: 3 }}>
            <PageHeader
                title="الفئات"
                subtitle="نظّم منتجاتك في فئات مرئية مع ألوان وأيقونات وترتيب مخصّص"
                icon={<CategoryIcon />}
                actions={
                    <>
                        <CustomButton
                            variant="outlined"
                            startIcon={<ExportIcon />}
                            onClick={handleExport}
                            disabled={!categories || categories.length === 0}
                        >
                            تصدير
                        </CustomButton>
                        <CustomButton
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenModal()}
                        >
                            إضافة فئة
                        </CustomButton>
                    </>
                }
            />

            {/* ── KPI Cards ── */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard
                        label="إجمالي الفئات"
                        value={kpis.total}
                        icon={<TotalIcon />}
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard
                        label="الفئات النشطة"
                        value={kpis.active}
                        icon={<PowerIcon />}
                        color={theme.palette.success.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard
                        label="غير النشطة"
                        value={kpis.inactive}
                        icon={<BlockIcon />}
                        color={theme.palette.warning.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard
                        label="إجمالي المنتجات المرتبطة"
                        value={kpis.products}
                        icon={<ProductsIcon />}
                        color={theme.palette.info.main}
                    />
                </Grid>
            </Grid>

            {/* ── Toolbar ── */}
            <Box
                sx={{
                    mb: 2, p: 2, borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode === 'light'
                        ? alpha(theme.palette.background.paper, 0.7)
                        : alpha(theme.palette.background.paper, 0.4),
                }}
            >
                <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="بحث بالاسم أو الوصف..."
                            isLoading={isLoading}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                        <CustomSelect
                            label="الحالة"
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            options={[
                                { value: 'all', label: 'الكل' },
                                { value: 'active', label: 'نشطة فقط' },
                                { value: 'inactive', label: 'معطّلة فقط' },
                            ]}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <CustomSelect
                            label="الفرز"
                            size="small"
                            value={sort}
                            onChange={(e) => setSort(e.target.value as typeof sort)}
                            options={[
                                { value: 'display_order', label: 'الترتيب اليدوي' },
                                { value: 'name', label: 'الاسم (أ → ي)' },
                                { value: 'name_desc', label: 'الاسم (ي → أ)' },
                                { value: 'created_at', label: 'الأحدث أولاً' },
                                { value: 'product_count', label: 'الأكثر منتجات' },
                            ]}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ToggleButtonGroup
                            value={view}
                            exclusive
                            onChange={(_, v) => v && setView(v)}
                            size="small"
                            sx={{
                                borderRadius: 2,
                                '& .MuiToggleButton-root': { px: 1.5, borderRadius: 2 },
                            }}
                        >
                            <ToggleButton value="table" title="عرض الجدول">
                                <TableViewIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="cards" title="عرض البطاقات">
                                <CardsViewIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>

            {/* ── Reorder-disabled hint ── */}
            {!canReorder && (
                <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ mb: 2, borderRadius: 2.5, py: 0.5 }}
                >
                    إعادة الترتيب اليدوي معطّلة. اختر <strong>«الترتيب اليدوي»</strong> من قائمة الفرز وأزِل الفلاتر للسحب أو استخدام الأسهم.
                </Alert>
            )}

            {/* ── Bulk Actions Bar ── */}
            <BulkActionsBar
                count={selectedIds.length}
                onClear={handleClearSelection}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                totalAvailable={allAvailableIds.length}
                minCount={1}
            >
                <Button size="small" startIcon={<ActivateIcon />} color="success" variant="outlined"
                    disabled={bulkMutation.isPending} onClick={() => setBulkConfirm('activate')}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تفعيل المحددة
                </Button>
                <Button size="small" startIcon={<DeactivateIcon />} color="warning" variant="outlined"
                    disabled={bulkMutation.isPending} onClick={() => setBulkConfirm('deactivate')}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تعطيل المحددة
                </Button>
                <Button size="small" startIcon={<BulkDeleteIcon />} color="error" variant="outlined"
                    disabled={bulkMutation.isPending} onClick={() => setBulkConfirm('delete')}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    حذف المحددة
                </Button>
            </BulkActionsBar>

            {/* ── Content (table / cards / empty) ── */}
            {isEmpty ? (
                <EmptyState
                    isFiltered={isFiltered}
                    onAdd={() => handleOpenModal()}
                    onReset={() => { setSearchQuery(''); setStatusFilter('all'); }}
                />
            ) : view === 'table' ? (
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        key={gridKey}
                        apiRef={apiRef}
                        rows={categories || []}
                        columns={columns}
                        loading={isLoading}
                        getRowId={(row) => row.id}
                        checkboxSelection
                        disableRowSelectionOnClick
                        onRowSelectionModelChange={(model) => setRowSelectionModel(model)}
                        rowSelectionModel={rowSelectionModel}
                        pageSizeOptions={[10, 25, 50, 100]}
                        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
                        sx={{
                            borderRadius: 3, boxShadow: 2, bgcolor: 'background.paper',
                            '& .MuiDataGrid-cell:focus': { outline: 'none' },
                            '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
                            '& .MuiDataGrid-row.Mui-selected': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.07),
                            },
                        }}
                    />
                </Box>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={(categories || []).map(c => c.id)}
                        strategy={rectSortingStrategy}
                    >
                        <Grid container spacing={2}>
                            {(categories || []).map(c => (
                                <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                    <SortableCategoryCard
                                        category={c}
                                        selected={cardsSelection.has(c.id)}
                                        canReorder={canReorder}
                                        onToggleSelect={handleToggleCardSelect}
                                        onEdit={handleOpenModal}
                                        onDelete={(cat) => setDeleteTarget(cat)}
                                        onToggleActive={(cat) =>
                                            quickUpdateMutation.mutate({
                                                id: cat.id,
                                                data: { is_active: !cat.is_active },
                                            })
                                        }
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </SortableContext>
                </DndContext>
            )}

            {/* ════════════════ Add / Edit modal ════════════════ */}
            <UnifiedModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                maxWidth="md"
                actions={
                    <>
                        <CustomButton onClick={handleCloseModal} color="inherit">إلغاء</CustomButton>
                        <CustomButton
                            onClick={handleSubmit}
                            variant="contained"
                            loading={createMutation.isPending || updateMutation.isPending}
                            disabled={!formData.name.trim()}
                        >
                            حفظ
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2.25} sx={{ py: 0.5 }}>
                    {/* live preview */}
                    <Box
                        sx={{
                            p: 1.75, borderRadius: 2.5,
                            border: `1px dashed ${theme.palette.divider}`,
                            background: alpha(formData.color || '#1976d2', 0.05),
                            display: 'flex', alignItems: 'center', gap: 1.5,
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 56, height: 56,
                                background: `linear-gradient(135deg, ${formData.color}, ${alpha(formData.color || '#1976d2', 0.7)})`,
                                color: '#fff',
                                boxShadow: `0 6px 14px ${alpha(formData.color || '#1976d2', 0.32)}`,
                            }}
                        >
                            <CategoryIconRender name={formData.icon} size={28} color="#fff" />
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">معاينة</Typography>
                            <Typography fontWeight={800} noWrap>
                                {formData.name.trim() || 'اسم الفئة'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap
                                sx={{ display: 'block' }}>
                                {formData.description || 'وصف اختياري للفئة'}
                            </Typography>
                        </Box>
                        <Chip
                            size="small"
                            label={formData.is_active ? 'نشطة' : 'معطّلة'}
                            color={formData.is_active ? 'success' : 'default'}
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <CustomInput
                                label="اسم الفئة"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                fullWidth
                                required
                                error={!!formNameError}
                                helperText={formNameError || ' '}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <CustomInput
                                label="ترتيب العرض"
                                type="number"
                                value={formData.display_order ?? 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        display_order: parseInt(e.target.value || '0', 10),
                                    })
                                }
                                fullWidth
                                helperText="القيمة الأصغر تظهر أولاً"
                            />
                        </Grid>
                    </Grid>

                    <CustomInput
                        label="الوصف"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        fullWidth multiline rows={2}
                    />

                    {/* Status */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.25, px: 2, borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                    }}>
                        <Box>
                            <Typography fontWeight={700}>الحالة</Typography>
                            <Typography variant="caption" color="text.secondary">
                                الفئات المعطّلة لا تظهر في قوائم المنتجات الجديدة
                            </Typography>
                        </Box>
                        <Switch
                            checked={!!formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            color="success"
                        />
                    </Box>

                    {/* Color picker */}
                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1 }}>اللون</Typography>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.25 }}>
                            <Box
                                component="input"
                                type="color"
                                value={formData.color || '#1976d2'}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                sx={{
                                    width: 56, height: 40, border: 'none',
                                    borderRadius: 2, cursor: 'pointer',
                                    background: 'transparent',
                                }}
                            />
                            <CustomInput
                                size="small"
                                value={formData.color || ''}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">#</InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{ flex: 1, maxWidth: 200 }}
                                placeholder="1976d2"
                            />
                        </Stack>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            {PRESET_COLORS.map(col => (
                                <Box
                                    key={col}
                                    onClick={() => setFormData({ ...formData, color: col })}
                                    sx={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        bgcolor: col, cursor: 'pointer',
                                        border: formData.color === col
                                            ? `3px solid ${theme.palette.text.primary}`
                                            : `2px solid ${alpha(col, 0.3)}`,
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        '&:hover': {
                                            transform: 'scale(1.12)',
                                            boxShadow: `0 4px 10px ${alpha(col, 0.5)}`,
                                        },
                                    }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Icon picker */}
                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1 }}>الأيقونة</Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
                                gap: 1,
                                p: 1.25,
                                borderRadius: 2,
                                border: `1px solid ${theme.palette.divider}`,
                                maxHeight: 200, overflow: 'auto',
                            }}
                        >
                            {ICON_NAMES.map(name => {
                                const isActive = formData.icon === name;
                                return (
                                    <Box
                                        key={name}
                                        onClick={() => setFormData({ ...formData, icon: name })}
                                        title={name}
                                        sx={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '100%', aspectRatio: '1 / 1',
                                            borderRadius: 1.5, cursor: 'pointer',
                                            border: `1.5px solid ${isActive ? formData.color || '#1976d2' : 'transparent'}`,
                                            background: isActive
                                                ? alpha(formData.color || '#1976d2', 0.15)
                                                : alpha(theme.palette.action.hover, 0.5),
                                            transition: 'all 0.15s',
                                            '&:hover': {
                                                background: alpha(formData.color || '#1976d2', 0.1),
                                                transform: 'scale(1.07)',
                                            },
                                        }}
                                    >
                                        <CategoryIconRender
                                            name={name}
                                            size={20}
                                            color={isActive ? formData.color || '#1976d2' : undefined}
                                        />
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Stack>
            </UnifiedModal>

            {/* ════════════════ Delete confirm ════════════════ */}
            <UnifiedModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="تأكيد الحذف"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton onClick={() => setDeleteTarget(null)} color="inherit">
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            color="error"
                            variant="contained"
                            loading={deleteMutation.isPending}
                            disabled={(deleteTarget?.product_count ?? 0) > 0}
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                        >
                            حذف
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={1.5}>
                    <Typography>
                        هل أنت متأكد من حذف الفئة{' '}
                        <strong>{deleteTarget?.name}</strong>؟
                    </Typography>
                    {(deleteTarget?.product_count ?? 0) > 0 && (
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                            هذه الفئة مرتبطة بـ {deleteTarget?.product_count} منتج. لن يتم حذفها حتى تنقل المنتجات إلى فئة أخرى.
                        </Alert>
                    )}
                </Stack>
            </UnifiedModal>

            {/* ════════════════ Bulk action confirm ════════════════ */}
            <UnifiedModal
                open={!!bulkConfirm}
                onClose={() => setBulkConfirm(null)}
                title={
                    bulkConfirm === 'delete' ? 'تأكيد حذف جماعي'
                        : bulkConfirm === 'activate' ? 'تأكيد تفعيل جماعي'
                            : bulkConfirm === 'deactivate' ? 'تأكيد تعطيل جماعي'
                                : 'تأكيد'
                }
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton onClick={() => setBulkConfirm(null)} color="inherit">
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            color={bulkConfirm === 'delete' ? 'error' : 'primary'}
                            variant="contained"
                            loading={bulkMutation.isPending}
                            onClick={() =>
                                bulkConfirm &&
                                bulkMutation.mutate({ ids: selectedIds, action: bulkConfirm })
                            }
                        >
                            تنفيذ
                        </CustomButton>
                    </>
                }
            >
                <Typography>
                    سيتم تنفيذ الإجراء على <strong>{selectedIds.length}</strong> فئة محدّدة.
                    {bulkConfirm === 'delete' && ' الفئات المرتبطة بمنتجات سيتم تخطّيها.'}
                </Typography>
            </UnifiedModal>
        </Box>
    );
}
