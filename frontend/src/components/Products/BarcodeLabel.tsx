import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import JsBarcode from 'jsbarcode';
import { pickBarcodeFormat } from '../../utils/barcode';
import type { Product } from '../../services/productService';

interface Props {
    product: Product;
    /** When true, render a wider/taller barcode for the single-product preview dialog. */
    large?: boolean;
}

/**
 * Single barcode label: name (top), price (right), barcode SVG, code text.
 * Same component is used in the dialog preview AND the bulk print sheet so
 * what you preview is exactly what prints.
 */
export default function BarcodeLabel({ product, large = false }: Props) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const code = product.barcode || '';

    useEffect(() => {
        if (!svgRef.current || !code) return;
        try {
            JsBarcode(svgRef.current, code, {
                format: pickBarcodeFormat(code),
                width: large ? 2.4 : 1.6,
                height: large ? 80 : 48,
                displayValue: true,
                fontSize: large ? 18 : 12,
                margin: 0,
                background: '#ffffff',
                lineColor: '#000000',
            });
        } catch {
            // JsBarcode throws on invalid input — fall back to plain text below.
        }
    }, [code, large]);

    return (
        <Box
            className="barcode-label"
            sx={{
                width: '100%',
                bgcolor: '#fff',
                color: '#000',
                px: large ? 1.5 : 0.75,
                py: large ? 1 : 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25,
                textAlign: 'center',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 700,
                    fontSize: large ? 14 : 10,
                    lineHeight: 1.2,
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#000',
                }}
                title={product.name}
            >
                {product.name}
            </Typography>
            {code ? (
                <svg ref={svgRef} style={{ maxWidth: '100%' }} />
            ) : (
                <Typography variant="caption" sx={{ color: '#999' }}>
                    لا يوجد باركود
                </Typography>
            )}
            <Typography
                sx={{
                    fontWeight: 800,
                    fontSize: large ? 16 : 11,
                    color: '#000',
                }}
            >
                {product.sale_price} دج
            </Typography>
        </Box>
    );
}
