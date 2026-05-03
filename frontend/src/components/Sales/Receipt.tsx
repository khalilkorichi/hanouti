import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { Sale } from '../../services/salesService';
import { useFormatters } from '../../utils/format';

interface ReceiptProps {
    sale: Sale;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ sale }, ref) => {
    const fmt = useFormatters();
    return (
        <Box ref={ref} sx={{ p: 4, direction: 'rtl', fontFamily: 'Arial' }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">متجر حانوتي</Typography>
                <Typography>رقم الفاتورة: {sale.invoice_no}</Typography>
                <Typography>التاريخ: {fmt.date(sale.created_at, { withTime: true })}</Typography>
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
                                <TableCell align="right">{fmt.money(item.unit_price)}</TableCell>
                                <TableCell align="right">{fmt.money(item.line_total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>المجموع الفرعي:</Typography>
                <Typography>{fmt.money(sale.subtotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>الضريبة:</Typography>
                <Typography>{fmt.money(sale.tax_value || 0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">الإجمالي:</Typography>
                <Typography variant="h6" fontWeight="bold">{fmt.money(sale.total)}</Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="body2">شكرًا لزيارتكم!</Typography>
            </Box>
        </Box>
    );
});
