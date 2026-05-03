import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, ToggleButtonGroup, ToggleButton, Stack, Alert,
} from '@mui/material';
import {
    Print as PrintIcon,
    ArrowBackIosNewRounded as BackIcon,
    GridOn as GridIcon,
    ViewStream as RowIcon,
} from '@mui/icons-material';
import { CustomButton } from '../components/Common';
import BarcodeLabel from '../components/Products/BarcodeLabel';
import type { Product } from '../services/productService';

type Layout = 'avery30' | 'continuous';

interface LocationState {
    products?: Product[];
}

export default function BarcodePrintSheet() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = (location.state || {}) as LocationState;
    const products = state.products || [];

    const [layout, setLayout] = useState<Layout>('avery30');

    useEffect(() => {
        document.body.classList.add('print-barcode-mode');
        return () => document.body.classList.remove('print-barcode-mode');
    }, []);

    const printable = products.filter((p) => !!p.barcode);
    const skipped = products.length - printable.length;

    if (products.length === 0) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    لم يتم تحديد أي منتجات للطباعة. عُد إلى صفحة المنتجات وحدد المنتجات أولاً.
                </Alert>
                <CustomButton variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/products')}>
                    العودة للمنتجات
                </CustomButton>
            </Box>
        );
    }

    return (
        <Box>
            <Paper
                className="print-toolbar"
                elevation={0}
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    p: 2,
                    mb: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <CustomButton variant="text" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                    رجوع
                </CustomButton>

                <Typography variant="h6" fontWeight={700}>
                    معاينة طباعة الباركود
                </Typography>

                <Box sx={{ flex: 1 }} />

                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={layout}
                    onChange={(_e, v) => v && setLayout(v)}
                >
                    <ToggleButton value="avery30">
                        <GridIcon sx={{ mr: 0.5 }} fontSize="small" /> 30 ملصق/صفحة
                    </ToggleButton>
                    <ToggleButton value="continuous">
                        <RowIcon sx={{ mr: 0.5 }} fontSize="small" /> ملصق/سطر
                    </ToggleButton>
                </ToggleButtonGroup>

                <CustomButton
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={() => window.print()}
                    disabled={printable.length === 0}
                >
                    طباعة ({printable.length})
                </CustomButton>
            </Paper>

            {skipped > 0 && (
                <Alert severity="info" className="print-toolbar" sx={{ mx: 2, mb: 2 }}>
                    تم تجاهل {skipped} منتج بدون باركود — أضف باركود أولاً من شاشة التعديل.
                </Alert>
            )}

            <Box className="print-area" sx={{ p: 2, bgcolor: '#fff' }}>
                {layout === 'avery30' ? (
                    <Box
                        className="avery-grid"
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 63.5mm)',
                            gridAutoRows: '25.4mm',
                            columnGap: '3.18mm',
                            rowGap: 0,
                            width: '194mm',
                            mx: 'auto',
                        }}
                    >
                        {printable.map((p, i) => (
                            <Box
                                key={`${p.id}-${i}`}
                                sx={{
                                    border: '1px dashed #ddd',
                                    p: '1mm',
                                    width: '63.5mm',
                                    height: '25.4mm',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    boxSizing: 'border-box',
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                }}
                            >
                                <BarcodeLabel product={p} />
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Stack spacing={1} sx={{ maxWidth: '180mm', mx: 'auto' }}>
                        {printable.map((p, i) => (
                            <Box
                                key={`${p.id}-${i}`}
                                sx={{
                                    border: '1px solid #ddd',
                                    borderRadius: 1,
                                    p: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <Box sx={{ width: 240 }}>
                                    <BarcodeLabel product={p} large />
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Box>

            <style>{`
                @media print {
                    @page { size: A4; margin: 8mm; }
                    html, body { background: #fff !important; }
                    body.print-barcode-mode .print-toolbar,
                    body.print-barcode-mode aside,
                    body.print-barcode-mode header,
                    body.print-barcode-mode nav,
                    body.print-barcode-mode .MuiDrawer-root,
                    body.print-barcode-mode .MuiAppBar-root,
                    body.print-barcode-mode .MuiToolbar-root { display: none !important; }
                    body.print-barcode-mode main,
                    body.print-barcode-mode .MuiContainer-root {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: none !important;
                    }
                    body.print-barcode-mode .print-area,
                    body.print-barcode-mode .avery-grid { margin: 0 !important; padding: 0 !important; }
                }
            `}</style>
        </Box>
    );
}
