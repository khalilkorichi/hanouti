import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';

interface Category {
    id?: number;
    name: string;
    color?: string;
}

interface CategoryDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (category: Category) => void;
    category?: Category;
}

export default function CategoryDialog({ open, onClose, onSave, category }: CategoryDialogProps) {
    const [name, setName] = useState(() => category?.name || '');
    const [color, setColor] = useState(() => category?.color || '#000000');

    const handleSubmit = () => {
        onSave({
            id: category?.id,
            name,
            color
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {category ? 'تعديل فئة' : 'إضافة فئة جديدة'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="اسم الفئة"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        autoFocus
                    />
                    <TextField
                        label="لون الفئة"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        fullWidth
                        sx={{ input: { height: 50 } }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!name}>
                    حفظ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
