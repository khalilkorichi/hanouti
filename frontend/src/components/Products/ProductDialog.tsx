import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, MenuItem } from '@mui/material';

interface Product {
    id?: number;
    name: string;
    barcode: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    category_id: number;
}

interface Category {
    id: number;
    name: string;
}

interface ProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (product: Product) => void;
    product?: Product;
}

export default function ProductDialog({ open, onClose, onSave, product }: ProductDialogProps) {
    // Initialize form data from product prop
    const [formData, setFormData] = useState<Product>(() => {
        if (product) {
            return product;
        }
        return {
            name: '',
            barcode: '',
            price: 0,
            cost_price: 0,
            stock_quantity: 0,
            category_id: 0
        };
    });
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:8000/categories/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        if (open) {
            fetchCategories();
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'name' || name === 'barcode' ? value : Number(value)
        }));
    };

    const handleSubmit = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="اسم المنتج"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="الباركود"
                            name="barcode"
                            value={formData.barcode}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="سعر البيع (دج)"
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="سعر التكلفة (دج)"
                            name="cost_price"
                            type="number"
                            value={formData.cost_price}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="الكمية"
                            name="stock_quantity"
                            type="number"
                            value={formData.stock_quantity}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            select
                            label="الفئة"
                            name="category_id"
                            value={formData.category_id || ''}
                            onChange={handleChange}
                            fullWidth
                            required
                        >
                            {categories.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || !formData.barcode}>
                    حفظ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
