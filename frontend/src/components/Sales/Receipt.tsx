import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { Sale } from '../../services/salesService';

interface ReceiptProps {
    sale: Sale;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ sale }, ref) => {
    return (
        <Box ref={ref} sx={{ p: 4, direction: 'rtl', fontFamily: 'Arial' }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">متجر حانوتي</Typography>
                <Typography>رقم الفاتورة: {sale.invoice_no}</Typography>
                <Typography>التاريخ: {new Date(sale.created_at).toLocaleString('ar-DZ')}</Typography>
            </Box>

            <TableContainer sx={{ mb: 4 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="right">المنتج</TableCell>
                            <TableCell align="center">الكمية</TableCell>
                            <TableCell align="right">السعر</TableCell>
                            <TableCell align="right">الإجمالي</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sale.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell align="right">{item.product?.name || 'منتج'}</TableCell>
                                <TableCell align="center">{item.qty}</TableCell>
                                <TableCell align="right">{(item.unit_price || 0).toFixed(2)} دج</TableCell>
                                <TableCell align="right">{(item.line_total || 0).toFixed(2)} دج</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>المجموع الفرعي:</Typography>
                <Typography>{sale.subtotal} دج</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>الضريبة:</Typography>
                <Typography>{sale.tax_value || 0} دج</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">الإجمالي:</Typography>
                <Typography variant="h6" fontWeight="bold">{sale.total} دج</Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="body2">شكرًا لزيارتكم!</Typography>
            </Box>
        </Box>
    );
});
