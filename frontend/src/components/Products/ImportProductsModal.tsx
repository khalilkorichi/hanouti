import React, { useState, useRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { UnifiedModal, CustomButton } from '../Common';
import { productService, type ProductCreate } from '../../services/productService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ImportProductsModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ImportProductsModal({ open, onClose }: ImportProductsModalProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewData, setPreviewData] = useState<ProductCreate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ created_count: number; errors: { name: string; error: string }[] } | null>(null);

    const importMutation = useMutation({
        mutationFn: productService.createBulk,
        onSuccess: (data) => {
            setImportResult(data);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products-count'] });
            if (data.errors.length === 0) {
                setTimeout(() => {
                    handleClose();
                }, 2000);
            }
        },
        onError: () => {
            setError('حدث خطأ أثناء الاستيراد');
        }
    });

    const handleClose = () => {
        setPreviewData([]);
        setError(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map data to ProductCreate
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedData: ProductCreate[] = data.map((row: any) => ({
                    name: String(row['Name'] || row['name'] || row['الاسم']),
                    sku: row['SKU'] || row['sku'] ? String(row['SKU'] || row['sku']) : undefined,
                    barcode: row['Barcode'] || row['barcode'] || row['الباركود'] ? String(row['Barcode'] || row['barcode'] || row['الباركود']) : undefined,
                    purchase_price: Number(row['Purchase Price'] || row['purchase_price'] || row['سعر الشراء'] || 0),
                    sale_price: Number(row['Sale Price'] || row['sale_price'] || row['سعر البيع'] || 0),
                    stock_qty: Number(row['Stock'] || row['stock_qty'] || row['الكمية'] || 0),
                    min_qty: Number(row['Min Qty'] || row['min_qty'] || row['حد الطلب'] || 5),
                    unit: String(row['Unit'] || row['unit'] || row['الوحدة'] || 'piece'),
                    category_id: row['Category ID'] || row['category_id'] ? Number(row['Category ID'] || row['category_id']) : undefined,
                    is_active: true
                })).filter((p: ProductCreate) => p.name); // Filter out empty rows

                if (mappedData.length === 0) {
                    setError('لم يتم العثور على بيانات صالحة في الملف');
                    return;
                }

                setPreviewData(mappedData);
                setError(null);
                setImportResult(null);
            } catch (err) {
                console.error(err);
                setError('فشل في قراءة الملف. تأكد من صيغة Excel صحيحة.');
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <UnifiedModal
            open={open}
            onClose={handleClose}
            title="استيراد المنتجات"
            maxWidth="lg"
            actions={
                <>
                    <CustomButton onClick={handleClose} color="inherit">إلغاء</CustomButton>
                    <CustomButton
                        onClick={() => importMutation.mutate(previewData)}
                        variant="contained"
                        disabled={previewData.length === 0 || importMutation.isPending || !!importResult}
                        loading={importMutation.isPending}
                    >
                        استيراد ({previewData.length})
                    </CustomButton>
                </>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {!previewData.length && !importResult && (
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                        />
                        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6">اضغط لرفع ملف Excel</Typography>
                        <Typography variant="body2" color="text.secondary">
                            الأعمدة المتوقعة: Name, SKU, Barcode, Purchase Price, Sale Price, Stock, Unit
                        </Typography>
                    </Box>
                )}

                {error && <Alert severity="error">{error}</Alert>}

                {importResult && (
                    <Alert severity={importResult.errors.length > 0 ? "warning" : "success"}>
                        تم استيراد {importResult.created_count} منتج بنجاح.
                        {importResult.errors.length > 0 && (
                            <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                                {importResult.errors.map((err, idx) => (
                                    <li key={idx}>{err.name}: {err.error}</li>
                                ))}
                            </Box>
                        )}
                    </Alert>
                )}

                {previewData.length > 0 && !importResult && (
                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>الاسم</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell>الباركود</TableCell>
                                    <TableCell>سعر الشراء</TableCell>
                                    <TableCell>سعر البيع</TableCell>
                                    <TableCell>الكمية</TableCell>
                                    <TableCell>الوحدة</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {previewData.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.sku}</TableCell>
                                        <TableCell>{row.barcode}</TableCell>
                                        <TableCell>{row.purchase_price}</TableCell>
                                        <TableCell>{row.sale_price}</TableCell>
                                        <TableCell>{row.stock_qty}</TableCell>
                                        <TableCell>{row.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </UnifiedModal>
    );
}
