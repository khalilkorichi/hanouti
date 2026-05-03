import { useRef } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { UnifiedModal, CustomButton } from '../Common';
import BarcodeLabel from './BarcodeLabel';
import type { Product } from '../../services/productService';

interface Props {
    open: boolean;
    onClose: () => void;
    product: Product | null;
}

export default function BarcodePreviewDialog({ open, onClose, product }: Props) {
    const theme = useTheme();
    const labelRef = useRef<HTMLDivElement | null>(null);
    const handlePrint = useReactToPrint({
        contentRef: labelRef,
        documentTitle: product ? `barcode_${product.name}` : 'barcode',
        pageStyle: `
            @page { size: 60mm 35mm; margin: 4mm; }
            @media print {
                body { margin: 0; }
            }
        `,
    });

    if (!product) return null;

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="باركود المنتج"
            maxWidth="xs"
            actions={
                <>
                    <CustomButton onClick={onClose} color="inherit">إغلاق</CustomButton>
                    <CustomButton
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrint()}
                        disabled={!product.barcode}
                    >
                        طباعة
                    </CustomButton>
                </>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {!product.barcode && (
                    <Typography variant="body2" color="error.main" sx={{ textAlign: 'center' }}>
                        هذا المنتج لا يحتوي على باركود. افتح "تعديل" واستخدم زر "توليد".
                    </Typography>
                )}

                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                        background: '#fff',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Box ref={labelRef} sx={{ width: 240 }}>
                        <BarcodeLabel product={product} large />
                    </Box>
                </Box>

                {product.barcode && (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                        لطباعة عدة منتجات دفعة واحدة، حدد الصفوف من الجدول واستخدم "طباعة الباركود".
                    </Typography>
                )}
            </Box>
        </UnifiedModal>
    );
}
